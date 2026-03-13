import type { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/admin"
            prefetch={false}
            className="font-semibold text-muted-foreground"
          >
            ClaudeNote <span className="text-xs">管理</span>
          </Link>
          <div className="flex gap-4 text-sm">
            <Link
              href="/admin"
              prefetch={false}
              className="text-muted-foreground hover:text-foreground"
            >
              ダッシュボード
            </Link>
            <Link
              href="/admin/articles"
              prefetch={false}
              className="text-muted-foreground hover:text-foreground"
            >
              記事一覧
            </Link>
            <Link
              href="/admin/fetch"
              prefetch={false}
              className="text-muted-foreground hover:text-foreground"
            >
              フェッチ
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
