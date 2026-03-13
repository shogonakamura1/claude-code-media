import { getDb } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

const VALID_TYPES = ["rss", "atom", "hn-api", "reddit-api", "github-atom"] as const;
const VALID_PRIORITIES = ["high", "medium", "low"] as const;
const VALID_AUTHOR_TYPES = ["official", "influencer", "community", "media"] as const;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get("active") === "true";

    const env = getRequestContext().env as { DB: D1Database };
    const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

    let rows;
    if (activeOnly) {
      rows = await db
        .select()
        .from(sources)
        .where(eq(sources.isActive, 1))
        .orderBy(asc(sources.label));
    } else {
      rows = await db
        .select()
        .from(sources)
        .orderBy(asc(sources.label));
    }

    return Response.json({ ok: true, sources: rows });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

interface CreateBody {
  id?: string;
  url: string;
  type: string;
  priority: string;
  label: string;
  authorType: string;
}

export async function POST(request: Request) {
  try {
    const body: CreateBody = await request.json();

    if (!body.url || !body.type || !body.priority || !body.label || !body.authorType) {
      return Response.json(
        { ok: false, error: "Missing required fields: url, type, priority, label, authorType" },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(body.type as typeof VALID_TYPES[number])) {
      return Response.json(
        { ok: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!VALID_PRIORITIES.includes(body.priority as typeof VALID_PRIORITIES[number])) {
      return Response.json(
        { ok: false, error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!VALID_AUTHOR_TYPES.includes(body.authorType as typeof VALID_AUTHOR_TYPES[number])) {
      return Response.json(
        { ok: false, error: `Invalid authorType. Must be one of: ${VALID_AUTHOR_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const id = body.id || body.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const env = getRequestContext().env as { DB: D1Database };
    const db = getDb({ DB: env.DB, ADMIN_PASSWORD_HASH: "" });

    const existing = await db
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.id, id))
      .limit(1);

    if (existing.length > 0) {
      return Response.json(
        { ok: false, error: `Source with id "${id}" already exists` },
        { status: 409 }
      );
    }

    await db.insert(sources).values({
      id,
      url: body.url,
      type: body.type as typeof VALID_TYPES[number],
      priority: body.priority as typeof VALID_PRIORITIES[number],
      label: body.label,
      authorType: body.authorType as typeof VALID_AUTHOR_TYPES[number],
    });

    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
