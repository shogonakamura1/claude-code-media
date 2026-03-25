"use client";

import { useState } from "react";

interface Improvement {
  id: string;
  articleId: string;
  type: string;
  currentValue: string | null;
  suggestedValue: string;
  reason: string;
  priority: string;
  status: string;
  articleTitle: string | null;
}

export interface SeoMetricsData {
  summary: {
    totalClicks: number;
    totalImpressions: number;
    avgPosition: number;
    avgCtr: string;
  };
  pages: Array<{
    slug: string;
    title: string | null;
    totalClicks: number;
    totalImpressions: number;
    avgPosition: number;
    avgCtr: string;
  }>;
  queries: Array<{
    query: string;
    totalClicks: number;
    totalImpressions: number;
  }>;
  improvements: Improvement[];
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-500/10 text-red-500",
    medium: "bg-yellow-500/10 text-yellow-500",
    low: "bg-gray-500/10 text-gray-400",
  };
  const labels: Record<string, string> = {
    high: "高",
    medium: "中",
    low: "低",
  };

  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colors[priority] ?? colors.medium}`}
    >
      {labels[priority] ?? priority}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    title: "タイトル",
    description: "説明文",
    content: "コンテンツ",
    internal_link: "内部リンク",
  };

  return (
    <span className="inline-block rounded bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-400">
      {labels[type] ?? type}
    </span>
  );
}

function ImprovementCard({
  imp,
  onAction,
}: {
  imp: Improvement;
  onAction: (id: string, action: "apply" | "reject") => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: "apply" | "reject") => {
    setLoading(true);
    await onAction(imp.id, action);
    setLoading(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <PriorityBadge priority={imp.priority} />
        <TypeBadge type={imp.type} />
        <span className="text-xs text-muted-foreground truncate flex-1">
          {imp.articleTitle ?? imp.articleId}
        </span>
      </div>

      {imp.currentValue && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">現在:</div>
          <div className="text-sm text-red-400 line-through">
            {imp.currentValue}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs text-muted-foreground mb-1">提案:</div>
        <div className="text-sm text-emerald-400 font-medium">
          {imp.suggestedValue}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{imp.reason}</div>

      <div className="flex gap-2">
        <button
          onClick={() => handleAction("apply")}
          disabled={loading}
          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          適用
        </button>
        <button
          onClick={() => handleAction("reject")}
          disabled={loading}
          className="rounded bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-50"
        >
          却下
        </button>
      </div>
    </div>
  );
}

export function SeoDashboardClient({
  initialData,
}: {
  initialData: SeoMetricsData | null;
}) {
  const [data, setData] = useState(initialData);
  const [collecting, setCollecting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [message, setMessage] = useState("");

  const handleCollect = async () => {
    setCollecting(true);
    setMessage("");
    try {
      const res = await fetch("/api/seo/collect", {
        method: "POST",
        headers: { Authorization: "Bearer " },
      });
      const result = (await res.json()) as { ok: boolean; fetched?: number; saved?: number; error?: string };
      if (result.ok) {
        setMessage(
          `データ収集完了: ${result.fetched ?? 0}件取得, ${result.saved ?? 0}件保存`
        );
        refreshData();
      } else {
        setMessage(`エラー: ${result.error ?? "不明"}`);
      }
    } catch (err) {
      setMessage(`通信エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
    setCollecting(false);
  };

  const handleSuggest = async () => {
    setSuggesting(true);
    setMessage("");
    try {
      const res = await fetch("/api/seo/suggest", {
        method: "POST",
        headers: { Authorization: "Bearer " },
      });
      const result = (await res.json()) as { ok: boolean; issuesDetected?: number; suggestionsGenerated?: number; error?: string };
      if (result.ok) {
        setMessage(
          `分析完了: ${result.issuesDetected ?? 0}件の問題検出, ${result.suggestionsGenerated ?? 0}件の提案生成`
        );
        refreshData();
      } else {
        setMessage(`エラー: ${result.error ?? "不明"}`);
      }
    } catch (err) {
      setMessage(`通信エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
    setSuggesting(false);
  };

  const handleImprovementAction = async (
    id: string,
    action: "apply" | "reject"
  ) => {
    try {
      const res = await fetch("/api/seo/improvements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const result = (await res.json()) as { ok: boolean };
      if (result.ok) {
        setMessage(
          action === "apply" ? "改善を適用しました" : "提案を却下しました"
        );
        refreshData();
      }
    } catch (err) {
      setMessage(`エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const refreshData = async () => {
    try {
      const res = await fetch("/api/seo/metrics?days=7");
      const result = (await res.json()) as SeoMetricsData & { ok: boolean };
      if (result.ok) setData(result);
    } catch {
      // silent
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={handleCollect}
            disabled={collecting}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {collecting ? "収集中..." : "データ収集を実行"}
          </button>
        </div>
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
        <p className="py-8 text-center text-sm text-muted-foreground">
          SEOデータがまだありません。データ収集を実行してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* アクションボタン */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleCollect}
          disabled={collecting}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {collecting ? "収集中..." : "Search Console取得"}
        </button>
        <button
          onClick={handleSuggest}
          disabled={suggesting}
          className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {suggesting ? "分析中..." : "AI改善提案を生成"}
        </button>
      </div>

      {message && (
        <p className="rounded bg-card border border-border px-3 py-2 text-sm">
          {message}
        </p>
      )}

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <div className="text-2xl font-bold">{data.summary.totalClicks}</div>
          <div className="mt-1 text-xs text-muted-foreground">クリック数</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <div className="text-2xl font-bold">
            {data.summary.totalImpressions}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">表示回数</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <div className="text-2xl font-bold">{data.summary.avgCtr}%</div>
          <div className="mt-1 text-xs text-muted-foreground">平均CTR</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <div className="text-2xl font-bold">
            {data.summary.avgPosition > 0
              ? data.summary.avgPosition.toFixed(1)
              : "-"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">平均順位</div>
        </div>
      </div>

      {/* AI改善提案 */}
      {data.improvements.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-purple-400">
            AI改善提案（{data.improvements.length}件）
          </h2>
          <div className="space-y-3">
            {data.improvements.map((imp) => (
              <ImprovementCard
                key={imp.id}
                imp={imp}
                onAction={handleImprovementAction}
              />
            ))}
          </div>
        </section>
      )}

      {/* ページ別パフォーマンス */}
      {data.pages.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
            ページ別パフォーマンス
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">ページ</th>
                  <th className="pb-2 pr-4 text-right">クリック</th>
                  <th className="pb-2 pr-4 text-right">表示</th>
                  <th className="pb-2 pr-4 text-right">CTR</th>
                  <th className="pb-2 text-right">順位</th>
                </tr>
              </thead>
              <tbody>
                {data.pages.map((page) => (
                  <tr
                    key={page.slug}
                    className="border-b border-border/50"
                  >
                    <td className="py-2 pr-4">
                      <div className="max-w-[200px] truncate">
                        {page.title ?? page.slug}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {page.totalClicks}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {page.totalImpressions}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {page.avgCtr}%
                    </td>
                    <td className="py-2 text-right font-mono">
                      {page.avgPosition.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 人気検索クエリ */}
      {data.queries.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-400">
            検索クエリ
          </h2>
          <div className="space-y-1">
            {data.queries.map((q) => (
              <div
                key={q.query}
                className="flex items-center justify-between rounded px-3 py-2 text-sm hover:bg-card"
              >
                <span className="truncate">{q.query}</span>
                <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                  {q.totalClicks}クリック / {q.totalImpressions}表示
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
