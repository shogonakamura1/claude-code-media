import Link from "next/link";
import { MOCK_ARTICLES } from "@/lib/mock-data";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-yellow-500 bg-yellow-500/10",
  DRAFT: "text-blue-500 bg-blue-500/10",
  PUBLISHED: "text-emerald-500 bg-emerald-500/10",
  REJECTED: "text-red-500 bg-red-500/10",
};

export default function AdminDashboard() {
  const articles = MOCK_ARTICLES;
  const counts = {
    PENDING: articles.filter((a) => a.status === "PENDING").length,
    DRAFT: articles.filter((a) => a.status === "DRAFT").length,
    PUBLISHED: articles.filter((a) => a.status === "PUBLISHED").length,
    REJECTED: articles.filter((a) => a.status === "REJECTED").length,
  };

  const pending = articles.filter((a) => a.status === "PENDING");
  const recent = [...articles]
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">ダッシュボード</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(["PENDING", "DRAFT", "PUBLISHED", "REJECTED"] as const).map((s) => (
          <div
            key={s}
            className="rounded-lg border border-border bg-card p-4 text-center"
          >
            <div className="text-2xl font-bold">{counts[s]}</div>
            <div
              className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s]}`}
            >
              {s}
            </div>
          </div>
        ))}
      </div>

      {/* PENDING review queue */}
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-yellow-500">
            承認待ち ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((a) => (
              <Link
                key={a.id}
                href={`/admin/articles/${a.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.source}</p>
                </div>
                <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                  レビュー →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent articles */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            最近の記事
          </h2>
          <Link
            href="/admin/articles"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            全て見る →
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  タイトル
                </th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  カテゴリ
                </th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  ステータス
                </th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  スコア
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.map((a, i) => (
                <tr
                  key={a.id}
                  className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/articles/${a.id}`}
                      className="line-clamp-1 hover:text-primary"
                    >
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {a.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status]}`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{a.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick actions */}
      <section className="flex gap-3">
        <Link
          href="/admin/articles/new"
          className="rounded-lg border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          + 記事を手動追加
        </Link>
        <Link
          href="/admin/articles"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          記事一覧を管理
        </Link>
      </section>
    </div>
  );
}
