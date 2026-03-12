import { describe, it, expect } from "vitest";
import { scoreItem } from "../scorer";
import type { RawItem } from "../types";

function makeItem(overrides: Partial<RawItem> = {}): RawItem {
  return {
    title: "Test Article",
    url: "https://example.com/article",
    description: "A test article description",
    publishedAt: "2026-01-01T00:00:00Z",
    source: "test-source",
    ...overrides,
  };
}

describe("scoreItem", () => {
  describe("除外キーワード", () => {
    it("除外キーワードを含む記事はnullを返す", () => {
      const item = makeItem({ title: "Monet paintings exhibition" });
      expect(scoreItem(item)).toBeNull();
    });

    it("descriptionに除外キーワードがあってもnullを返す", () => {
      const item = makeItem({ description: "This is about impressionist art" });
      expect(scoreItem(item)).toBeNull();
    });

    it("除外キーワードは大文字小文字を区別しない", () => {
      const item = makeItem({ title: "DEBUSSY concert review" });
      expect(scoreItem(item)).toBeNull();
    });
  });

  describe("スコアリング基本ロジック", () => {
    it("関連キーワードがない記事はnull（MIN_SCORE未満）", () => {
      const item = makeItem({ title: "Unrelated tech news", description: "Nothing relevant" });
      expect(scoreItem(item)).toBeNull();
    });

    it("claude codeキーワードがタイトルにあるとweight*3のスコア", () => {
      const item = makeItem({ title: "Claude Code tips and tricks" });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
      // "claude code" weight=5, in title → 5*3=15
      expect(result!.score).toBeGreaterThanOrEqual(15);
      expect(result!.matchedKeywords).toContain("claude code");
    });

    it("descriptionのみにキーワードがあるとweightそのまま", () => {
      const item = makeItem({
        title: "Latest updates",
        description: "Learn about claude code features",
      });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
      // "claude code" weight=5, not in title → 5
      expect(result!.score).toBeGreaterThanOrEqual(5);
      expect(result!.matchedKeywords).toContain("claude code");
    });

    it("複数キーワードのスコアが加算される", () => {
      const item = makeItem({
        title: "Anthropic releases Claude Code update",
        description: "New MCP support added",
      });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
      // "claude code" in title (5*3) + "anthropic" in title (3*3) + "mcp" in desc (2) = at least 26
      expect(result!.matchedKeywords).toContain("claude code");
      expect(result!.matchedKeywords).toContain("anthropic");
      expect(result!.matchedKeywords).toContain("mcp");
      expect(result!.score).toBeGreaterThanOrEqual(20);
    });

    it("ハイフン付きキーワード claude-code も正しくマッチ", () => {
      const item = makeItem({ title: "Using claude-code in production" });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
      expect(result!.matchedKeywords).toContain("claude-code");
    });
  });

  describe("高優先ソースボーナス", () => {
    it("isHighPrioritySource=true でスコア+2", () => {
      const item = makeItem({
        title: "Latest updates",
        description: "claude code release notes",
      });
      const normal = scoreItem(item, false);
      const highPri = scoreItem(item, true);
      expect(highPri).not.toBeNull();
      if (normal) {
        expect(highPri!.score).toBe(normal.score + 2);
      }
    });
  });

  describe("著者タイプボーナス", () => {
    it("official著者は+5ボーナス", () => {
      const item = makeItem({
        title: "Latest updates",
        description: "claude code release notes",
      });
      const noAuthor = scoreItem(item, false);
      const official = scoreItem(item, false, "official");
      expect(official).not.toBeNull();
      if (noAuthor) {
        expect(official!.score).toBe(noAuthor.score + 5);
      }
    });

    it("influencer著者は+4ボーナス", () => {
      const item = makeItem({
        title: "Latest updates",
        description: "claude code tips",
      });
      const noAuthor = scoreItem(item, false);
      const influencer = scoreItem(item, false, "influencer");
      expect(influencer).not.toBeNull();
      if (noAuthor) {
        expect(influencer!.score).toBe(noAuthor.score + 4);
      }
    });

    it("community著者は+1ボーナス", () => {
      const item = makeItem({
        title: "Latest updates",
        description: "claude code tips",
      });
      const noAuthor = scoreItem(item, false);
      const community = scoreItem(item, false, "community");
      expect(community).not.toBeNull();
      if (noAuthor) {
        expect(community!.score).toBe(noAuthor.score + 1);
      }
    });

    it("media著者は+0ボーナス", () => {
      const item = makeItem({
        title: "Latest updates",
        description: "claude code tips",
      });
      const noAuthor = scoreItem(item, false);
      const media = scoreItem(item, false, "media");
      expect(media).not.toBeNull();
      if (noAuthor) {
        expect(media!.score).toBe(noAuthor.score);
      }
    });
  });

  describe("MIN_SCOREの閾値", () => {
    it("スコアがちょうど4未満の記事はnull", () => {
      // "ai coding" weight=1 in description → score=1, below MIN_SCORE=4
      const item = makeItem({
        title: "Generic programming article",
        description: "about ai coding trends",
      });
      const result = scoreItem(item);
      // ai coding appears twice in SCORE_KEYWORDS (weight 1 each), but it's the same keyword
      // score should be 1 (in desc only), which is < 4
      expect(result).toBeNull();
    });

    it("スコアがちょうど4以上の記事はScoredItemを返す", () => {
      // "anthropic" in title → 3*3=9 >= 4
      const item = makeItem({ title: "Anthropic announces new product" });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
      expect(result!.score).toBeGreaterThanOrEqual(4);
    });
  });

  describe("返却値の構造", () => {
    it("ScoredItemは元のRawItemフィールドを保持する", () => {
      const item = makeItem({
        title: "Claude Code tutorial",
        url: "https://example.com/claude-code",
        description: "How to use claude code",
        publishedAt: "2026-03-01T12:00:00Z",
        source: "Anthropic Blog",
      });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
      expect(result!.title).toBe(item.title);
      expect(result!.url).toBe(item.url);
      expect(result!.description).toBe(item.description);
      expect(result!.publishedAt).toBe(item.publishedAt);
      expect(result!.source).toBe(item.source);
    });

    it("matchedKeywordsは配列である", () => {
      const item = makeItem({ title: "Claude Code updates" });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
      expect(Array.isArray(result!.matchedKeywords)).toBe(true);
      expect(result!.matchedKeywords.length).toBeGreaterThan(0);
    });
  });
});
