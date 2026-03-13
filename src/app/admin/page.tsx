export const runtime = "edge";

import Link from "next/link";
import { headers } from "next/headers";
import type { ArticleWithRelations } from "@/lib/db/schema";
import { ArticleActions } from "./articles/ArticleActions";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-yellow-500 bg-yellow-500/10",
  DRAFT: "text-blue-500 bg-blue-500/10",
  PUBLISHED: "text-emerald-500 bg-emerald-500/10",
  REJECTED: "text-red-500 bg-red-500/10",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "承認待ち",
  DRAFT: "下書き",
  PUBLISHED: "公開済",
  REJECTED: "却下",
};

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

  const [pending, draft, published, rejected] = await Promise.all([
    fetchArticles(baseUrl, "PENDING"),
    fetchArticles(baseUrl, "DRAFT"),
    fetchArticles(baseUrl, "PUBLISHED"),
    fetchArticles(baseUrl, "REJECTED"),
  ]);

  const counts = {
    PENDING: pending.totalCount,
    DRAFT: draft.totalCount,
    PUBLISHED: published.totalCount,
    REJECTED: rejected.totalCount,
  };

  const pendingArticles = pending.articles;

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">ダッシュボード</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(["PENDING", "DRAFT", "PUBLISHED", "REJECTED"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/articles?status=${s}`}
            prefetch={false}
            className="rounded-lg border border-border bg-card p-4 text-center transition-colors hover:border-primary/50"
          >
            <div className="text-2xl font-bold">{counts[s]}</div>
            <div
              className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s]}`}
            >
              {STATUS_LABELS[s]}
            </div>
          </Link>
        ))}
      </div>

      {/* PENDING review queue */}
      {pendingArticles.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-yellow-500">
            承認待ち ({pendingArticles.length})
          </h2>
          <div className="space-y-2">
            {pendingArticles.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <Link
                  href={`/admin/articles/${a.id}`}
                  prefetch={false}
                  className="min-w-0 flex-1 hover:text-primary"
                >
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.source}</p>
                </Link>
                <div className="ml-4 shrink-0">
                  <ArticleActions articleId={a.id} status={a.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="flex gap-3">
        <Link
          href="/admin/articles?status=PENDING"
          prefetch={false}
          className="rounded-lg border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          承認待ちを確認
        </Link>
        <Link
          href="/admin/articles"
          prefetch={false}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          記事一覧を管理
        </Link>
      </section>
    </div>
  );
}
