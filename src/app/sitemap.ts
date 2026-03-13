export const runtime = "edge";

import type { MetadataRoute } from "next";
import { eq, desc } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getDb } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { SITE_URL } from "@/lib/constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const categoryEntries: MetadataRoute.Sitemap = [
    "news",
    "tips",
    "tutorial",
    "case-study",
  ].map((slug) => ({
    url: `${SITE_URL}/?category=${slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  let articleEntries: MetadataRoute.Sitemap = [];

  try {
    const env = getRequestContext().env as { DB: D1Database };
    const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

    const rows = await db
      .select({
        slug: articles.slug,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(eq(articles.status, "PUBLISHED"))
      .orderBy(desc(articles.publishedAt))
      .limit(500);

    articleEntries = rows.map((row) => ({
      url: `${SITE_URL}/articles/${row.slug}`,
      lastModified: new Date(row.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // DB未接続時（ビルド時など）は記事エントリなし
  }

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    ...categoryEntries,
    ...articleEntries,
  ];
}
