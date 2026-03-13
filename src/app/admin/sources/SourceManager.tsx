"use client";

import { useState, useEffect, useCallback } from "react";

interface Source {
  id: string;
  url: string;
  type: string;
  priority: string;
  label: string;
  authorType: string;
  isActive: number;
}

interface ApiResponse {
  ok: boolean;
  error?: string;
  sources?: Source[];
  id?: string;
}

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

const TYPES = ["rss", "atom", "hn-api", "reddit-api", "github-atom"];
const PRIORITIES = ["high", "medium", "low"];
const AUTHOR_TYPES = ["official", "influencer", "community", "media"];

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-orange-500/20 text-orange-500",
  medium: "bg-blue-500/20 text-blue-500",
  low: "bg-muted text-muted-foreground",
};

const AUTHOR_TYPE_STYLE: Record<string, string> = {
  official: "bg-green-500/20 text-green-500",
  influencer: "bg-purple-500/20 text-purple-500",
  community: "bg-sky-500/20 text-sky-500",
  media: "bg-yellow-500/20 text-yellow-500",
};

const emptyForm = {
  id: "",
  url: "",
  type: "rss",
  priority: "medium",
  label: "",
  authorType: "community",
};

export function SourceManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Fetch runner state
  const [fetchRunning, setFetchRunning] = useState(false);
  const [fetchResult, setFetchResult] = useState<CronResult | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [token, setToken] = useState("");

  const loadSources = useCallback(async () => {
    try {
      const res = await fetch("/api/sources");
      const data = (await res.json()) as ApiResponse;
      if (data.ok && data.sources) {
        setSources(data.sources);
      } else {
        setError(data.error ?? "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  async function handlePatch(sourceId: string, updates: Partial<Source>) {
    const res = await fetch(`/api/sources/${sourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = (await res.json()) as ApiResponse;
    if (data.ok) {
      setSources((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, ...updates } : s))
      );
    }
  }

  async function handleDelete(source: Source) {
    if (!confirm(`「${source.label}」を削除しますか？`)) return;
    const res = await fetch(`/api/sources/${source.id}`, { method: "DELETE" });
    const data = (await res.json()) as ApiResponse;
    if (data.ok) {
      setSources((prev) => prev.filter((s) => s.id !== source.id));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id || undefined,
          url: form.url,
          type: form.type,
          priority: form.priority,
          label: form.label,
          authorType: form.authorType,
        }),
      });
      const data = (await res.json()) as ApiResponse;
      if (data.ok) {
        setForm(emptyForm);
        setShowForm(false);
        await loadSources();
      } else {
        setError(data.error ?? "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function handleFetch() {
    if (!token.trim()) {
      setFetchError("シークレットトークンを入力してください");
      return;
    }
    setFetchRunning(true);
    setFetchError("");
    setFetchResult(null);
    try {
      const res = await fetch("/api/cron", {
        method: "POST",
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      const data = (await res.json()) as CronResult;
      if (!data.ok) throw new Error(data.error ?? "Unknown error");
      setFetchResult(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
    } finally {
      setFetchRunning(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* ソース一覧 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">フェッチ対象ソース</h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {showForm ? "キャンセル" : "ソースを追加"}
          </button>
        </div>

        {/* 追加フォーム */}
        {showForm && (
          <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">ラベル *</label>
                <input
                  type="text"
                  required
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Simon Willison"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">ID（空欄で自動生成）</label>
                <input
                  type="text"
                  value={form.id}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="simon-willison"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">URL *</label>
              <input
                type="url"
                required
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="https://example.com/feed.xml"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">タイプ</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">優先度</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">著者タイプ</label>
                <select
                  value={form.authorType}
                  onChange={(e) => setForm((f) => ({ ...f, authorType: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {AUTHOR_TYPES.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "保存中..." : "追加"}
              </button>
            </div>
          </form>
        )}

        {/* ソース一覧テーブル */}
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">ソース</th>
                <th className="px-4 py-2 text-left font-medium">タイプ</th>
                <th className="px-4 py-2 text-left font-medium">優先度</th>
                <th className="px-4 py-2 text-left font-medium">著者</th>
                <th className="px-4 py-2 text-center font-medium">有効</th>
                <th className="px-4 py-2 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr
                  key={s.id}
                  className={`border-b border-border last:border-0 ${!s.isActive ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-2">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary"
                    >
                      {s.label}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{s.type}</td>
                  <td className="px-4 py-2">
                    <select
                      value={s.priority}
                      onChange={(e) => handlePatch(s.id, { priority: e.target.value })}
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[s.priority] ?? ""}`}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${AUTHOR_TYPE_STYLE[s.authorType] ?? ""}`}>
                      {s.authorType}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handlePatch(s.id, { isActive: s.isActive ? 0 : 1 })}
                      className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                        s.isActive ? "bg-green-500" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                          s.isActive ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDelete(s)}
                      className="text-xs text-red-500 hover:text-red-400"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
              {sources.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    ソースが登録されていません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 手動フェッチ実行 */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">手動実行</h2>
        <div className="flex items-center gap-3">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="CRON_SECRET トークン"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={handleFetch}
            disabled={fetchRunning || !token.trim()}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {fetchRunning ? "フェッチ中..." : "今すぐフェッチ実行"}
          </button>
        </div>
        {fetchResult && (
          <p className="text-sm text-muted-foreground">
            保存 <span className="font-semibold text-emerald-500">{fetchResult.saved}</span>件
            {" / "}スキップ {fetchResult.skipped}件
            {" / "}フィルタ除外 {fetchResult.filtered}件
          </p>
        )}
      </div>

      {fetchError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {fetchError}
        </p>
      )}

      {fetchResult && (
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
                {fetchResult.summary.map((s, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{s.source}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{s.fetched}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={s.scored > 0 ? "font-semibold text-emerald-500" : "text-muted-foreground"}>
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
                <p className="text-lg font-semibold">{fetchResult.total}</p>
              </div>
              <div>
                <span className="text-muted-foreground">DB保存</span>
                <p className="text-lg font-semibold text-emerald-500">{fetchResult.saved}</p>
              </div>
              <div>
                <span className="text-muted-foreground">要約生成</span>
                <p className="text-lg font-semibold">{fetchResult.summarized}</p>
              </div>
              <div>
                <span className="text-muted-foreground">重複スキップ</span>
                <p className="text-lg font-semibold text-muted-foreground">{fetchResult.skipped}</p>
              </div>
            </div>
          </div>

          {/* エラー一覧 */}
          {fetchResult.errors && fetchResult.errors.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-red-500">エラー ({fetchResult.errors.length}件)</h3>
              {fetchResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-400">{err}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
