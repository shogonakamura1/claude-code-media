// 改善提案のステータス更新API
// PATCH /api/seo/improvements - 承認/却下/適用

import { getRequestContext } from "@cloudflare/next-on-pages";
import { getDb } from "@/lib/db";
import { seoImprovements, articles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function PATCH(request: Request) {
  const env = getRequestContext().env as { DB: D1Database; CRON_SECRET?: string };

  const body = await request.json() as {
    id: string;
    action: "approve" | "reject" | "apply";
  };

  if (!body.id || !body.action) {
    return Response.json(
      { ok: false, error: "id と action が必要です" },
      { status: 400 }
    );
  }

  const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

  try {
    // 改善提案を取得
    const improvement = await db
      .select()
      .from(seoImprovements)
      .where(eq(seoImprovements.id, body.id))
      .limit(1);

    if (improvement.length === 0) {
      return Response.json(
        { ok: false, error: "改善提案が見つかりません" },
        { status: 404 }
      );
    }

    const imp = improvement[0];

    if (body.action === "reject") {
      await db
        .update(seoImprovements)
        .set({ status: "rejected" })
        .where(eq(seoImprovements.id, body.id));

      return Response.json({ ok: true, status: "rejected" });
    }

    if (body.action === "approve") {
      await db
        .update(seoImprovements)
        .set({ status: "approved" })
        .where(eq(seoImprovements.id, body.id));

      return Response.json({ ok: true, status: "approved" });
    }

    if (body.action === "apply") {
      // 実際に記事に反映する
      if (imp.type === "title" && imp.suggestedValue) {
        // 対象記事が存在するか確認
        const [targetArticle] = await db
          .select({ id: articles.id, title: articles.title })
          .from(articles)
          .where(eq(articles.id, imp.articleId))
          .limit(1);

        if (!targetArticle) {
          return Response.json(
            { ok: false, error: `記事が見つかりません: ${imp.articleId}` },
            { status: 404 }
          );
        }

        await db
          .update(articles)
          .set({
            title: imp.suggestedValue,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(articles.id, imp.articleId));

        // 適用後に検証
        const [updated] = await db
          .select({ title: articles.title })
          .from(articles)
          .where(eq(articles.id, imp.articleId))
          .limit(1);

        if (!updated || updated.title !== imp.suggestedValue) {
          return Response.json(
            { ok: false, error: "タイトルの更新に失敗しました" },
            { status: 500 }
          );
        }
      }

      await db
        .update(seoImprovements)
        .set({
          status: "applied",
          appliedAt: new Date().toISOString(),
        })
        .where(eq(seoImprovements.id, body.id));

      return Response.json({ ok: true, status: "applied" });
    }

    return Response.json(
      { ok: false, error: "不正なアクション" },
      { status: 400 }
    );
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
