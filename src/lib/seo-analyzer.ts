// SEO分析ロジック: メトリクスからAI改善提案を生成

import type { Article, SeoMetric } from "@/lib/db/schema";

export interface SeoAnalysisInput {
  article: Article;
  metrics: SeoMetric[];
}

export interface SeoIssue {
  articleId: string;
  type: "title" | "description" | "content" | "internal_link";
  currentValue: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

/**
 * メトリクスから改善が必要な記事を検出
 */
export function detectIssues(inputs: SeoAnalysisInput[]): SeoIssue[] {
  const issues: SeoIssue[] = [];

  for (const { article, metrics } of inputs) {
    if (metrics.length === 0) continue;

    // 直近7日分の合計を計算
    const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
    const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
    const avgCtr =
      totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgPosition =
      metrics.reduce((sum, m) => sum + parseFloat(m.position), 0) /
      metrics.length;

    // パターン1: 高表示・低CTR（表示されてるのにクリックされない）
    if (totalImpressions >= 50 && avgCtr < 0.02) {
      issues.push({
        articleId: article.id,
        type: "title",
        currentValue: article.title,
        reason: `${totalImpressions}回表示されてCTRが${(avgCtr * 100).toFixed(1)}%と低い。タイトルやメタディスクリプションの改善でクリック率向上が見込める`,
        priority: "high",
      });
    }

    // パターン2: 掲載順位が惜しい（11-20位 = 2ページ目）
    if (avgPosition >= 11 && avgPosition <= 20 && totalImpressions >= 20) {
      issues.push({
        articleId: article.id,
        type: "content",
        currentValue: `平均掲載順位: ${avgPosition.toFixed(1)}位`,
        reason: `掲載順位が${avgPosition.toFixed(1)}位（2ページ目）。コンテンツ拡充で1ページ目への浮上が見込める`,
        priority: "medium",
      });
    }

    // パターン3: 表示ゼロの公開済み記事（デッドコンテンツ）
    if (
      totalImpressions === 0 &&
      article.status === "PUBLISHED" &&
      article.publishedAt
    ) {
      const publishedDaysAgo =
        (Date.now() - new Date(article.publishedAt).getTime()) /
        (1000 * 60 * 60 * 24);

      if (publishedDaysAgo >= 14) {
        issues.push({
          articleId: article.id,
          type: "title",
          currentValue: article.title,
          reason: `公開から${Math.floor(publishedDaysAgo)}日経過しているが検索表示がゼロ。タイトルとコンテンツの全面見直しが必要`,
          priority: "low",
        });
      }
    }
  }

  // 優先度順にソート
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return issues;
}

/**
 * Gemini APIでSEO改善案を生成するプロンプトを構築
 */
export function buildImprovementPrompt(issue: SeoIssue, article: Article): string {
  const targetType = issue.type === "title" ? "タイトル" : issue.type === "description" ? "メタディスクリプション" : "コンテンツ";

  const persona = `あなたは「テック系メディアの敏腕編集長」です。
10年間、エンジニア向けメディアで記事タイトルとコンテンツを磨き続けてきました。
特にAI開発ツール・Claude Code領域に精通しており、読者が何を求めているかを熟知しています。

## あなたの信条
- エンジニアは煽りタイトルを嫌う。信頼感と具体性で勝負する
- 「この記事を読めば何が得られるか」が一瞬でわかる表現が最強
- 数字・具体性・ベネフィットの3要素を組み合わせる
- 技術者のプライドを尊重し、上から目線や初心者蔑視は絶対にしない

## 読者像
- Claude Code / AI開発ツールを日常的に使う日本語圏のエンジニア
- 技術記事を毎日読み、実務で使える情報を求めている
- 時間がなく、タイトルを見て0.5秒で読むかどうかを判断する
- 誇張や釣りには敏感で、信頼できるソースを好む`;

  const basePrompt = `${persona}

## タスク
以下の記事の${targetType}を改善してください。

## 現在の記事情報
- タイトル: ${article.title}
- AI要約: ${article.aiSummary ?? "なし"}
- カテゴリ: ${article.contentType ?? "不明"}
- 難易度: ${article.difficulty ?? "不明"}

## 改善が必要な理由
${issue.reason}

## 出力フォーマット（JSON）
{
  "suggestedValue": "改善後の${targetType}",
  "reason": "この改善で期待される効果の説明（1-2文）"
}

JSONのみを出力し、それ以外のテキストは含めないでください。`;

  if (issue.type === "title") {
    return `${basePrompt}

## タイトル改善テクニック
- 32文字以内を推奨（Google検索結果で切れないように）
- 検索意図に合致するキーワードを自然に含める
- 括弧で補足情報を追加して視認性を上げる: 【実践】【2026年版】【比較】
- 体言止めで切れ味を出す:「〜する方法」より「〜の全手順」
- 数字で具体性を出す:「効率化」より「開発速度3倍」
- ベネフィットを明示:「新機能紹介」より「新機能で○○が不要に」

## 禁止事項
- 釣りタイトル・誇大表現（「衝撃」「ヤバい」「絶対」等）
- 元の記事内容と乖離するタイトル
- キーワードの不自然な詰め込み
- 疑問形の多用（1記事に1つまで）`;
  }

  if (issue.type === "content") {
    return `${basePrompt}

## コンテンツ改善の方針
- 現在の掲載順位から1ページ目に浮上するための具体的な改善案を提示する
- 追加すべきセクション・キーワード・内部リンクの方向性を示す
- エンジニアが実務で使える具体的なコード例や手順の追加を検討する
- 読者の検索意図（何を知りたくて検索したか）に正面から答える構成にする`;
  }

  return basePrompt;
}
