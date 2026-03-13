import { describe, it, expect } from "vitest";
import {
  scoreItem,
  calcFreshnessFactor,
  calcEngagementBonus,
  isRedditQuestion,
  AUTO_PUBLISH_MIN,
  REVIEW_MIN,
} from "../scorer";
import type { RawItem } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** publishedAtを現在からの相対時間で生成 */
function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function makeItem(overrides: Partial<RawItem> = {}): RawItem {
  return {
    title: "Test Article",
    url: "https://example.com/article",
    description: "A test article description",
    publishedAt: hoursAgo(1), // デフォルト: 1時間前（鮮度×1.0）
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

  describe("Reddit固有フィルタ", () => {
    it("Redditの質問系タイトル（?終わり）は除外", () => {
      const item = makeItem({
        title: "Does anyone use Claude Code for mobile?",
        description: "claude code question",
        source: "Reddit r/ClaudeAI",
        engagement: 50,
      });
      expect(scoreItem(item, false, "community")).toBeNull();
    });

    it("Redditのengagement < 10は除外", () => {
      const item = makeItem({
        title: "I built a tool with Claude Code",
        description: "claude code project",
        source: "Reddit r/ClaudeAI",
        engagement: 3,
      });
      expect(scoreItem(item, false, "community")).toBeNull();
    });

    it("Redditでengagement >= 10かつ非質問タイトルは通過", () => {
      const item = makeItem({
        title: "I built a kanban app with Claude Code",
        description: "claude code project",
        source: "Reddit r/ClaudeAI",
        engagement: 50,
      });
      const result = scoreItem(item, false, "community");
      expect(result).not.toBeNull();
    });

    it("Reddit以外のソースは質問タイトルでも除外しない", () => {
      const item = makeItem({
        title: "How to use Claude Code?",
        description: "claude code tutorial",
        source: "Zenn",
      });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
    });
  });

  describe("スコアリング基本ロジック", () => {
    it("関連キーワードがない記事はnull（REVIEW_MIN未満）", () => {
      const item = makeItem({ title: "Unrelated tech news", description: "Nothing relevant" });
      expect(scoreItem(item)).toBeNull();
    });

    it("claude codeキーワードがタイトルにあるとweight*3のスコア", () => {
      const item = makeItem({ title: "Claude Code tips and tricks" });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
      // "claude code" weight=5, in title → 5*3=15, freshness×1.0
      expect(result!.score).toBeGreaterThanOrEqual(15);
      expect(result!.matchedKeywords).toContain("claude code");
    });

    it("descriptionのみにキーワードがあるとweightそのまま", () => {
      const item = makeItem({
        title: "Latest updates",
        description: "Learn about claude code and anthropic features",
      });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
      // "claude code" weight=5 + "anthropic" weight=3, both in desc only → 8 × 1.0 = 8
      expect(result!.matchedKeywords).toContain("claude code");
      expect(result!.matchedKeywords).toContain("anthropic");
    });

    it("複数キーワードのスコアが加算される", () => {
      const item = makeItem({
        title: "Anthropic releases Claude Code update",
        description: "New MCP support added",
      });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
      expect(result!.matchedKeywords).toContain("claude code");
      expect(result!.matchedKeywords).toContain("anthropic");
      expect(result!.matchedKeywords).toContain("mcp");
      expect(result!.score).toBeGreaterThanOrEqual(20);
    });
  });

  describe("鮮度係数（乗算方式）", () => {
    it("1時間前の記事はフルスコア（×1.0）", () => {
      const item = makeItem({
        title: "Claude Code release",
        publishedAt: hoursAgo(1),
      });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
      // "claude code" in title: 5*3=15. × 1.0 = 15
      expect(result!.score).toBe(15);
    });

    it("2日前の記事はスコアが減衰（×0.8）", () => {
      const item = makeItem({
        title: "Claude Code release",
        publishedAt: daysAgo(2),
      });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
      // 15 × 0.8 = 12
      expect(result!.score).toBe(12);
    });

    it("5日前の記事はさらに減衰（×0.5）", () => {
      const item = makeItem({
        title: "Claude Code release",
        publishedAt: daysAgo(5),
      });
      const result = scoreItem(item);
      expect(result).not.toBeNull();
      // 15 × 0.5 = 7.5 → 8 (rounded)
      expect(result!.score).toBe(8);
    });

    it("10日前の記事は大幅に減衰（×0.3）", () => {
      const item = makeItem({
        title: "Claude Code release",
        publishedAt: daysAgo(10),
      });
      const result = scoreItem(item);
      // 15 × 0.3 = 4.5 → 5 (rounded) < REVIEW_MIN(6) → null
      expect(result).toBeNull();
    });

    it("30日前の記事はほぼ消える（×0.1）", () => {
      const item = makeItem({
        title: "Claude Code release",
        publishedAt: daysAgo(30),
      });
      const result = scoreItem(item);
      // 15 × 0.1 = 1.5 → 2 < REVIEW_MIN → null
      expect(result).toBeNull();
    });
  });

  describe("official鮮度緩和", () => {
    it("officialの8日前記事は通常より高スコア", () => {
      const item = makeItem({
        title: "Claude Code new hooks API",
        publishedAt: daysAgo(8),
      });
      const officialResult = scoreItem(item, true, "official");
      const communityResult = scoreItem(item, false, "community");

      expect(officialResult).not.toBeNull();
      // official: (15+12+2+5) × 0.5 = 17
      // community: (15+12+1) × 0.3 = 8.4 → 8
      if (communityResult) {
        expect(officialResult!.score).toBeGreaterThan(communityResult.score);
      }
    });
  });

  describe("著者タイプボーナス", () => {
    it("official著者は+5ボーナス", () => {
      const item = makeItem({
        title: "Claude Code release",
        description: "claude code release notes",
      });
      const noAuthor = scoreItem(item, false);
      const official = scoreItem(item, false, "official");
      expect(official).not.toBeNull();
      if (noAuthor) {
        expect(official!.score).toBeGreaterThan(noAuthor.score);
      }
    });

    it("influencer著者は+4ボーナス", () => {
      const item = makeItem({
        title: "Claude Code tips",
        description: "claude code tips",
      });
      const noAuthor = scoreItem(item, false);
      const influencer = scoreItem(item, false, "influencer");
      expect(influencer).not.toBeNull();
      if (noAuthor) {
        expect(influencer!.score).toBeGreaterThan(noAuthor.score);
      }
    });
  });

  describe("閾値", () => {
    it("REVIEW_MIN未満の記事はnull", () => {
      // "ai coding" weight=1 in description → score=1 × 1.0 = 1 < 6
      const item = makeItem({
        title: "Generic programming article",
        description: "about ai coding trends",
      });
      expect(scoreItem(item)).toBeNull();
    });

    it(`スコア >= ${AUTO_PUBLISH_MIN} は自動公開ライン`, () => {
      expect(AUTO_PUBLISH_MIN).toBe(10);
    });

    it(`スコア >= ${REVIEW_MIN} はレビュー待ちライン`, () => {
      expect(REVIEW_MIN).toBe(6);
    });
  });

  describe("エンゲージメントボーナス", () => {
    it("undefinedは+0", () => {
      expect(calcEngagementBonus(undefined)).toBe(0);
    });

    it("0は+0", () => {
      expect(calcEngagementBonus(0)).toBe(0);
    });

    it("10 pointsは+3", () => {
      expect(calcEngagementBonus(10)).toBe(3);
    });

    it("100 pointsは+6", () => {
      expect(calcEngagementBonus(100)).toBe(6);
    });

    it("1000 pointsは+9", () => {
      expect(calcEngagementBonus(1000)).toBe(9);
    });
  });

  describe("鮮度係数の値", () => {
    it("24時間以内は1.0", () => {
      expect(calcFreshnessFactor(hoursAgo(1))).toBe(1.0);
    });

    it("3日以内は0.8", () => {
      expect(calcFreshnessFactor(daysAgo(2))).toBe(0.8);
    });

    it("7日以内は0.5", () => {
      expect(calcFreshnessFactor(daysAgo(5))).toBe(0.5);
    });

    it("14日以内は0.3", () => {
      expect(calcFreshnessFactor(daysAgo(10))).toBe(0.3);
    });

    it("14日超は0.1", () => {
      expect(calcFreshnessFactor(daysAgo(30))).toBe(0.1);
    });

    it("official: 14日以内は0.5（通常0.3）", () => {
      expect(calcFreshnessFactor(daysAgo(10), true)).toBe(0.5);
    });

    it("official: 14日超は0.3（通常0.1）", () => {
      expect(calcFreshnessFactor(daysAgo(30), true)).toBe(0.3);
    });
  });

  describe("isRedditQuestion", () => {
    it("?で終わるタイトルはtrue", () => {
      expect(isRedditQuestion("Does Claude Code support MCP?")).toBe(true);
    });

    it("anyone系はtrue", () => {
      expect(isRedditQuestion("Does anyone use Claude Code?")).toBe(true);
      expect(isRedditQuestion("Anyone tried the new update?")).toBe(true);
    });

    it("how to系はtrue", () => {
      expect(isRedditQuestion("How to install Claude Code")).toBe(true);
      expect(isRedditQuestion("How can I use Claude Code")).toBe(true);
    });

    it("通常の記事タイトルはfalse", () => {
      expect(isRedditQuestion("I built a kanban app with Claude Code")).toBe(false);
      expect(isRedditQuestion("Claude Code 1.0.20 released")).toBe(false);
    });
  });

  describe("返却値の構造", () => {
    it("ScoredItemは元のRawItemフィールドを保持する", () => {
      const item = makeItem({
        title: "Claude Code tutorial",
        url: "https://example.com/claude-code",
        description: "How to use claude code",
        publishedAt: hoursAgo(1),
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
