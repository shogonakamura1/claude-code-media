"use client";

import { useEffect, useState } from "react";

interface LazySummaryProps {
  articleId: string;
  fallbackSummary: string | null;
}

export function LazySummary({ articleId, fallbackSummary }: LazySummaryProps) {
  const [detailedSummary, setDetailedSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchDetail() {
      try {
        const res = await fetch("/api/summarize-detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId }),
        });

        if (!res.ok) {
          setError(true);
          return;
        }

        const data = (await res.json()) as {
          ok: boolean;
          detailedSummary?: string;
        };

        if (!cancelled && data.ok && data.detailedSummary) {
          setDetailedSummary(data.detailedSummary);
        } else if (!cancelled) {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  if (loading) {
    return (
      <section className="rounded-lg border border-border bg-muted/30 p-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          AI解説
        </h2>
        {fallbackSummary && (
          <div className="mb-3 whitespace-pre-line leading-relaxed">
            {fallbackSummary}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          詳細解説を生成中...
        </div>
      </section>
    );
  }

  const content = detailedSummary ?? fallbackSummary;

  if (error || !content) {
    if (fallbackSummary) {
      return (
        <section className="rounded-lg border border-border bg-muted/30 p-6">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            AI解説
          </h2>
          <div className="whitespace-pre-line leading-relaxed">
            {fallbackSummary}
          </div>
        </section>
      );
    }
    return null;
  }

  return (
    <section className="rounded-lg border border-border bg-muted/30 p-6">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        AI解説
      </h2>
      <div className="whitespace-pre-line leading-relaxed">{content}</div>
    </section>
  );
}
