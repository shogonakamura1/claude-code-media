import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

/**
 * 静的サイトマップ。
 * 現在は個別記事ページがないため、トップページとカテゴリページを登録。
 * 記事詳細ページ追加時に、DB から PUBLISHED 記事を取得して動的生成に拡張する。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const categories = ["news", "tips", "tutorial", "case-study"];

  const categoryEntries: MetadataRoute.Sitemap = categories.map((slug) => ({
    url: `${SITE_URL}/?category=${slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    ...categoryEntries,
  ];
}
