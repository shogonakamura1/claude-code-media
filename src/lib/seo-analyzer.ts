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
  const basePrompt = `あなたはSEOの専門家です。以下の記事の${issue.type === "title" ? "タイトル" : issue.type === "description" ? "メタディスクリプション" : "コンテンツ"}を改善してください。

## 現在の記事情報
- タイトル: ${article.title}
- AI要約: ${article.aiSummary ?? "なし"}
- カテゴリ: ${article.contentType ?? "不明"}
- 難易度: ${article.difficulty ?? "不明"}

## 改善が必要な理由
${issue.reason}

## 出力フォーマット（JSON）
{
  "suggestedValue": "改善後の${issue.type === "title" ? "タイトル" : issue.type === "description" ? "メタディスクリプション" : "コンテンツ改善案"}",
  "reason": "この改善で期待される効果の説明（1-2文）"
}`;

  if (issue.type === "title") {
    return `${basePrompt}

## タイトル改善のルール
- 32文字以内を推奨（Google検索結果で切れないように）
- 検索意図に合致するキーワードを含める
- クリックしたくなる具体性・数字・ベネフィットを盛り込む
- 元の内容と乖離しないこと`;
  }

  return basePrompt;
}
