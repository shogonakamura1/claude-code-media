export const runtime = "edge";

import Link from "next/link";
import { MOCK_ARTICLES } from "@/lib/mock-data";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-yellow-500 bg-yellow-500/10",
  DRAFT: "text-blue-500 bg-blue-500/10",
  PUBLISHED: "text-emerald-500 bg-emerald-500/10",
  REJECTED: "text-red-500 bg-red-500/10",
};

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminArticleList({ searchParams }: Props) {
  const params = await searchParams;
  const filterStatus = params.status ?? "all";

  const articles = MOCK_ARTICLES.filter(
    (a) => filterStatus === "all" || a.status === filterStatus
  );

  const STATUSES = ["all", "PENDING", "DRAFT", "PUBLISHED", "REJECTED"] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">記事一覧</h1>
        <Link
          href="/admin/articles/new"
          className="rounded-lg border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          + 新規作成
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/articles" : `/admin/articles?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filterStatus === s
                ? "border-primary text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {s === "all" ? "すべて" : s}
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
              <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground md:table-cell">
                スコア
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {articles.map((a) => (
              <tr key={a.id} className="bg-card transition-colors hover:bg-accent/50">
                <td className="px-4 py-3">
                  <p className="line-clamp-1 font-medium">{a.title}</p>
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
                    {a.status}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                  {a.score}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/articles/${a.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    編集
                  </Link>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td
                  colSpan={5}
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
