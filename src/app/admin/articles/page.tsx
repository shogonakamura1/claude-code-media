export const runtime = "edge";

import Link from "next/link";
import { headers } from "next/headers";
import type { ArticleWithRelations } from "@/lib/db/schema";
import { ArticleActions } from "./ArticleActions";

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

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminArticleList({ searchParams }: Props) {
  const params = await searchParams;
  const filterStatus = params.status ?? "PENDING";

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  let articles: ArticleWithRelations[] = [];
  try {
    const url = new URL("/api/articles", baseUrl);
    url.searchParams.set("limit", "50");
    if (filterStatus !== "all") {
      url.searchParams.set("status", filterStatus);
    }
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (res.ok) {
      const data: ArticlesApiResponse = await res.json();
      articles = data.articles;
    }
  } catch {
    // fallback to empty
  }

  const STATUSES = [
    { key: "PENDING", label: "承認待ち" },
    { key: "DRAFT", label: "下書き" },
    { key: "PUBLISHED", label: "公開済" },
    { key: "REJECTED", label: "却下" },
    { key: "all", label: "すべて" },
  ] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">記事一覧</h1>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s.key}
            href={
              s.key === "all"
                ? "/admin/articles?status=all"
                : `/admin/articles?status=${s.key}`
            }
            prefetch={false}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filterStatus === s.key
                ? "border-primary text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                タイトル
              </th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground sm:table-cell">
                ソース
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                ステータス
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {articles.map((a) => (
              <tr
                key={a.id}
                className="bg-card transition-colors hover:bg-accent/50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/articles/${a.id}`}
                    prefetch={false}
                    className="line-clamp-1 font-medium hover:text-primary"
                  >
                    {a.title}
                  </Link>
                  {a.originalTitle && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {a.originalTitle}
                    </p>
                  )}
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {a.source}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status]}`}
                  >
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ArticleActions articleId={a.id} status={a.status} />
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  記事がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
