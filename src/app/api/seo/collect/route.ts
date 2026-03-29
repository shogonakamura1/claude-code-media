// Search Console データ収集エンドポイント
// Cron Trigger で日次実行: POST /api/seo/collect

import { getRequestContext } from "@cloudflare/next-on-pages";
import { getDb } from "@/lib/db";
import { articles, seoMetrics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchSearchConsoleData } from "@/lib/google-search-console";

export const runtime = "edge";

interface SeoCollectEnv {
  DB: D1Database;
  CRON_SECRET?: string;
  GSC_CLIENT_EMAIL?: string;
  GSC_PRIVATE_KEY?: string;
  GSC_SITE_URL?: string;
}

function generateId(): string {
  return `seo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * URLからスラッグを抽出（/articles/xxx → xxx）
 */
function extractSlugFromUrl(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl);
    const match = url.pathname.match(/^\/articles\/(.+?)(?:\/|$)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const env = getRequestContext().env as SeoCollectEnv;

  // 認証
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? "";
  if (env.CRON_SECRET && token !== env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // デバッグ: envオブジェクトのキー一覧を確認（値は出力しない）
  const envKeys = Object.keys(env).sort();
  const gscDebug = {
    envKeys,
    hasGscEmail: "GSC_CLIENT_EMAIL" in env,
    hasGscKey: "GSC_PRIVATE_KEY" in env,
    hasGscUrl: "GSC_SITE_URL" in env,
    gscEmailType: typeof env.GSC_CLIENT_EMAIL,
    gscKeyType: typeof env.GSC_PRIVATE_KEY,
    gscUrlType: typeof env.GSC_SITE_URL,
  };

  // 環境変数チェック
  if (!env.GSC_CLIENT_EMAIL || !env.GSC_PRIVATE_KEY || !env.GSC_SITE_URL) {
    return Response.json(
      {
        ok: false,
        error: "GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, GSC_SITE_URL が未設定です",
        debug: gscDebug,
      },
      { status: 500 }
    );
  }

  try {
    const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

    // 3日前のデータを取得（Search Consoleは2-3日遅延がある）
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 3);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // 改行がエスケープされている場合の復元
    const privateKey = env.GSC_PRIVATE_KEY.replace(/\\n/g, "\n");

    const rows = await fetchSearchConsoleData(
      env.GSC_CLIENT_EMAIL,
      privateKey,
      env.GSC_SITE_URL,
      formatDate(startDate),
      formatDate(endDate)
    );

    // 公開済み記事のスラッグ一覧を取得
    const publishedArticles = await db
      .select({ id: articles.id, slug: articles.slug })
      .from(articles)
      .where(eq(articles.status, "PUBLISHED"));

    const slugToArticleId = new Map(
      publishedArticles.map((a) => [a.slug, a.id])
    );

    let saved = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const slug = extractSlugFromUrl(row.page);
        if (!slug) continue;

        const articleId = slugToArticleId.get(slug) ?? null;

        await db.insert(seoMetrics).values({
          id: generateId(),
          articleId,
          slug,
          query: row.query,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr.toFixed(4),
          position: row.position.toFixed(1),
          date: formatDate(endDate),
        });
        saved++;
      } catch (err) {
        errors.push(
          `Save error for ${row.page}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return Response.json({
      ok: true,
      period: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
      fetched: rows.length,
      saved,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
