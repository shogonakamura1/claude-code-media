// Gemini 2.5 Flash連携モジュール（Edge Runtime互換）

export interface GeminiSummaryResult {
  summary: string;
  detailedSummary: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  contentType: "news" | "tips" | "tutorial" | "case-study";
  readingTimeMin: number;
  language: string;
  titleJa?: string; // タイトルの日本語翻訳（日本語以外の記事）
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `あなたは技術記事を分析するアシスタントです。
与えられた記事のタイトル・説明・URLから、以下の情報をJSON形式で返してください。

## 出力フォーマット
{
  "summary": "2〜3文の日本語要約。「何が変わったか」「何ができるようになるか」を具体的に書く。固有名詞・数字・バージョン番号があれば含める。一覧ページ表示用のため簡潔に。",
  "detailedSummary": "記事詳細ページ用の詳細な日本語解説（300〜500字程度）。読者が元記事を読まなくても核心を把握できるように書く。以下の構成:\n\n■ 何が起きたか / 何の話か（1〜2文で結論から）\n\n■ 具体的な中身（箇条書き3〜5個）\n  - 機能名・API名・コマンド名など固有名詞を必ず含める\n  - 「〇〇が追加された」ではなく「〇〇を使うと△△ができるようになった」のように具体的に\n  - 数値やバージョン番号があれば含める\n\n■ 開発者にとっての意味（1〜2文）\n  - 実務でどう使えるか、何が楽になるかを具体的に",
  "difficulty": "beginner | intermediate | advanced",
  "contentType": "news | tips | tutorial | case-study",
  "readingTimeMin": 数値（推定読了時間・分）,
  "language": "原文の言語コード（ja, en など）",
  "titleJa": "タイトルの日本語翻訳（原文が日本語以外の場合は必ず出力。日本語記事の場合は省略）"
}

## difficulty判定基準
- beginner: プログラミング初心者でも理解できる。前提知識が少ない。用語解説あり。
- intermediate: 基本的なプログラミング知識が必要。フレームワークやツールの使用経験が前提。
- advanced: 深い技術知識が必要。アーキテクチャ設計、パフォーマンス最適化、内部実装の理解が前提。

## contentType判定基準
- news: リリース情報、アップデート、業界ニュース
- tips: 短いTips、ベストプラクティス、設定方法
- tutorial: ステップバイステップのガイド、ハンズオン
- case-study: 事例紹介、導入レポート、比較検証`;

export async function summarizeArticle(
  title: string,
  description: string,
  url: string,
  apiKey?: string
): Promise<GeminiSummaryResult> {
  const key = apiKey ?? process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const userPrompt = `以下の記事を分析してください。

タイトル: ${title}
説明: ${description}
URL: ${url}`;

  const endpoint = `${GEMINI_ENDPOINT}?key=${key}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  const parsed = JSON.parse(text) as GeminiSummaryResult;

  // バリデーション
  if (!parsed.summary || !parsed.difficulty || !parsed.contentType) {
    throw new Error("Gemini response missing required fields");
  }

  return {
    summary: parsed.summary,
    detailedSummary: parsed.detailedSummary ?? "",
    difficulty: parsed.difficulty,
    contentType: parsed.contentType,
    readingTimeMin: parsed.readingTimeMin ?? 5,
    language: parsed.language ?? "ja",
    ...(parsed.titleJa ? { titleJa: parsed.titleJa } : {}),
  };
}

/** 簡潔要約のみ生成（detailedSummaryなし）— Cron用コスト削減版 */
const SIMPLE_SUMMARY_PROMPT = `あなたは技術記事を分析するアシスタントです。
与えられた記事のタイトル・説明・URLから、以下の情報をJSON形式で返してください。

## 出力フォーマット
{
  "summary": "2〜3文の日本語要約。「何が変わったか」「何ができるようになるか」を具体的に書く。固有名詞・数字・バージョン番号があれば含める。一覧ページ表示用のため簡潔に。",
  "difficulty": "beginner | intermediate | advanced",
  "contentType": "news | tips | tutorial | case-study",
  "readingTimeMin": 数値（推定読了時間・分）,
  "language": "原文の言語コード（ja, en など）",
  "titleJa": "タイトルの日本語翻訳（原文が日本語以外の場合は必ず出力。日本語記事の場合は省略）"
}

## difficulty判定基準
- beginner: プログラミング初心者でも理解できる。前提知識が少ない。用語解説あり。
- intermediate: 基本的なプログラミング知識が必要。フレームワークやツールの使用経験が前提。
- advanced: 深い技術知識が必要。アーキテクチャ設計、パフォーマンス最適化、内部実装の理解が前提。

## contentType判定基準
- news: リリース情報、アップデート、業界ニュース
- tips: 短いTips、ベストプラクティス、設定方法
- tutorial: ステップバイステップのガイド、ハンズオン
- case-study: 事例紹介、導入レポート、比較検証`;

export interface SimpleSummaryResult {
  summary: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  contentType: "news" | "tips" | "tutorial" | "case-study";
  readingTimeMin: number;
  language: string;
  titleJa?: string;
}

export async function summarizeArticleSimple(
  title: string,
  description: string,
  url: string,
  apiKey?: string
): Promise<SimpleSummaryResult> {
  const key = apiKey ?? process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const userPrompt = `以下の記事を分析してください。

タイトル: ${title}
説明: ${description}
URL: ${url}`;

  const endpoint = `${GEMINI_ENDPOINT}?key=${key}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${SIMPLE_SUMMARY_PROMPT}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  const parsed = JSON.parse(text) as SimpleSummaryResult;

  if (!parsed.summary || !parsed.difficulty || !parsed.contentType) {
    throw new Error("Gemini response missing required fields");
  }

  return {
    summary: parsed.summary,
    difficulty: parsed.difficulty,
    contentType: parsed.contentType,
    readingTimeMin: parsed.readingTimeMin ?? 5,
    language: parsed.language ?? "ja",
    ...(parsed.titleJa ? { titleJa: parsed.titleJa } : {}),
  };
}

/** 詳細要約のみ生成 — 記事詳細ページのオンデマンド生成用 */
const DETAIL_SUMMARY_PROMPT = `あなたは技術記事を分析するアシスタントです。
与えられた記事のタイトル・説明・URLから、詳細な日本語解説を生成してください。

## 出力フォーマット
{
  "detailedSummary": "記事詳細ページ用の詳細な日本語解説（300〜500字程度）。読者が元記事を読まなくても核心を把握できるように書く。以下の構成:\n\n■ 何が起きたか / 何の話か（1〜2文で結論から）\n\n■ 具体的な中身（箇条書き3〜5個）\n  - 機能名・API名・コマンド名など固有名詞を必ず含める\n  - 「〇〇が追加された」ではなく「〇〇を使うと△△ができるようになった」のように具体的に\n  - 数値やバージョン番号があれば含める\n\n■ 開発者にとっての意味（1〜2文）\n  - 実務でどう使えるか、何が楽になるかを具体的に"
}`;

export async function summarizeArticleDetail(
  title: string,
  description: string,
  url: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey ?? process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const userPrompt = `以下の記事の詳細解説を生成してください。

タイトル: ${title}
説明: ${description}
URL: ${url}`;

  const endpoint = `${GEMINI_ENDPOINT}?key=${key}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${DETAIL_SUMMARY_PROMPT}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  const parsed = JSON.parse(text) as { detailedSummary: string };

  if (!parsed.detailedSummary) {
    throw new Error("Gemini response missing detailedSummary");
  }

  return parsed.detailedSummary;
}

/** バッチ間の待機用 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
