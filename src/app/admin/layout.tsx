import type { ReactNode } from "react";

// 管理画面は独自レイアウト（公開ヘッダーなし）
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-semibold text-muted-foreground">
            ClaudeNote <span className="text-xs">管理</span>
          </span>
          <div className="flex gap-4 text-sm">
            <a href="/admin" className="text-muted-foreground hover:text-foreground">
              ダッシュボード
            </a>
            <a href="/admin/articles" className="text-muted-foreground hover:text-foreground">
              記事一覧
            </a>
            <a href="/admin/articles/new" className="text-muted-foreground hover:text-foreground">
              新規作成
            </a>
            <a href="/admin/fetch" className="text-muted-foreground hover:text-foreground">
              フェッチ
            </a>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
