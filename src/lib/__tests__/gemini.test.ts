import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { summarizeArticle, sleep } from "../gemini";

// globalThis.fetch をモック
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("GEMINI_API_KEY", "test-api-key-123");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function geminiSuccessResponse(result: Record<string, unknown>) {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(result) }],
          },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

describe("summarizeArticle", () => {
  it("正常系: Gemini APIの応答を正しくパースする", async () => {
    const geminiResult = {
      summary: "Claude Codeの新機能についての記事です。",
      difficulty: "beginner",
      contentType: "news",
      readingTimeMin: 3,
      language: "ja",
    };
    mockFetch.mockResolvedValueOnce(geminiSuccessResponse(geminiResult));

    const result = await summarizeArticle(
      "Claude Code Update",
      "New features released",
      "https://example.com/article"
    );

    expect(result.summary).toBe(geminiResult.summary);
    expect(result.difficulty).toBe("beginner");
    expect(result.contentType).toBe("news");
    expect(result.readingTimeMin).toBe(3);
    expect(result.language).toBe("ja");
  });

  it("APIキーがない場合はエラーを投げる", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    // process.env.GEMINI_API_KEY が falsy
    // ただし空文字はtruthyではないのでエラーになるはず
    // 実装を確認: if (!apiKey) throw
    await expect(
      summarizeArticle("title", "desc", "url")
    ).rejects.toThrow("GEMINI_API_KEY is not set");
  });

  it("Gemini APIがエラーを返した場合はエラーを投げる", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Rate limited", { status: 429 })
    );

    await expect(
      summarizeArticle("title", "desc", "url")
    ).rejects.toThrow("Gemini API error 429");
  });

  it("Gemini APIが空の応答を返した場合はエラーを投げる", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ candidates: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      summarizeArticle("title", "desc", "url")
    ).rejects.toThrow("Gemini returned empty response");
  });

  it("レスポンスに必須フィールドが欠けている場合はエラーを投げる", async () => {
    const incomplete = { summary: "something" }; // difficulty, contentType 欠落
    mockFetch.mockResolvedValueOnce(geminiSuccessResponse(incomplete));

    await expect(
      summarizeArticle("title", "desc", "url")
    ).rejects.toThrow("Gemini response missing required fields");
  });

  it("readingTimeMinが未設定の場合はデフォルト5を返す", async () => {
    const geminiResult = {
      summary: "テスト要約",
      difficulty: "intermediate",
      contentType: "tutorial",
      language: "ja",
      // readingTimeMin なし
    };
    mockFetch.mockResolvedValueOnce(geminiSuccessResponse(geminiResult));

    const result = await summarizeArticle("title", "desc", "url");
    expect(result.readingTimeMin).toBe(5);
  });

  it("languageが未設定の場合はデフォルト'ja'を返す", async () => {
    const geminiResult = {
      summary: "テスト要約",
      difficulty: "advanced",
      contentType: "case-study",
      readingTimeMin: 10,
      // language なし
    };
    mockFetch.mockResolvedValueOnce(geminiSuccessResponse(geminiResult));

    const result = await summarizeArticle("title", "desc", "url");
    expect(result.language).toBe("ja");
  });

  it("英語記事の場合titleJaを返す", async () => {
    const geminiResult = {
      summary: "Claude Codeの新機能について",
      difficulty: "beginner",
      contentType: "news",
      readingTimeMin: 3,
      language: "en",
      titleJa: "Claude Codeの最新アップデート",
    };
    mockFetch.mockResolvedValueOnce(geminiSuccessResponse(geminiResult));

    const result = await summarizeArticle("Claude Code Update", "New features", "https://example.com");
    expect(result.titleJa).toBe("Claude Codeの最新アップデート");
    expect(result.language).toBe("en");
  });

  it("日本語記事の場合titleJaは含まれない", async () => {
    const geminiResult = {
      summary: "Claude Codeの新機能について",
      difficulty: "beginner",
      contentType: "news",
      readingTimeMin: 3,
      language: "ja",
      // titleJa なし（日本語記事）
    };
    mockFetch.mockResolvedValueOnce(geminiSuccessResponse(geminiResult));

    const result = await summarizeArticle("Claude Code アップデート", "新機能", "https://example.com");
    expect(result.titleJa).toBeUndefined();
  });

  it("正しいエンドポイントとパラメータでfetchを呼ぶ", async () => {
    const geminiResult = {
      summary: "要約",
      difficulty: "beginner",
      contentType: "tips",
      readingTimeMin: 2,
      language: "en",
    };
    mockFetch.mockResolvedValueOnce(geminiSuccessResponse(geminiResult));

    await summarizeArticle("Test Title", "Test Desc", "https://example.com");

    const callCount = mockFetch.mock.calls.length;
    expect(callCount).toBeGreaterThanOrEqual(1);
    const [url, options] = mockFetch.mock.calls[callCount - 1];
    expect(url).toContain("gemini-2.5-flash:generateContent");
    expect(url).toContain("key=test-api-key-123");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(options.body);
    expect(body.contents[0].parts[0].text).toContain("Test Title");
    expect(body.contents[0].parts[0].text).toContain("Test Desc");
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });
});

describe("sleep", () => {
  it("指定ミリ秒後に解決するPromiseを返す", async () => {
    vi.useFakeTimers();
    const promise = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
