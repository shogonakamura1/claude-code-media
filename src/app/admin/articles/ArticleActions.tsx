"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  articleId: string;
  status: string;
}

export function ArticleActions({ articleId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(newStatus: string) {
    setLoading(true);
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
      setLoading(false);
    }
  }

  if (status === "PENDING" || status === "DRAFT") {
    return (
      <button
        onClick={() => updateStatus("PUBLISHED")}
        disabled={loading}
        className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? "..." : "公開"}
      </button>
    );
  }

  if (status === "PUBLISHED") {
    return (
      <button
        onClick={() => updateStatus("PENDING")}
        disabled={loading}
        className="rounded bg-zinc-600/10 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-600/20 disabled:opacity-50"
      >
        {loading ? "..." : "非公開"}
      </button>
    );
  }

  return null;
}
