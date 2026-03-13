"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  articleId: string;
  status: string;
}

export function ArticleActions({ articleId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(newStatus: string) {
    setLoading(newStatus);
    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  if (status !== "PENDING" && status !== "DRAFT") {
    return null;
  }

  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => updateStatus("PUBLISHED")}
        disabled={loading !== null}
        className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading === "PUBLISHED" ? "..." : "公開"}
      </button>
      <button
        onClick={() => updateStatus("REJECTED")}
        disabled={loading !== null}
        className="rounded bg-red-600/10 px-2.5 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-600/20 disabled:opacity-50"
      >
        {loading === "REJECTED" ? "..." : "却下"}
      </button>
    </div>
  );
}
