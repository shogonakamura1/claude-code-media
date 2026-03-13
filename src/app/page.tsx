export const runtime = "edge";
export const revalidate = 300;

import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArticleCard } from "@/components/ArticleCard";
import { WebSiteJsonLd, ArticleListJsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";
import type { ArticleWithRelations } from "@/lib/db/schema";

const CATEGORIES = [
  { slug: "all", name: "すべて" },
  { slug: "news", name: "ニュース" },
  { slug: "tips", name: "Tips" },
  { slug: "tutorial", name: "チュートリアル" },
  { slug: "case-study", name: "事例・ハック" },
];

const PAGE_SIZE = 20;

const CATEGORY_LABELS: Record<string, string> = {
  news: "ニュース",
  tips: "Tips",
  tutorial: "チュートリアル",
  "case-study": "事例・ハック",
};

export async function generateMetadata({
  searchParams,
}: HomeProps): Promise<Metadata> {
  const params = await searchParams;
  const category = params.category;

  if (category && CATEGORY_LABELS[category]) {
    const label = CATEGORY_LABELS[category];
    return {
      title: `${label}の記事一覧`,
      description: `${SITE_NAME}の${label}カテゴリの記事一覧。Claude Code・AI開発ツールの${label}を日本語で紹介。`,
      alternates: {
        canonical: `/?category=${category}`,
      },
    };
  }

  return {
    title: `${SITE_NAME} - Claude Code / AI開発の最新情報`,
    description: SITE_DESCRIPTION,
    alternates: {
      canonical: "/",
    },
  };
}

interface HomeProps {
  searchParams: Promise<{ category?: string; page?: string }>;
}

interface ArticlesApiResponse {
  ok: boolean;
  articles: ArticleWithRelations[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

function formatDateSeparator(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function groupArticlesByDate(
  articles: ArticleWithRelations[]
): { date: string; label: string; articles: ArticleWithRelations[] }[] {
  const groups: Map<string, ArticleWithRelations[]> = new Map();

  for (const article of articles) {
    const dateKey = article.publishedAt
      ? new Date(article.publishedAt).toISOString().split("T")[0]
      : "unknown";
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(article);
    } else {
      groups.set(dateKey, [article]);
    }
  }

  return Array.from(groups.entries()).map(([dateKey, items]) => ({
    date: dateKey,
    label: dateKey === "unknown" ? "日付不明" : formatDateSeparator(dateKey),
    articles: items,
  }));
}

export default async function HomePage({ searchParams }: HomeProps) {
  const params = await searchParams;
  const activeCategory = params.category ?? "all";
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  // Fetch articles from internal API
  let data: ArticlesApiResponse = {
    ok: false,
    articles: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
  };

  try {
    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const apiUrl = new URL("/api/articles", baseUrl);
    apiUrl.searchParams.set("page", String(currentPage));
    apiUrl.searchParams.set("limit", String(PAGE_SIZE));
    if (activeCategory !== "all") {
      apiUrl.searchParams.set("category", activeCategory);
    }

    const res = await fetch(apiUrl.toString(), { next: { revalidate: 300 } });
    if (res.ok) {
      data = await res.json();
    }
  } catch {
    // Fallback to empty on fetch failure (dev environment, etc.)
  }

  const { articles, totalCount, totalPages } = data;
  const start = totalCount > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(currentPage * PAGE_SIZE, totalCount);

  // Group articles by date
  const dateGroups = groupArticlesByDate(articles);

  // Build query params for pagination links
  const baseParams: Record<string, string> = {};
  if (activeCategory !== "all") baseParams.category = activeCategory;

  function buildUrl(page: number): string {
    const qs = new URLSearchParams({
      ...baseParams,
      ...(page > 1 ? { page: String(page) } : {}),
    }).toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <div className="space-y-8">
      <WebSiteJsonLd />
      <ArticleListJsonLd articles={articles} />

      {/* Page title */}
      <section className="pt-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          ClaudeNote
          <span className="ml-2 text-base font-normal text-muted-foreground">
            — Claude Code の最新情報
          </span>
        </h1>
      </section>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const qs =
            cat.slug === "all"
              ? ""
              : new URLSearchParams({ category: cat.slug }).toString();

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

      {/* Article feed with date separators */}
      {articles.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          該当する記事はありません
        </p>
      ) : (
        <div className="space-y-8">
          {dateGroups.map((group) => (
            <section key={group.date}>
              <h2 className="mb-3 border-b border-border pb-2 text-sm font-medium text-muted-foreground">
                {group.label}
              </h2>
              <div className="space-y-4">
                {group.articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between pb-8">
          <span className="text-sm text-muted-foreground">
            全{totalCount}件中 {start}-{end}件を表示
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={buildUrl(currentPage - 1)}
                className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                ← 前へ
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={buildUrl(currentPage + 1)}
                className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                次へ →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
