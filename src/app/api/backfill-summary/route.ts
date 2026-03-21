import { summarizeArticle, sleep } from "@/lib/gemini";
import type { GeminiSummaryResult } from "@/lib/gemini";
import { getDb } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface BackfillEnv {
  DB: D1Database;
  CRON_SECRET?: string;
  GEMINI_API_KEY?: string;
}

/** 要約なしの記事にGemini要約をバッチ適用する（1回10件） */
export async function POST(request: Request) {
  const envVars = getRequestContext().env as BackfillEnv;

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? "";
  if (envVars.CRON_SECRET && token !== envVars.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "10"), 20);

  try {
    const db = getDb({ DB: envVars.DB, ADMIN_PASSWORD_HASH: "" });

    const pending = await db
      .select({
        id: articles.id,
        title: articles.title,
        originalTitle: articles.originalTitle,
        originalUrl: articles.originalUrl,
        source: articles.source,
      })
      .from(articles)
      .where(isNull(articles.aiSummary))
      .limit(limit);

    if (pending.length === 0) {
      return Response.json({ ok: true, message: "All articles have summaries", remaining: 0, updated: 0 });
    }

    let updated = 0;
    const errors: string[] = [];

    for (const item of pending) {
      try {
        const geminiData: GeminiSummaryResult = await summarizeArticle(
          item.originalTitle ?? item.title,
          "",
          item.originalUrl,
          envVars.GEMINI_API_KEY
        );

        const isEnglish = geminiData.language === "en";
        const titleJa = geminiData.titleJa;
        const newTitle = isEnglish && titleJa ? titleJa : item.title;
        const originalTitle = isEnglish ? (item.originalTitle ?? item.title) : item.originalTitle;

        await db
          .update(articles)
          .set({
            title: newTitle,
            originalTitle,
            aiSummary: geminiData.summary,
            aiDetailedSummary: geminiData.detailedSummary,
            difficulty: geminiData.difficulty,
            contentType: geminiData.contentType,
            readingTimeMin: geminiData.readingTimeMin,
            language: geminiData.language,
            categoryId: geminiData.contentType
              ? { news: "cat_news", tips: "cat_tips", tutorial: "cat_tutorial", "case-study": "cat_case" }[geminiData.contentType] ?? null
              : null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(articles.id, item.id));

        updated++;
        await sleep(500);
      } catch (err) {
        errors.push(`${item.title}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const remainingRows = await db
      .select({ id: articles.id })
      .from(articles)
      .where(isNull(articles.aiSummary));

    return Response.json({
      ok: true,
      updated,
      remaining: remainingRows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
