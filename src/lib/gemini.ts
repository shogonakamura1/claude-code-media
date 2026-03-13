// Gemini 2.5 Flash連携モジュール（Edge Runtime互換）

export interface GeminiSummaryResult {
  summary: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  contentType: "news" | "tips" | "tutorial" | "case-study";
  readingTimeMin: number;
  language: string;
  titleJa?: string; // 英語タイトルの日本語翻訳（英語記事のみ）
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `あなたは技術記事を分析するアシスタントです。
与えられた記事のタイトル・説明・URLから、以下の情報をJSON形式で返してください。

## 出力フォーマット
{
  "summary": "3行以内の日本語要約。駆け出しエンジニアにもわかる平易な言葉で書く。",
  "difficulty": "beginner | intermediate | advanced",
  "contentType": "news | tips | tutorial | case-study",
  "readingTimeMin": 数値（推定読了時間・分）,
  "language": "原文の言語コード（ja, en など）",
  "titleJa": "英語タイトルの日本語翻訳（原文が英語の場合のみ出力。日本語記事の場合は省略）"
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
    difficulty: parsed.difficulty,
    contentType: parsed.contentType,
    readingTimeMin: parsed.readingTimeMin ?? 5,
    language: parsed.language ?? "ja",
    ...(parsed.titleJa ? { titleJa: parsed.titleJa } : {}),
  };
}

/** バッチ間の待機用 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
