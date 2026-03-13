import { getDb } from "@/lib/db";
import { articles, categories } from "@/lib/db/schema";
import type { Category, ArticleStatus, Difficulty } from "@/lib/db/schema";
import { eq, desc, gte, and, sql } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/** デフォルトの日付下限 */
const DEFAULT_DATE_FROM = "2025-02-01T00:00:00Z";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Math.max(parseInt(url.searchParams.get("page") ?? "1", 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") ?? "10", 10) || 10, 1),
      50
    );
    const category = url.searchParams.get("category");
    const difficulty = url.searchParams.get("difficulty");
    const status = url.searchParams.get("status");

    const env = getRequestContext().env as { DB: D1Database };
    const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

    // 基本条件: publishedAt >= 2025-02-01
    const conditions = [gte(articles.publishedAt, DEFAULT_DATE_FROM)];

    // status フィルタ（デフォルトはPUBLISHED）
    if (status) {
      conditions.push(eq(articles.status, status as ArticleStatus));
    } else {
      conditions.push(eq(articles.status, "PUBLISHED"));
    }

    // カテゴリフィルタ（slugで受け取り、categoryIdにマッピング）
    if (category) {
      const categoryId = `cat_${category}`;
      conditions.push(eq(articles.categoryId, categoryId));
    }

    // 難易度フィルタ
    if (difficulty) {
      conditions.push(eq(articles.difficulty, difficulty as Difficulty));
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);
    const offset = (page - 1) * limit;

    // 記事取得
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

    const totalCount = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    // カテゴリ情報を付与
    let categoryMap: Record<string, Category> = {};
    const categoryIds = [...new Set(rows.map((r) => r.categoryId).filter(Boolean))] as string[];

    if (categoryIds.length > 0) {
      const cats = await db
        .select()
        .from(categories)
        .where(
          sql`${categories.id} IN (${sql.join(
            categoryIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        );
      categoryMap = Object.fromEntries(cats.map((c) => [c.id, c]));
    }

    const articlesWithCategory = rows.map((row) => ({
      ...row,
      category: row.categoryId ? categoryMap[row.categoryId] ?? null : null,
      features: [],
      tags: [],
    }));

    return Response.json({
      ok: true,
      articles: articlesWithCategory,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
