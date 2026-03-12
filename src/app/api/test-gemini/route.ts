// 診断用: Gemini API接続テスト（開発環境でのみ使用）
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      status: "error",
      message: "GEMINI_API_KEY is not set in environment variables",
      hint: ".env.local にキーが設定されているか確認してください",
    });
  }

  const masked = apiKey.slice(0, 8) + "..." + apiKey.slice(-4);
  const diagnostics: Record<string, unknown> = {
    keyMasked: masked,
    keyLength: apiKey.length,
    startsWithAIza: apiKey.startsWith("AIza"),
    hasWhitespace: apiKey !== apiKey.trim(),
    hasQuotes: apiKey.includes('"') || apiKey.includes("'"),
    hasNewline: apiKey.includes("\n") || apiKey.includes("\r"),
  };

  // モデル一覧を取得してAPIキーの有効性を確認
  const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(listModelsUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({
        status: "error",
        message: `API key is invalid (HTTP ${res.status})`,
        diagnostics,
        apiResponse: errText.slice(0, 500),
        hint: "Google AI Studio でキーが有効か確認してください。キーがブロックされている可能性があります。新しいキーを作成してみてください。",
      });
    }

    const data = await res.json() as { models?: { name: string }[] };
    const modelNames = (data.models || [])
      .map((m: { name: string }) => m.name)
      .filter((n: string) => n.includes("gemini"))
      .slice(0, 10);

    // generateContent も試す
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const genRes = await fetch(genUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Say hello in one word." }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });

    if (!genRes.ok) {
      const genErr = await genRes.text();
      return NextResponse.json({
        status: "partial",
        message: `Key is valid for listing models, but generateContent failed (HTTP ${genRes.status})`,
        diagnostics,
        availableModels: modelNames,
        generateError: genErr.slice(0, 500),
      });
    }

    return NextResponse.json({
      status: "ok",
      message: "Gemini API is working correctly!",
      diagnostics,
      model,
      availableModels: modelNames,
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      message: `Network error: ${err instanceof Error ? err.message : String(err)}`,
      diagnostics,
    });
  }
}
