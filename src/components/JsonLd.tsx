import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";
import type { ArticleWithRelations } from "@/lib/db/schema";

/** WebSite構造化データ（トップページ用） */
export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "ja",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** 記事一覧の構造化データ（ItemList） */
export function ArticleListJsonLd({
  articles,
}: {
  articles: ArticleWithRelations[];
}) {
  if (articles.length === 0) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: articles.slice(0, 10).map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: article.originalUrl,
      name: article.title,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
