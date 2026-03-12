export const runtime = "edge";

import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { FeatureHub } from "@/components/FeatureHub";
import { TabNavigation } from "@/components/TabNavigation";
import { WeeklyHighlights } from "@/components/WeeklyHighlights";
import { fetchLiveArticles } from "@/lib/fetch-live-articles";
import { MOCK_FEATURES } from "@/lib/mock-data";
import type { ArticleWithRelations } from "@/lib/db/schema";

const CATEGORIES = [
  { slug: "all", name: "すべて" },
  { slug: "news", name: "ニュース" },
  { slug: "tips", name: "Tips" },
  { slug: "tutorial", name: "チュートリアル" },
  { slug: "case-study", name: "事例・ハック" },
];

const PAGE_SIZE = 10;

interface HomeProps {
  searchParams: Promise<{ tab?: string; category?: string; feature?: string; page?: string }>;
}

function filterArticlesByTab(
  articles: ArticleWithRelations[],
  tab: string
): ArticleWithRelations[] {
  switch (tab) {
    case "beginner":
      return articles.filter(
        (a) =>
          a.difficulty === "beginner" ||
          a.category?.slug === "tutorial"
      );
    case "featured":
      return [...articles].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    case "practical":
      return articles.filter(
        (a) =>
          a.category?.slug === "tips" || a.category?.slug === "case-study"
      );
    case "latest":
    default:
      return [...articles].sort(
        (a, b) =>
          new Date(b.publishedAt ?? 0).getTime() -
          new Date(a.publishedAt ?? 0).getTime()
      );
  }
}

function buildQueryString(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return qs ? `/?${qs}` : "/";
}

export default async function HomePage({ searchParams }: HomeProps) {
  const params = await searchParams;
  const activeTab = params.tab ?? "latest";
  const activeCategory = params.category ?? "all";
  const activeFeature = params.feature ?? "all";
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  // Fetch all articles (backend handles Gemini enrichment internally)
  const result = await fetchLiveArticles(currentPage, PAGE_SIZE);
  const allArticles = result.articles;

  // Weekly highlights: top 3 by score
  const highlights = [...allArticles]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);

  // Filter by tab first, then by category/feature
  const tabFiltered = filterArticlesByTab(allArticles, activeTab);

  const filtered = tabFiltered.filter((a) => {
    const categoryMatch =
      activeCategory === "all" || a.category?.slug === activeCategory;
    const featureMatch =
      activeFeature === "all" ||
      a.features.some((f) => f.slug === activeFeature);
    return categoryMatch && featureMatch;
  });

  // Pagination (client-side filtering on paginated data)
  const totalCount = result.totalCount;
  const totalPages = result.totalPages;
  const articles = filtered;

  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalCount);

  // Build search params for link generation
  const baseParams: Record<string, string> = {};
  if (activeTab !== "latest") baseParams.tab = activeTab;
  if (activeCategory !== "all") baseParams.category = activeCategory;
  if (activeFeature !== "all") baseParams.feature = activeFeature;

  const prevUrl = buildQueryString({ ...baseParams, page: String(currentPage - 1) });
  const nextUrl = buildQueryString({ ...baseParams, page: String(currentPage + 1) });

  return (
    <div className="space-y-12">
      {/* ① Hero */}
      <section className="py-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          AIツールの最新情報を、
          <span className="text-primary">あなたのペースで</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Claude Code の公式ニュース・Tips・チュートリアルを引用元明示 +
          AI要約付きでキュレーション
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/?tab=beginner"
            className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-600 transition-colors hover:bg-green-500/20 dark:text-green-400"
          >
            🔰 まずはここから
          </Link>
          <Link
            href="/?tab=featured"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            📰 今週のまとめ
          </Link>
          <Link
            href="/?tab=latest"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            🔍 全記事
          </Link>
        </div>
      </section>

      {/* ② Weekly Highlights */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          今週のハイライト
        </h2>
        <WeeklyHighlights articles={highlights} />
      </section>

      {/* ③ Tab + Filter + Articles */}
      <section>
        <TabNavigation activeTab={activeTab} searchParams={baseParams} />

        {/* Category Filter */}
        <div className="mt-4 mb-6 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const catParams = new URLSearchParams();
            if (activeTab !== "latest") catParams.set("tab", activeTab);
            if (cat.slug !== "all") catParams.set("category", cat.slug);
            if (activeFeature !== "all") catParams.set("feature", activeFeature);
            const qs = catParams.toString();

            return (
              <Link
                key={cat.slug}
                href={qs ? `/?${qs}` : "/"}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  activeCategory === cat.slug
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>

        {/* Article list */}
        {articles.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            該当する記事はありません
          </p>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              全{totalCount}件中 {start}-{end}件を表示
            </span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={prevUrl}
                  className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  ← 前へ
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={nextUrl}
                  className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  次へ →
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ④ Feature Hub */}
      <section id="features">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          機能で探す
        </h2>
        <FeatureHub features={MOCK_FEATURES} activeSlug={activeFeature} />
      </section>
    </div>
  );
}
