import { getDb } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { summarizeArticle } from "@/lib/gemini";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface SummarizeEnv {
  DB: D1Database;
  CRON_SECRET?: string;
  GEMINI_API_KEY?: string;
}

export async function POST(request: Request) {
  const envVars = getRequestContext().env as SummarizeEnv;

  // 認証
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? "";

  const cronSecret = envVars.CRON_SECRET;
  if (cronSecret && token !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // リクエストBodyバリデーション
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || !("articleId" in body)) {
      return Response.json(
        { error: "articleId is required" },
        { status: 400 }
      );
    }

    const articleId = (body as { articleId: unknown }).articleId;
    if (typeof articleId !== "string" || articleId.trim() === "") {
      return Response.json(
        { error: "articleId must be a non-empty string" },
        { status: 400 }
      );
    }

    const db = getDb({ DB: envVars.DB, ADMIN_PASSWORD_HASH: "" });

    // 記事取得
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (!article) {
      return Response.json({ error: "Article not found" }, { status: 404 });
    }

    // Gemini要約実行
    const result = await summarizeArticle(
      article.title,
      article.comment ?? article.originalTitle ?? "",
      article.originalUrl,
      envVars.GEMINI_API_KEY
    );

    // DB更新
    await db
      .update(articles)
      .set({
        aiSummary: result.summary,
        difficulty: result.difficulty,
        contentType: result.contentType,
        readingTimeMin: result.readingTimeMin,
        language: result.language,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(articles.id, articleId));

    return Response.json({
      ok: true,
      articleId,
      summary: result,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
