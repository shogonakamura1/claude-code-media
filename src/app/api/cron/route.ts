import { fetchAll } from "@/lib/fetchers";
import { AUTO_PUBLISH_MIN } from "@/lib/fetchers/scorer";
import { summarizeArticle, sleep } from "@/lib/gemini";
import type { GeminiSummaryResult } from "@/lib/gemini";
import { getDb } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

const CONTENT_TYPE_TO_CATEGORY: Record<string, string> = {
  news: "cat_news",
  tips: "cat_tips",
  tutorial: "cat_tutorial",
  "case-study": "cat_case",
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u3000-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function generateId(): string {
  return `art_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * スコアに基づくstatus振り分け
 * - AUTO_PUBLISH_MIN以上 → PUBLISHED（自動公開）
 * - それ未満（REVIEW_MIN以上で通過済み） → PENDING（オーナーレビュー待ち）
 */
function determineStatus(score: number): "PUBLISHED" | "PENDING" {
  return score >= AUTO_PUBLISH_MIN ? "PUBLISHED" : "PENDING";
}

interface CronEnv {
  DB: D1Database;
  CRON_SECRET?: string;
  GEMINI_API_KEY?: string;
}

export async function POST(request: Request) {
  const envVars = getRequestContext().env as CronEnv;

  // 認証: Authorization: Bearer xxx またはbody内secret
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? "";

  const cronSecret = envVars.CRON_SECRET;
  if (cronSecret && token !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await fetchAll();

    const summary = results.map((r) => ({
      source: r.label,
      fetched: r.fetched,
      scored: r.scored.length,
      error: r.error,
    }));

    const allScored = results.flatMap((r) => r.scored);

    let saved = 0;
    let skipped = 0;
    let summarized = 0;
    let published = 0;
    let pending = 0;
    const savedIds: string[] = [];
    const errors: string[] = [];

    try {
      const db = getDb({ DB: envVars.DB, ADMIN_PASSWORD_HASH: "" });

      for (let i = 0; i < allScored.length; i += 10) {
        const batch = allScored.slice(i, i + 10);

        for (const item of batch) {
          try {
            // 重複チェック
            const existing = await db
              .select({ id: articles.id })
              .from(articles)
              .where(eq(articles.originalUrl, item.url))
              .limit(1);

            if (existing.length > 0) {
              skipped++;
              continue;
            }

            // Gemini要約
            let geminiData: GeminiSummaryResult | null = null;

            try {
              geminiData = await summarizeArticle(
                item.title,
                item.description,
                item.url,
                envVars.GEMINI_API_KEY
              );
              summarized++;
            } catch (geminiErr) {
              errors.push(
                `Gemini error for "${item.title}": ${geminiErr instanceof Error ? geminiErr.message : String(geminiErr)}`
              );
            }

            const id = generateId();
            const isEnglish = geminiData?.language === "en";

            // 英語記事: title = titleJa, originalTitle = 原文
            // 日本語記事: title = 原文, originalTitle = null
            const titleJa = geminiData?.titleJa;
            const articleTitle =
              isEnglish && titleJa ? titleJa : item.title;
            const originalTitle = isEnglish ? item.title : null;

            const slug = generateSlug(articleTitle) || id;

            // contentType → categoryIdマッピング
            const categoryId = geminiData?.contentType
              ? CONTENT_TYPE_TO_CATEGORY[geminiData.contentType] ?? null
              : null;

            const articleStatus = determineStatus(item.score);

            await db.insert(articles).values({
              id,
              slug,
              title: articleTitle,
              originalTitle,
              originalUrl: item.url,
              source: item.source,
              categoryId,
              status: articleStatus,
              score: item.score,
              aiSummary: geminiData?.summary ?? null,
              difficulty: geminiData?.difficulty ?? null,
              contentType: geminiData?.contentType ?? null,
              readingTimeMin: geminiData?.readingTimeMin ?? null,
              language: geminiData?.language ?? null,
              fetchedAt: new Date().toISOString(),
              publishedAt: item.publishedAt,
            });

            if (articleStatus === "PUBLISHED") published++;
            else pending++;
            saved++;
            savedIds.push(id);
          } catch (itemErr) {
            errors.push(
              `Save error for "${item.title}": ${itemErr instanceof Error ? itemErr.message : String(itemErr)}`
            );
          }
        }

        // バッチ間待機（レート制限対策）
        if (i + 10 < allScored.length) {
          await sleep(1000);
        }
      }
    } catch (dbErr) {
      errors.push(
        `DB connection error: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`
      );
    }

    return Response.json({
      ok: true,
      summary,
      total: allScored.length,
      saved,
      savedIds,
      skipped,
      published,
      pending,
      summarized,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
