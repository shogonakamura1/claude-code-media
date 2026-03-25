// AI改善提案生成エンドポイント
// POST /api/seo/suggest - メトリクスを分析してGeminiで改善案を自動生成

import { getRequestContext } from "@cloudflare/next-on-pages";
import { getDb } from "@/lib/db";
import { articles, seoMetrics, seoImprovements } from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { detectIssues, buildImprovementPrompt } from "@/lib/seo-analyzer";
import type { SeoAnalysisInput } from "@/lib/seo-analyzer";
import { sleep } from "@/lib/gemini";

export const runtime = "edge";

interface SuggestEnv {
  DB: D1Database;
  CRON_SECRET?: string;
  GEMINI_API_KEY?: string;
}

function generateId(): string {
  return `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function generateImprovement(
  prompt: string,
  apiKey: string
): Promise<{ suggestedValue: string; reason: string }> {
  const endpoint = `${GEMINI_ENDPOINT}?key=${apiKey}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
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
  if (!text) throw new Error("Gemini returned empty response");

  return JSON.parse(text);
}

export async function POST(request: Request) {
  const env = getRequestContext().env as SuggestEnv;

  // 認証
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? "";
  if (env.CRON_SECRET && token !== env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.GEMINI_API_KEY) {
    return Response.json(
      { ok: false, error: "GEMINI_API_KEY が未設定です" },
      { status: 500 }
    );
  }

  try {
    const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

    // 公開済み記事を取得
    const publishedArticles = await db
      .select()
      .from(articles)
      .where(eq(articles.status, "PUBLISHED"))
      .orderBy(desc(articles.publishedAt));

    // 7日前の日付
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    // 各記事のメトリクスを取得して分析入力を構築
    const analysisInputs: SeoAnalysisInput[] = [];

    for (const article of publishedArticles) {
      const metrics = await db
        .select()
        .from(seoMetrics)
        .where(
          and(
            eq(seoMetrics.articleId, article.id),
            gte(seoMetrics.date, sevenDaysAgoStr)
          )
        );

      analysisInputs.push({ article, metrics });
    }

    // 問題を検出
    const issues = detectIssues(analysisInputs);

    // 上位5件にAI改善提案を生成
    const topIssues = issues.slice(0, 5);
    let generated = 0;
    const errors: string[] = [];

    for (const issue of topIssues) {
      try {
        const article = publishedArticles.find((a) => a.id === issue.articleId);
        if (!article) continue;

        const prompt = buildImprovementPrompt(issue, article);
        const result = await generateImprovement(prompt, env.GEMINI_API_KEY);

        await db.insert(seoImprovements).values({
          id: generateId(),
          articleId: issue.articleId,
          type: issue.type,
          currentValue: issue.currentValue,
          suggestedValue: result.suggestedValue,
          reason: result.reason,
          priority: issue.priority,
          status: "pending",
        });

        generated++;

        // レート制限対策
        if (generated < topIssues.length) {
          await sleep(1000);
        }
      } catch (err) {
        errors.push(
          `Suggestion error for ${issue.articleId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return Response.json({
      ok: true,
      analyzed: publishedArticles.length,
      issuesDetected: issues.length,
      suggestionsGenerated: generated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
