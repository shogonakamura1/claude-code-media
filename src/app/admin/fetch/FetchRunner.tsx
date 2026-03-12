"use client";

import { useState } from "react";
import type { FetchResult } from "@/lib/fetchers";
import type { ScoredItem } from "@/lib/fetchers/types";

export function FetchRunner() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<FetchResult[] | null>(null);
  const [error, setError] = useState("");

  async function handleFetch() {
    setRunning(true);
    setError("");
    setResults(null);
    try {
      const res = await fetch("/api/cron");
      const data = await res.json() as {
        ok: boolean;
        error?: string;
        summary: { source: string; fetched: number; scored: number; error?: string }[];
        articles: ScoredItem[];
      };
      if (!data.ok) throw new Error(data.error ?? "Unknown error");
      setResults(data.summary.map((s, i) => ({
        sourceId: String(i),
        label: s.source,
        fetched: s.fetched,
        scored: data.articles.filter((a) => a.source === s.source),
        error: s.error,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  const totalScored = results?.reduce((s, r) => s + r.scored.length, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={handleFetch}
          disabled={running}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {running ? "フェッチ中..." : "今すぐフェッチ実行"}
        </button>
        {results && (
          <span className="text-sm text-muted-foreground">
            合計 <span className="font-semibold text-foreground">{totalScored}</span> 件スコア通過
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {results && (
        <>
          {/* ソース別サマリー */}
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">ソース</th>
                  <th className="px-4 py-2 text-right font-medium">取得</th>
                  <th className="px-4 py-2 text-right font-medium">スコア通過</th>
                  <th className="px-4 py-2 text-left font-medium">エラー</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.sourceId} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{r.label}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{r.fetched}</td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={
                          r.scored.length > 0 ? "font-semibold text-emerald-500" : "text-muted-foreground"
                        }
                      >
                        {r.scored.length}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-red-400">{r.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* スコア通過記事一覧 */}
          {totalScored > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                スコア通過記事 ({totalScored}件)
              </h2>
              <div className="space-y-2">
                {results.flatMap((r) =>
                  r.scored.map((item, idx) => (
                    <div
                      key={`${r.sourceId}-${idx}`}
                      className="rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:text-primary"
                        >
                          {item.title}
                        </a>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                            item.score >= 15
                              ? "bg-orange-500/20 text-orange-500"
                              : item.score >= 8
                              ? "bg-blue-500/20 text-blue-500"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {item.score}pt
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground">{item.source}</span>
                        {item.matchedKeywords.map((kw) => (
                          <span
                            key={kw}
                            className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
