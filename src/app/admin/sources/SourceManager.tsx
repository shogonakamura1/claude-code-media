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

  async function handleToggleActive(source: Source) {
    const newActive = source.isActive ? 0 : 1;
    const res = await fetch(`/api/sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: newActive }),
    });
    const data = (await res.json()) as ApiResponse;
    if (data.ok) {
      setSources((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, isActive: newActive } : s))
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

  if (loading) {
    return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* 追加ボタン */}
      <div className="flex justify-end">
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
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[s.priority] ?? ""}`}>
                    {s.priority}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${AUTHOR_TYPE_STYLE[s.authorType] ?? ""}`}>
                    {s.authorType}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => handleToggleActive(s)}
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
  );
}
