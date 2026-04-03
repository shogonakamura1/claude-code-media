// 詳細要約オンデマンド生成API
// POST /api/summarize-detail - 記事詳細ページ初回アクセス時に呼び出される

import { getDb } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { summarizeArticleDetail } from "@/lib/gemini";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface SummarizeDetailEnv {
  DB: D1Database;
  GEMINI_API_KEY?: string;
}

export async function POST(request: Request) {
  const envVars = getRequestContext().env as SummarizeDetailEnv;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("articleId" in body)) {
    return Response.json({ error: "articleId is required" }, { status: 400 });
  }

  const articleId = (body as { articleId: unknown }).articleId;
  if (typeof articleId !== "string" || articleId.trim() === "") {
    return Response.json(
      { error: "articleId must be a non-empty string" },
      { status: 400 }
    );
  }

  try {
    const db = getDb({ DB: envVars.DB, ADMIN_PASSWORD_HASH: "" });

    const [article] = await db
      .select({
        id: articles.id,
        title: articles.title,
        originalTitle: articles.originalTitle,
        originalUrl: articles.originalUrl,
        comment: articles.comment,
        aiDetailedSummary: articles.aiDetailedSummary,
      })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (!article) {
      return Response.json({ error: "Article not found" }, { status: 404 });
    }

    // 既に詳細要約がある場合はそのまま返す（二重生成防止）
    if (article.aiDetailedSummary) {
      return Response.json({
        ok: true,
        detailedSummary: article.aiDetailedSummary,
        cached: true,
      });
    }

    const detailedSummary = await summarizeArticleDetail(
      article.title,
      article.comment ?? article.originalTitle ?? "",
      article.originalUrl,
      envVars.GEMINI_API_KEY
    );

    await db
      .update(articles)
      .set({
        aiDetailedSummary: detailedSummary,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(articles.id, articleId));

    return Response.json({
      ok: true,
      detailedSummary,
      cached: false,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
