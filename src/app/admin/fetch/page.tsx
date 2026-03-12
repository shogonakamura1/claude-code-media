import { SOURCES } from "@/lib/fetchers";
import { FetchRunner } from "./FetchRunner";

export default function FetchPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">記事フェッチ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          外部ソースから記事を取得し、スコアリングします。スコア通過記事はPENDINGとしてDBに保存されます（D1接続後）。
        </p>
      </div>

      {/* ソース一覧 */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">フェッチ対象ソース</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">ソース</th>
                <th className="px-4 py-2 text-left font-medium">タイプ</th>
                <th className="px-4 py-2 text-left font-medium">優先度</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary"
                    >
                      {s.label}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{s.type}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.priority === "high"
                          ? "bg-orange-500/20 text-orange-500"
                          : s.priority === "medium"
                          ? "bg-blue-500/20 text-blue-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 実行UI */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">手動実行</h2>
        <FetchRunner />
      </div>
    </div>
  );
}
