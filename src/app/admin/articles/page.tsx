export const runtime = "edge";

import Link from "next/link";
import { headers } from "next/headers";
import type { ArticleWithRelations } from "@/lib/db/schema";
import { ArticleActions } from "./ArticleActions";

interface ArticlesApiResponse {
  ok: boolean;
  articles: ArticleWithRelations[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

interface Props {
  searchParams: Promise<{ status?: string }>;
}

const TABS = [
  { key: "PENDING", label: "承認待ち" },
  { key: "PUBLISHED", label: "公開済" },
] as const;

export default async function AdminArticleList({ searchParams }: Props) {
  const params = await searchParams;
  const filterStatus = params.status === "PUBLISHED" ? "PUBLISHED" : "PENDING";

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  let articles: ArticleWithRelations[] = [];
  let totalCount = 0;
  try {
    const url = new URL("/api/articles", baseUrl);
    url.searchParams.set("limit", "50");
    url.searchParams.set("status", filterStatus);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (res.ok) {
      const data: ArticlesApiResponse = await res.json();
      articles = data.articles;
      totalCount = data.totalCount;
    }
  } catch {
    // fallback to empty
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/articles?status=${tab.key}`}
            prefetch={false}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              filterStatus === tab.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">{totalCount} 件</p>

      {/* Article list */}
      <div className="space-y-2">
        {articles.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <a
                href={a.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="line-clamp-1 text-sm font-medium hover:text-primary hover:underline"
              >
                {a.title}
              </a>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {a.source}
              </p>
            </div>
            <div className="shrink-0">
              <ArticleActions articleId={a.id} status={a.status} />
            </div>
          </div>
        ))}
        {articles.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            記事がありません
          </p>
        )}
      </div>
    </div>
  );
}
