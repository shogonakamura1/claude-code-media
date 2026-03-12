import { fetchAll } from "@/lib/fetchers";
import { summarizeArticle, sleep } from "@/lib/gemini";
import type { GeminiSummaryResult } from "@/lib/gemini";
import { getDb } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

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

interface CronEnv {
  DB: D1Database;
  CRON_SECRET?: string;
  GEMINI_API_KEY?: string;
}

export async function GET(request: Request) {
  const envVars = getRequestContext().env as CronEnv;

  // 簡易認証: ?secret=xxx または Authorization: Bearer xxx
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? secret ?? "";

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

    // D1に保存（環境変数がある場合のみ）
    let saved = 0;
    let skipped = 0;
    let summarized = 0;
    const errors: string[] = [];

    try {
      const db = getDb({ DB: envVars.DB, ADMIN_PASSWORD_HASH: "" });

      // 10件ずつバッチ処理
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

            // Gemini要約（失敗してもフォールバック）
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
            const slug = generateSlug(item.title) || id;

            await db.insert(articles).values({
              id,
              slug,
              title: item.title,
              originalTitle: item.title,
              originalUrl: item.url,
              source: item.source,
              status: "PENDING",
              score: item.score,
              aiSummary: geminiData?.summary ?? null,
              difficulty: geminiData?.difficulty ?? null,
              contentType: geminiData?.contentType ?? null,
              readingTimeMin: geminiData?.readingTimeMin ?? null,
              language: geminiData?.language ?? null,
              fetchedAt: new Date().toISOString(),
              publishedAt: item.publishedAt,
            });

            saved++;
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
      // D1未接続の場合はスキップ（開発環境用）
      errors.push(
        `DB connection error: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`
      );
    }

    return Response.json({
      ok: true,
      summary,
      total: allScored.length,
      saved,
      skipped,
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
