"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

type Props = {
  articleTitle: string;
  articleDescription: string;
  articleUrl: string;
};

export function SummaryToggle({ articleTitle, articleDescription, articleUrl }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleToggle = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);

    // 既に取得済みならAPIを呼ばない
    if (summary) return;

    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/summarize-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: articleTitle,
          description: articleDescription,
          url: articleUrl,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = (await res.json()) as { summary?: string };
      setSummary(data.summary ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            AI要約を生成中...
          </>
        ) : isOpen ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            AI要約を閉じる
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            AI要約を見る
          </>
        )}
      </button>
      {isOpen && !loading && (
        <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">
          {error ? "要約の取得に失敗しました" : summary}
        </p>
      )}
    </div>
  );
}
