import { getDb } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { eq, desc, gte, inArray, and, sql } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

type Tab = "beginner" | "latest" | "featured" | "practical";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tab = (url.searchParams.get("tab") ?? "latest") as Tab;
    const category = url.searchParams.get("category");
    const feature = url.searchParams.get("feature");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10) || 10, 50);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10) || 0;

    const env = getRequestContext().env as { DB: D1Database };
    const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

    // 基本条件: 公開済みのみ
    const conditions = [eq(articles.status, "PUBLISHED")];

    // タブ別フィルタ
    switch (tab) {
      case "beginner":
        conditions.push(eq(articles.difficulty, "beginner"));
        break;
      case "latest": {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        conditions.push(gte(articles.publishedAt, oneWeekAgo));
        break;
      }
      case "featured":
        conditions.push(
          sql`(${articles.score} >= 8)`
        );
        break;
      case "practical":
        conditions.push(
          inArray(articles.contentType, ["tips", "case-study"])
        );
        break;
    }

    // カテゴリフィルタ
    if (category) {
      conditions.push(eq(articles.categoryId, category));
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    const rows = await db
      .select()
      .from(articles)
      .where(where)
      .orderBy(desc(articles.publishedAt))
      .limit(limit)
      .offset(offset);

    // 件数取得
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(where);

    return Response.json({
      ok: true,
      articles: rows,
      total: countResult[0]?.count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
