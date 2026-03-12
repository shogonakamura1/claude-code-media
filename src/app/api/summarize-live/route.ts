import { summarizeArticle } from "@/lib/gemini";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = body as { title?: string; description?: string; url?: string };
    if (!parsed.title || !parsed.url) {
      return Response.json(
        { error: "title and url are required" },
        { status: 400 }
      );
    }

    const title = parsed.title;
    const description = parsed.description ?? "";
    const url = parsed.url;

    const result = await summarizeArticle(title, description, url);

    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
