import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ArticleWithRelations } from "@/lib/db/schema";

const CATEGORY_COLORS: Record<string, string> = {
  news: "border-orange-500 text-orange-500",
  tips: "border-blue-500 text-blue-500",
  tutorial: "border-emerald-500 text-emerald-500",
  "case-study": "border-purple-500 text-purple-500",
};

const DIFFICULTY_CONFIG: Record<string, { label: string; className: string }> = {
  beginner: { label: "🔰 入門", className: "border-green-500 text-green-500" },
  intermediate: { label: "📗 中級", className: "border-yellow-500 text-yellow-500" },
  advanced: { label: "📕 上級", className: "border-red-500 text-red-500" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

type Props = {
  article: ArticleWithRelations;
};

export function ArticleCard({ article }: Props) {
  const categorySlug = article.category?.slug ?? "";
  const colorClass = CATEGORY_COLORS[categorySlug] ?? "border-muted-foreground text-muted-foreground";

  const difficultyConfig = article.difficulty ? DIFFICULTY_CONFIG[article.difficulty] : undefined;

  return (
    <Card className="gap-3 border-border bg-card transition-colors hover:border-primary/50">
      <CardHeader className="pb-0">
        {/* バッジ行 */}
        <div className="flex flex-wrap gap-1.5">
          {article.category && (
            <Badge
              variant="outline"
              className={`text-xs ${colorClass}`}
            >
              {article.category.name}
            </Badge>
          )}
          {difficultyConfig && (
            <Badge
              variant="outline"
              className={`text-xs ${difficultyConfig.className}`}
            >
              {difficultyConfig.label}
            </Badge>
          )}
          {article.isEssential === 1 && (
            <Badge
              variant="outline"
              className="border-amber-500 text-xs text-amber-500"
            >
              ⭐ 必読
            </Badge>
          )}
        </div>

        {/* タイトル（記事詳細リンク） */}
        <div className="mt-1 flex items-start gap-2">
          <Link
            href={`/articles/${article.slug}`}
            className="line-clamp-2 flex-1 font-semibold leading-snug hover:text-primary"
          >
            {article.title}
          </Link>
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary"
            title="原文を読む"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        {article.originalTitle && article.originalTitle !== article.title && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {article.originalTitle}
          </p>
        )}
      </CardHeader>

      <CardContent className="py-0 pb-4">
        {/* メタ情報 */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{article.source}</span>
          {article.publishedAt && (
            <>
              <span>·</span>
              <span>{formatDate(article.publishedAt)}</span>
            </>
          )}
          {article.features.length > 0 &&
            article.features.map((f) => (
              <span key={f.id} className="flex items-center gap-0.5">
                <span>·</span>
                <span>{f.icon} {f.name}</span>
              </span>
            ))}
        </div>

        {/* AI要約（DBから取得して常時表示） */}
        {article.aiSummary && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {article.aiSummary}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
