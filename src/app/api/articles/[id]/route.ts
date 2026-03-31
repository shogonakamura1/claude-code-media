import { getDb } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import type { ArticleStatus } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { summarizeArticle } from "@/lib/gemini";

export const runtime = "edge";

const VALID_STATUSES: ArticleStatus[] = [
  "PENDING",
  "DRAFT",
  "PUBLISHED",
  "REJECTED",
];

interface PatchBody {
  status?: ArticleStatus;
  title?: string;
  comment?: string;
  categoryId?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: PatchBody = await request.json();

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return Response.json(
        { ok: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const env = getRequestContext().env as { DB: D1Database; GEMINI_API_KEY?: string };
    const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

    const existing = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);

    if (existing.length === 0) {
      return Response.json(
        { ok: false, error: "Article not found" },
        { status: 404 }
      );
    }

    const article = existing[0];
    const updates: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    };

    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === "PUBLISHED") {
        updates.publishedAt = sql`(datetime('now'))`;

        // 未要約の記事を公開する場合、Gemini要約を実行
        if (!article.aiSummary && article.originalUrl) {
          try {
            const geminiData = await summarizeArticle(
              article.title,
              article.aiSummary ?? "",
              article.originalUrl,
              env.GEMINI_API_KEY
            );

            if (geminiData) {
              updates.aiSummary = geminiData.summary;
              updates.aiDetailedSummary = geminiData.detailedSummary;
              updates.difficulty = geminiData.difficulty;
              updates.contentType = geminiData.contentType;
              updates.readingTimeMin = geminiData.readingTimeMin;
              updates.language = geminiData.language;

              // 日本語以外の記事はタイトルを翻訳
              if (geminiData.language !== "ja" && geminiData.titleJa) {
                updates.originalTitle = article.title;
                updates.title = geminiData.titleJa;
              }

              // categoryIdマッピング
              const categoryMap: Record<string, string> = {
                news: "cat_news",
                tips: "cat_tips",
                tutorial: "cat_tutorial",
                "case-study": "cat_case",
              };
              if (geminiData.contentType && categoryMap[geminiData.contentType]) {
                updates.categoryId = categoryMap[geminiData.contentType];
              }
            }
          } catch {
            // 要約失敗でも公開は続行
          }
        }
      }
    }
    if (body.title !== undefined) updates.title = body.title;
    if (body.comment !== undefined) updates.comment = body.comment;
    if (body.categoryId !== undefined) updates.categoryId = body.categoryId;

    await db.update(articles).set(updates).where(eq(articles.id, id));

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
