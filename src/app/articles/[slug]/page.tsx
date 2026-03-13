export const runtime = "edge";
export const revalidate = 300;

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { ArrowLeft, ExternalLink, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DisplayAd } from "@/components/AdUnit";
import { getDb } from "@/lib/db";
import { articles, categories } from "@/lib/db/schema";
import type { Article, Category } from "@/lib/db/schema";
import { SITE_URL, SITE_NAME } from "@/lib/constants";

const CATEGORY_COLORS: Record<string, string> = {
  news: "border-orange-500 text-orange-500",
  tips: "border-blue-500 text-blue-500",
  tutorial: "border-emerald-500 text-emerald-500",
  "case-study": "border-purple-500 text-purple-500",
};

const DIFFICULTY_CONFIG: Record<string, { label: string; className: string }> = {
  beginner: { label: "入門", className: "border-green-500 text-green-500" },
  intermediate: { label: "中級", className: "border-yellow-500 text-yellow-500" },
  advanced: { label: "上級", className: "border-red-500 text-red-500" },
};

type ArticleWithCategory = Article & { category: Category | null };

async function getArticle(slug: string): Promise<ArticleWithCategory | null> {
  try {
    const env = getRequestContext().env as { DB: D1Database };
    const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

    const rows = await db
      .select()
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.status, "PUBLISHED")))
      .limit(1);

    if (rows.length === 0) return null;

    const article = rows[0];
    let category: Category | null = null;

    if (article.categoryId) {
      const cats = await db
        .select()
        .from(categories)
        .where(eq(categories.id, article.categoryId))
        .limit(1);
      category = cats[0] ?? null;
    }

    return { ...article, category };
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return { title: "記事が見つかりません" };
  }

  const description = article.aiSummary
    ? article.aiSummary.slice(0, 160)
    : `${article.title} - ${SITE_NAME}`;

  return {
    title: article.title,
    description,
    alternates: {
      canonical: `/articles/${slug}`,
    },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url: `${SITE_URL}/articles/${slug}`,
      publishedTime: article.publishedAt ?? undefined,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
    },
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ArticleJsonLd({ article }: { article: ArticleWithCategory }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.aiSummary ?? "",
    url: `${SITE_URL}/articles/${article.slug}`,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/articles/${article.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) notFound();

  const categorySlug = article.category?.slug ?? "";
  const colorClass = CATEGORY_COLORS[categorySlug] ?? "border-muted-foreground text-muted-foreground";
  const difficultyConfig = article.difficulty ? DIFFICULTY_CONFIG[article.difficulty] : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <ArticleJsonLd article={article} />

      {/* パンくずリスト */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          トップ
        </Link>
        {article.category && (
          <>
            <span>/</span>
            <Link
              href={`/?category=${categorySlug}`}
              className="hover:text-foreground"
            >
              {article.category.name}
            </Link>
          </>
        )}
      </nav>

      {/* 記事ヘッダー */}
      <header className="space-y-4">
        {/* バッジ */}
        <div className="flex flex-wrap gap-2">
          {article.category && (
            <Badge variant="outline" className={`text-xs ${colorClass}`}>
              {article.category.name}
            </Badge>
          )}
          {difficultyConfig && (
            <Badge variant="outline" className={`text-xs ${difficultyConfig.className}`}>
              {difficultyConfig.label}
            </Badge>
          )}
          {article.isEssential === 1 && (
            <Badge variant="outline" className="border-amber-500 text-xs text-amber-500">
              必読
            </Badge>
          )}
        </div>

        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
          {article.title}
        </h1>

        {article.originalTitle && article.originalTitle !== article.title && (
          <p className="text-sm text-muted-foreground">{article.originalTitle}</p>
        )}

        {/* メタ情報 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="font-medium">{article.source}</span>
          {article.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(article.publishedAt)}
            </span>
          )}
          {article.readingTimeMin && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              約{article.readingTimeMin}分
            </span>
          )}
        </div>
      </header>

      {/* AI要約 */}
      {article.aiSummary && (
        <section className="rounded-lg border border-border bg-muted/30 p-6">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            AI要約
          </h2>
          <p className="whitespace-pre-line leading-relaxed">
            {article.aiSummary}
          </p>
        </section>
      )}

      {/* 管理者コメント */}
      {article.comment && (
        <section className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <h2 className="mb-3 text-sm font-semibold text-primary">
            編集部コメント
          </h2>
          <p className="whitespace-pre-line leading-relaxed">
            {article.comment}
          </p>
        </section>
      )}

      {/* 原文リンク */}
      <div className="flex justify-center">
        <a
          href={article.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-6 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          原文を読む
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* 広告 */}
      <DisplayAd />

      {/* トップに戻る */}
      <div className="border-t border-border pt-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          記事一覧に戻る
        </Link>
      </div>
    </div>
  );
}
