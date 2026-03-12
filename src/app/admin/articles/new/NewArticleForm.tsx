"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Feature } from "@/lib/db/schema";

const CATEGORIES = [
  { id: "cat_news", name: "ニュース" },
  { id: "cat_tips", name: "Tips" },
  { id: "cat_tutorial", name: "チュートリアル" },
  { id: "cat_case", name: "事例・ハック" },
];

interface Props {
  features: (Feature & { articleCount: number })[];
}

export function NewArticleForm({ features }: Props) {
  const router = useRouter();
  const [originalUrl, setOriginalUrl] = useState("");
  const [title, setTitle] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [comment, setComment] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleFeature(id: string) {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!originalUrl || !title) {
      setError("URLと日本語タイトルは必須です");
      return;
    }
    setSaving(true);
    setError("");
    // TODO: D1接続後にAPI Route経由で保存
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    router.push("/admin/articles");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {/* URL */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          原文URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Title (JP) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          日本語タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="日本語でのタイトルを入力"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Title (EN) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          原文タイトル{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (任意)
          </span>
        </label>
        <input
          type="text"
          value={originalTitle}
          onChange={(e) => setOriginalTitle(e.target.value)}
          placeholder="Original title in English"
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

      {/* Status */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">公開設定</label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="status"
            value="DRAFT"
            checked={status === "DRAFT"}
            onChange={() => setStatus("DRAFT")}
            className="accent-primary"
          />
          下書き
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="status"
            value="PUBLISHED"
            checked={status === "PUBLISHED"}
            onChange={() => setStatus("PUBLISHED")}
            className="accent-primary"
          />
          即時公開
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
