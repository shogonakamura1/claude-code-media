// SEOメトリクスAPI
// GET /api/seo/metrics - ダッシュボード用データ取得

import { getRequestContext } from "@cloudflare/next-on-pages";
import { getDb } from "@/lib/db";
import { articles, seoMetrics, seoImprovements } from "@/lib/db/schema";
import { eq, desc, gte, sql } from "drizzle-orm";

export const runtime = "edge";

export async function GET(request: Request) {
  const env = getRequestContext().env as { DB: D1Database };
  const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") ?? "7");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split("T")[0];

  try {
    // 1. ページ別の集計メトリクス
    const pageMetrics = await db
      .select({
        articleId: seoMetrics.articleId,
        slug: seoMetrics.slug,
        totalClicks: sql<number>`SUM(${seoMetrics.clicks})`.as("total_clicks"),
        totalImpressions: sql<number>`SUM(${seoMetrics.impressions})`.as(
          "total_impressions"
        ),
        avgPosition: sql<number>`AVG(CAST(${seoMetrics.position} AS REAL))`.as(
          "avg_position"
        ),
      })
      .from(seoMetrics)
      .where(gte(seoMetrics.date, startDateStr))
      .groupBy(seoMetrics.articleId, seoMetrics.slug)
      .orderBy(desc(sql`total_clicks`))
      .limit(50);

    // 記事タイトルを結合
    const articleIds = pageMetrics
      .map((m) => m.articleId)
      .filter((id): id is string => id !== null);

    const articleTitles: Record<string, string> = {};
    if (articleIds.length > 0) {
      for (const id of articleIds) {
        const art = await db
          .select({ id: articles.id, title: articles.title })
          .from(articles)
          .where(eq(articles.id, id))
          .limit(1);
        if (art[0]) articleTitles[art[0].id] = art[0].title;
      }
    }

    const enrichedMetrics = pageMetrics.map((m) => ({
      ...m,
      title: m.articleId ? articleTitles[m.articleId] ?? null : null,
      avgCtr:
        m.totalImpressions > 0
          ? ((m.totalClicks / m.totalImpressions) * 100).toFixed(1)
          : "0",
    }));

    // 2. 全体サマリー
    const summaryResult = await db
      .select({
        totalClicks: sql<number>`SUM(${seoMetrics.clicks})`.as("total_clicks"),
        totalImpressions: sql<number>`SUM(${seoMetrics.impressions})`.as(
          "total_impressions"
        ),
        avgPosition: sql<number>`AVG(CAST(${seoMetrics.position} AS REAL))`.as(
          "avg_position"
        ),
      })
      .from(seoMetrics)
      .where(gte(seoMetrics.date, startDateStr));

    const summary = summaryResult[0] ?? {
      totalClicks: 0,
      totalImpressions: 0,
      avgPosition: 0,
    };

    // 3. 人気検索クエリ
    const topQueries = await db
      .select({
        query: seoMetrics.query,
        totalClicks: sql<number>`SUM(${seoMetrics.clicks})`.as("total_clicks"),
        totalImpressions: sql<number>`SUM(${seoMetrics.impressions})`.as(
          "total_impressions"
        ),
      })
      .from(seoMetrics)
      .where(gte(seoMetrics.date, startDateStr))
      .groupBy(seoMetrics.query)
      .orderBy(desc(sql`total_clicks`))
      .limit(20);

    // 4. 保留中の改善提案
    const pendingImprovements = await db
      .select()
      .from(seoImprovements)
      .where(eq(seoImprovements.status, "pending"))
      .orderBy(desc(seoImprovements.createdAt))
      .limit(20);

    // 改善提案に記事タイトルを結合
    const improvementArticleIds = [
      ...new Set(pendingImprovements.map((i) => i.articleId)),
    ];
    const improvementTitles: Record<string, string> = {};
    for (const id of improvementArticleIds) {
      const art = await db
        .select({ id: articles.id, title: articles.title })
        .from(articles)
        .where(eq(articles.id, id))
        .limit(1);
      if (art[0]) improvementTitles[art[0].id] = art[0].title;
    }

    const enrichedImprovements = pendingImprovements.map((imp) => ({
      ...imp,
      articleTitle: improvementTitles[imp.articleId] ?? null,
    }));

    return Response.json({
      ok: true,
      period: { days, startDate: startDateStr },
      summary: {
        ...summary,
        avgCtr:
          summary.totalImpressions > 0
            ? (
                (summary.totalClicks / summary.totalImpressions) *
                100
              ).toFixed(1)
            : "0",
      },
      pages: enrichedMetrics,
      queries: topQueries,
      improvements: enrichedImprovements,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
