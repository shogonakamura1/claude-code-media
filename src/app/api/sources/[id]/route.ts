import { getDb } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

const VALID_TYPES = ["rss", "atom", "hn-api", "reddit-api", "github-atom"] as const;
const VALID_PRIORITIES = ["high", "medium", "low"] as const;
const VALID_AUTHOR_TYPES = ["official", "influencer", "community", "media"] as const;

interface PatchBody {
  url?: string;
  type?: string;
  priority?: string;
  label?: string;
  authorType?: string;
  isActive?: number;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: PatchBody = await request.json();

    if (body.type && !VALID_TYPES.includes(body.type as typeof VALID_TYPES[number])) {
      return Response.json(
        { ok: false, error: `Invalid type` },
        { status: 400 }
      );
    }

    if (body.priority && !VALID_PRIORITIES.includes(body.priority as typeof VALID_PRIORITIES[number])) {
      return Response.json(
        { ok: false, error: `Invalid priority` },
        { status: 400 }
      );
    }

    if (body.authorType && !VALID_AUTHOR_TYPES.includes(body.authorType as typeof VALID_AUTHOR_TYPES[number])) {
      return Response.json(
        { ok: false, error: `Invalid authorType` },
        { status: 400 }
      );
    }

    const env = getRequestContext().env as { DB: D1Database };
    const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

    const existing = await db
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.id, id))
      .limit(1);

    if (existing.length === 0) {
      return Response.json(
        { ok: false, error: "Source not found" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    };

    if (body.url !== undefined) updates.url = body.url;
    if (body.type !== undefined) updates.type = body.type;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.label !== undefined) updates.label = body.label;
    if (body.authorType !== undefined) updates.authorType = body.authorType;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    await db.update(sources).set(updates).where(eq(sources.id, id));

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const env = getRequestContext().env as { DB: D1Database };
    const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

    const existing = await db
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.id, id))
      .limit(1);

    if (existing.length === 0) {
      return Response.json(
        { ok: false, error: "Source not found" },
        { status: 404 }
      );
    }

    await db.delete(sources).where(eq(sources.id, id));

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
