import { getDb } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface BackfillEnv {
  DB: D1Database;
  CRON_SECRET?: string;
}

/**
 * 日本語を含むスラッグをASCII-onlyに変換するバッチAPI
 * POST /api/backfill-slug
 */
function generateAsciiSlug(title: string, id: string): string {
  const ascii = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  if (ascii.length < 8) {
    const shortId = id.replace("art_", "").slice(0, 12);
    return ascii ? `${ascii}-${shortId}` : shortId;
  }
  return ascii;
}

function hasNonAscii(str: string): boolean {
  return /[^\x00-\x7F]/.test(str);
}

export async function POST(request: Request) {
  const envVars = getRequestContext().env as BackfillEnv;

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? "";
  if (envVars.CRON_SECRET && token !== envVars.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb({ DB: envVars.DB, ADMIN_PASSWORD_HASH: "" });

    const allArticles = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        originalTitle: articles.originalTitle,
      })
      .from(articles);

    const needsFix = allArticles.filter((a) => hasNonAscii(a.slug));

    if (needsFix.length === 0) {
      return Response.json({
        ok: true,
        message: "No articles with non-ASCII slugs",
        total: allArticles.length,
        fixed: 0,
      });
    }

    let fixed = 0;
    const changes: Array<{ id: string; oldSlug: string; newSlug: string }> = [];
    const errors: string[] = [];

    // 既存のASCIIスラッグを収集して重複回避
    const existingSlugs = new Set(
      allArticles.filter((a) => !hasNonAscii(a.slug)).map((a) => a.slug)
    );

    for (const item of needsFix) {
      try {
        // originalTitle（英語）があればそれを優先、なければtitleを使う
        const baseTitle = item.originalTitle ?? item.title;
        let newSlug = generateAsciiSlug(baseTitle, item.id);

        // 重複回避: suffixを付与
        let attempt = 0;
        let candidate = newSlug;
        while (existingSlugs.has(candidate)) {
          attempt++;
          candidate = `${newSlug}-${attempt}`;
        }
        newSlug = candidate;

        await db
          .update(articles)
          .set({
            slug: newSlug,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(articles.id, item.id));

        existingSlugs.add(newSlug);
        changes.push({ id: item.id, oldSlug: item.slug, newSlug });
        fixed++;
      } catch (err) {
        errors.push(
          `${item.id}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return Response.json({
      ok: true,
      total: allArticles.length,
      needsFix: needsFix.length,
      fixed,
      changes,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
