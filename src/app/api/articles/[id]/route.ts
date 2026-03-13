import { getDb } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import type { ArticleStatus } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";

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

    const env = getRequestContext().env as { DB: D1Database };
    const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

    const existing = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);

    if (existing.length === 0) {
      return Response.json(
        { ok: false, error: "Article not found" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    };

    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === "PUBLISHED") {
        updates.publishedAt = sql`(datetime('now'))`;
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
