export const runtime = "edge";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { MOCK_ARTICLES, MOCK_FEATURES } from "@/lib/mock-data";
import { AdminArticleForm } from "./AdminArticleForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminArticleEditPage({ params }: Props) {
  const { id } = await params;
  const article = MOCK_ARTICLES.find((a) => a.id === id);

  if (!article) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/articles"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          一覧に戻る
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-muted-foreground">記事編集</span>
      </div>

      {/* Original article info (read-only) */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="font-medium">{article.originalTitle ?? article.title}</p>
            <p className="text-muted-foreground">{article.source}</p>
          </div>
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            原文を確認
          </a>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          自動スコア: {article.score} ／ 取得: {article.fetchedAt ?? "—"}
        </p>
      </div>

      {/* Edit form */}
      <AdminArticleForm article={article} features={MOCK_FEATURES} />
    </div>
  );
}
