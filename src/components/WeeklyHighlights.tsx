import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SummaryToggle } from "@/components/SummaryToggle";
import type { ArticleWithRelations } from "@/lib/db/schema";

const CATEGORY_COLORS: Record<string, string> = {
  news: "border-orange-500 text-orange-500",
  tips: "border-blue-500 text-blue-500",
  tutorial: "border-emerald-500 text-emerald-500",
  "case-study": "border-purple-500 text-purple-500",
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
  articles: ArticleWithRelations[];
};

export function WeeklyHighlights({ articles }: Props) {
  if (articles.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article, index) => {
        const categorySlug = article.category?.slug ?? "";
        const colorClass =
          CATEGORY_COLORS[categorySlug] ??
          "border-muted-foreground text-muted-foreground";
        return (
          <Card
            key={article.id}
            className="relative gap-3 border-primary/20 bg-card transition-colors hover:border-primary/50"
          >
            {index === 0 && (
              <div className="absolute -top-2 -right-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                #1
              </div>
            )}
            <CardHeader className="pb-0">
              <div className="flex items-start gap-2">
                {article.category && (
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${colorClass}`}
                  >
                    {article.category.name}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  スコア {article.score}
                </span>
              </div>
              <a
                href={article.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 line-clamp-2 text-base font-semibold leading-snug hover:text-primary"
              >
                {article.title}
                <ExternalLink className="ml-1 inline h-3.5 w-3.5 align-text-top" />
              </a>
              {article.originalTitle && article.originalTitle !== article.title && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {article.originalTitle}
                </p>
              )}
            </CardHeader>

            <CardContent className="py-0">
              <SummaryToggle
                articleTitle={article.title}
                articleDescription={article.comment ?? ""}
                articleUrl={article.originalUrl}
              />

              <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>{article.source}</span>
                {article.publishedAt && (
                  <>
                    <span>·</span>
                    <span>{formatDate(article.publishedAt)}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
