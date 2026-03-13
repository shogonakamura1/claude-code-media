export const runtime = "edge";

import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { ArticleWithRelations } from "@/lib/db/schema";
import { AdminArticleForm } from "./AdminArticleForm";

interface ArticlesApiResponse {
  ok: boolean;
  articles: ArticleWithRelations[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminArticleEditPage({ params }: Props) {
  const { id } = await params;

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  let article: ArticleWithRelations | undefined;
  const statuses = ["PENDING", "DRAFT", "PUBLISHED", "REJECTED"];
  for (const status of statuses) {
    try {
      const url = new URL("/api/articles", baseUrl);
      url.searchParams.set("status", status);
      url.searchParams.set("limit", "50");
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (res.ok) {
        const data: ArticlesApiResponse = await res.json();
        article = data.articles.find((a) => a.id === id);
        if (article) break;
      }
    } catch {
      // continue to next status
    }
  }

  if (!article) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/articles"
        prefetch={false}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        一覧に戻る
      </Link>

      {/* Original article info (read-only) */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="font-medium">
              {article.originalTitle ?? article.title}
            </p>
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
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span>スコア: {article.score}</span>
          <span>取得: {article.fetchedAt ?? "---"}</span>
        </div>
        {article.aiSummary && (
          <div className="mt-3 rounded border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">AI要約</p>
            {article.aiSummary}
          </div>
        )}
      </div>

      {/* Edit form */}
      <AdminArticleForm article={article} />
    </div>
  );
}
