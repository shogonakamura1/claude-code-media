"use client";

import { useState } from "react";
import type { ArticleWithRelations, Feature } from "@/lib/db/schema";

const CATEGORIES = [
  { id: "cat_news", name: "ニュース", slug: "news" },
  { id: "cat_tips", name: "Tips", slug: "tips" },
  { id: "cat_tutorial", name: "チュートリアル", slug: "tutorial" },
  { id: "cat_case", name: "事例・ハック", slug: "case-study" },
];

const STATUSES = ["PENDING", "DRAFT", "PUBLISHED", "REJECTED"] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "border-yellow-500 text-yellow-500 bg-yellow-500/10",
  DRAFT: "border-blue-500 text-blue-500 bg-blue-500/10",
  PUBLISHED: "border-emerald-500 text-emerald-500 bg-emerald-500/10",
  REJECTED: "border-red-500 text-red-500 bg-red-500/10",
};

interface Props {
  article: ArticleWithRelations;
  features: (Feature & { articleCount: number })[];
}

export function AdminArticleForm({ article, features }: Props) {
  const [title, setTitle] = useState(article.title);
  const [comment, setComment] = useState(article.comment ?? "");
  const [categoryId, setCategoryId] = useState(article.categoryId ?? "");
  const [status, setStatus] = useState<typeof STATUSES[number]>(article.status as typeof STATUSES[number]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(
    article.features.map((f) => f.id)
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggleFeature(id: string) {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setSaving(true);
    // TODO: D1接続後にAPI Route経由で保存
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handlePublish() {
    setStatus("PUBLISHED");
    await handleSave();
  }

  async function handleReject() {
    setStatus("REJECTED");
    await handleSave();
  }

  return (
    <div className="space-y-6">
      {/* Status badge + quick actions */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_COLORS[status]}`}
        >
          {status}
        </span>
        {status === "PENDING" || status === "DRAFT" ? (
          <>
            <button
              onClick={handlePublish}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              公開する
            </button>
            <button
              onClick={handleReject}
              className="rounded-lg bg-red-600/10 px-4 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-600/20"
            >
              却下
            </button>
          </>
        ) : null}
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">日本語タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">カテゴリ</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">選択してください</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">ステータス</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof STATUSES[number])}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Features */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">関連機能</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {features.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleFeature(f.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  selectedFeatures.includes(f.id)
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            編集コメント{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (Markdown可)
            </span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={5}
            placeholder="この記事についての解説・コメントを入力..."
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-500">保存しました ✓</span>
        )}
      </div>
    </div>
  );
}
