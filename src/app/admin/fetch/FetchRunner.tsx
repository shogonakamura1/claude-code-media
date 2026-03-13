"use client";

import { useState } from "react";

interface SourceSummary {
  source: string;
  fetched: number;
  scored: number;
  error?: string;
}

interface CronResult {
  ok: boolean;
  error?: string;
  summary: SourceSummary[];
  total: number;
  saved: number;
  savedIds: string[];
  skipped: number;
  filtered: number;
  summarized: number;
  errors?: string[];
}

export function FetchRunner() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CronResult | null>(null);
  const [error, setError] = useState("");

  async function handleFetch() {
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/cron", { method: "POST" });
      const data = (await res.json()) as CronResult;
      if (!data.ok) throw new Error(data.error ?? "Unknown error");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

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
        {result && (
          <span className="text-sm text-muted-foreground">
            保存 <span className="font-semibold text-emerald-500">{result.saved}</span>件
            {" / "}スキップ {result.skipped}件
            {" / "}フィルタ除外 {result.filtered}件
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {result && (
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
                {result.summary.map((s, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{s.source}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{s.fetched}</td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={
                          s.scored > 0 ? "font-semibold text-emerald-500" : "text-muted-foreground"
                        }
                      >
                        {s.scored}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-red-400">{s.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* DB保存結果 */}
          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <span className="text-muted-foreground">総スコア通過</span>
                <p className="text-lg font-semibold">{result.total}</p>
              </div>
              <div>
                <span className="text-muted-foreground">DB保存</span>
                <p className="text-lg font-semibold text-emerald-500">{result.saved}</p>
              </div>
              <div>
                <span className="text-muted-foreground">要約生成</span>
                <p className="text-lg font-semibold">{result.summarized}</p>
              </div>
              <div>
                <span className="text-muted-foreground">重複スキップ</span>
                <p className="text-lg font-semibold text-muted-foreground">{result.skipped}</p>
              </div>
            </div>
          </div>

          {/* エラー一覧 */}
          {result.errors && result.errors.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-red-500">エラー ({result.errors.length}件)</h3>
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-400">{err}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
