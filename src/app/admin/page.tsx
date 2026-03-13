export const runtime = "edge";

import Link from "next/link";
import { headers } from "next/headers";
import type { ArticleWithRelations } from "@/lib/db/schema";
import { ArticleActions } from "./articles/ArticleActions";

interface ArticlesApiResponse {
  ok: boolean;
  articles: ArticleWithRelations[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

async function fetchArticles(
  baseUrl: string,
  status: string
): Promise<ArticlesApiResponse> {
  try {
    const url = new URL("/api/articles", baseUrl);
    url.searchParams.set("status", status);
    url.searchParams.set("limit", "50");
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {
    // fallback
  }
  return {
    ok: false,
    articles: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
  };
}

export default async function AdminDashboard() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const [pending, published] = await Promise.all([
    fetchArticles(baseUrl, "PENDING"),
    fetchArticles(baseUrl, "PUBLISHED"),
  ]);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/admin/articles?status=PENDING"
          prefetch={false}
          className="rounded-lg border border-border bg-card p-4 text-center transition-colors hover:border-yellow-500/50"
        >
          <div className="text-2xl font-bold">{pending.totalCount}</div>
          <div className="mt-1 text-xs font-medium text-yellow-500">
            承認待ち
          </div>
        </Link>
        <Link
          href="/admin/articles?status=PUBLISHED"
          prefetch={false}
          className="rounded-lg border border-border bg-card p-4 text-center transition-colors hover:border-emerald-500/50"
        >
          <div className="text-2xl font-bold">{published.totalCount}</div>
          <div className="mt-1 text-xs font-medium text-emerald-500">
            公開済
          </div>
        </Link>
      </div>

      {/* Pending review queue */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-yellow-500">
          承認待ち
        </h2>
        {pending.articles.length > 0 ? (
          <div className="space-y-2">
            {pending.articles.map((a) => (
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
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            承認待ちの記事はありません
          </p>
        )}
      </section>
    </div>
  );
}
