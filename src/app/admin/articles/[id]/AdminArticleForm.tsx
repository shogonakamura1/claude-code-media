"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ArticleWithRelations, ArticleStatus } from "@/lib/db/schema";

const CATEGORIES = [
  { id: "cat_news", name: "ニュース", slug: "news" },
  { id: "cat_tips", name: "Tips", slug: "tips" },
  { id: "cat_tutorial", name: "チュートリアル", slug: "tutorial" },
  { id: "cat_case", name: "事例・ハック", slug: "case-study" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "border-yellow-500 text-yellow-500 bg-yellow-500/10",
  DRAFT: "border-blue-500 text-blue-500 bg-blue-500/10",
  PUBLISHED: "border-emerald-500 text-emerald-500 bg-emerald-500/10",
  REJECTED: "border-red-500 text-red-500 bg-red-500/10",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "承認待ち",
  DRAFT: "下書き",
  PUBLISHED: "公開済",
  REJECTED: "却下",
};

interface Props {
  article: ArticleWithRelations;
}

export function AdminArticleForm({ article }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(article.title);
  const [comment, setComment] = useState(article.comment ?? "");
  const [categoryId, setCategoryId] = useState(article.categoryId ?? "");
  const [status, setStatus] = useState<ArticleStatus>(article.status as ArticleStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function save(overrides?: Record<string, unknown>) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          comment,
          categoryId: categoryId || null,
          status,
          ...overrides,
        }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json();
        setError(data.error ?? "保存に失敗しました");
        return;
      }
      setSuccess("保存しました");
      if (overrides?.status) {
        setStatus(overrides.status as ArticleStatus);
      }
      setTimeout(() => setSuccess(""), 2000);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    await save({ status: "PUBLISHED" });
  }

  async function handleReject() {
    await save({ status: "REJECTED" });
  }

  const isPendingOrDraft = status === "PENDING" || status === "DRAFT";

  return (
    <div className="space-y-6">
      {/* Feedback messages */}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-500">
          {success}
        </p>
      )}

      {/* Status badge + quick actions */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_COLORS[status]}`}
        >
          {STATUS_LABELS[status] ?? status}
        </span>
        {isPendingOrDraft && (
          <>
            <button
              onClick={handlePublish}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "処理中..." : "公開する"}
            </button>
            <button
              onClick={handleReject}
              disabled={saving}
              className="rounded-lg bg-red-600/10 px-4 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-600/20 disabled:opacity-50"
            >
              却下
            </button>
          </>
        )}
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
            rows={4}
            placeholder="この記事についての解説・コメントを入力..."
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={() => save()}
        disabled={saving}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? "保存中..." : "保存"}
      </button>
    </div>
  );
}
