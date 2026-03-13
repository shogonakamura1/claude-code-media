import type { RawItem, ScoredItem, AuthorType } from "./types";

// ── 除外フィルタ ──────────────────────────────────────────────────────
const EXCLUDE_KEYWORDS = ["monet", "debussy", "impressionist", "painting", "artwork"];

/**
 * Reddit質問系タイトルパターン（除外用）
 * 「?」で終わる、"anyone", "does anyone", "is there", "how do i" で始まる等
 */
const REDDIT_QUESTION_PATTERNS = [
  /\?$/,
  /^(does |is |are |can |has |have |should |would |could |will )?anyone /i,
  /^how (do|can|to) /i,
  /^is there /i,
  /^what (is|are) /i,
  /^where (can|do|is) /i,
  /^why (does|is|do) /i,
];

const REDDIT_MIN_ENGAGEMENT = 10;

// ── キーワードスコア ──────────────────────────────────────────────────
const SCORE_KEYWORDS: { keyword: string; weight: number }[] = [
  // Claude Code 直接系（最高ウェイト）
  { keyword: "claude code", weight: 5 },
  { keyword: "claude-code", weight: 5 },
  { keyword: "claudecode", weight: 5 },
  { keyword: "claude hooks", weight: 4 },
  { keyword: "claude.md", weight: 4 },
  { keyword: "CLAUDE.md", weight: 4 },
  { keyword: "subagent", weight: 3 },
  { keyword: "sub-agent", weight: 3 },
  { keyword: "claude agent", weight: 3 },

  // Anthropic/Claude系
  { keyword: "anthropic", weight: 3 },
  { keyword: "claude 4", weight: 3 },
  { keyword: "claude opus", weight: 3 },
  { keyword: "claude sonnet", weight: 3 },
  { keyword: "claude haiku", weight: 3 },
  { keyword: "claude api", weight: 3 },
  { keyword: "model context protocol", weight: 3 },
  { keyword: "mcp", weight: 2 },

  // 実践・ハッカソン系（新規追加）
  { keyword: "hackathon", weight: 3 },
  { keyword: "built with", weight: 2 },
  { keyword: "i built", weight: 2 },
  { keyword: "i made", weight: 2 },
  { keyword: "i created", weight: 2 },
  { keyword: "workflow", weight: 1 },
  { keyword: "setup guide", weight: 2 },
  { keyword: "my config", weight: 1 },

  // まとめ・ガイド系（新規追加）
  { keyword: "guide", weight: 2 },
  { keyword: "tutorial", weight: 2 },
  { keyword: "getting started", weight: 2 },
  { keyword: "best practices", weight: 2 },
  { keyword: "入門", weight: 2 },
  { keyword: "始め方", weight: 2 },
  { keyword: "まとめ", weight: 2 },
  { keyword: "tips", weight: 1 },
  { keyword: "選", weight: 1 },

  // AI codingツール系
  { keyword: "agentic coding", weight: 3 },
  { keyword: "vibe coding", weight: 2 },
  { keyword: "cursor", weight: 2 },
  { keyword: "windsurf", weight: 2 },
  { keyword: "cline", weight: 2 },
  { keyword: "continue.dev", weight: 2 },
  { keyword: "copilot", weight: 1 },
  { keyword: "ai coding", weight: 1 },
  { keyword: "llm coding", weight: 2 },
  { keyword: "agentic", weight: 1 },
  { keyword: "ai editor", weight: 1 },
  { keyword: "ai ide", weight: 1 },
];

// ── 著者タイプボーナス ────────────────────────────────────────────────
const AUTHOR_TYPE_BONUS: Record<AuthorType, number> = {
  official: 5,
  influencer: 4,
  community: 1,
  media: 0,
};

// ── 閾値 ──────────────────────────────────────────────────────────────
/** スコア >= AUTO_PUBLISH_MIN → PUBLISHED（自動公開） */
export const AUTO_PUBLISH_MIN = 10;

/** スコア >= REVIEW_MIN → PENDING（オーナーレビュー待ち） */
export const REVIEW_MIN = 6;

// ── 定数 ──────────────────────────────────────────────────────────────
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// ── 鮮度係数（乗算方式） ─────────────────────────────────────────────

/**
 * 鮮度係数: 新しい記事はフルスコア、古くなると減衰
 * officialソースのみ減衰を緩やかにする
 */
export function calcFreshnessFactor(publishedAt: string, isOfficial = false): number {
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  if (ageMs < 0) return 1.0; // 未来の日付（パースミス等）はフルスコア

  if (isOfficial) {
    // official: 減衰を緩やかに
    if (ageMs < DAY_MS) return 1.0;
    if (ageMs < 3 * DAY_MS) return 0.9;
    if (ageMs < 7 * DAY_MS) return 0.7;
    if (ageMs < 14 * DAY_MS) return 0.5;
    return 0.3;
  }

  // 通常ソース
  if (ageMs < DAY_MS) return 1.0;
  if (ageMs < 3 * DAY_MS) return 0.8;
  if (ageMs < 7 * DAY_MS) return 0.5;
  if (ageMs < 14 * DAY_MS) return 0.3;
  return 0.1;
}

/**
 * エンゲージメントボーナス: HN points, Reddit ups 等を対数スケールで変換
 * 0 → 0, 10 → 3, 100 → 6, 1000 → 9
 */
export function calcEngagementBonus(engagement: number | undefined): number {
  if (!engagement || engagement <= 0) return 0;
  return Math.round(Math.log10(engagement) * 3);
}

// ── 除外判定 ──────────────────────────────────────────────────────────

/**
 * Reddit質問系タイトルかどうかを判定
 */
export function isRedditQuestion(title: string): boolean {
  return REDDIT_QUESTION_PATTERNS.some((p) => p.test(title));
}

// ── メインスコアリング ────────────────────────────────────────────────

export function scoreItem(
  item: RawItem,
  isHighPrioritySource = false,
  authorType?: AuthorType
): ScoredItem | null {
  const text = `${item.title} ${item.description}`.toLowerCase();

  // 1. 除外キーワードフィルタ
  for (const ex of EXCLUDE_KEYWORDS) {
    if (text.includes(ex)) return null;
  }

  // 2. Reddit固有フィルタ
  const isReddit = item.source.toLowerCase().includes("reddit");
  if (isReddit) {
    if (isRedditQuestion(item.title)) return null;
    if ((item.engagement ?? 0) < REDDIT_MIN_ENGAGEMENT) return null;
  }

  // 3. キーワードマッチ（関連度スコア）
  let relevance = 0;
  const matchedKeywords: string[] = [];

  for (const { keyword, weight } of SCORE_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      const inTitle = item.title.toLowerCase().includes(keyword.toLowerCase());
      relevance += inTitle ? weight * 3 : weight;
      matchedKeywords.push(keyword);
    }
  }

  // 4. 品質ボーナス
  let qualityBonus = 0;

  if (isHighPrioritySource) qualityBonus += 2;

  if (authorType) {
    qualityBonus += AUTHOR_TYPE_BONUS[authorType];
  }

  qualityBonus += calcEngagementBonus(item.engagement);

  // 5. 鮮度係数（乗算）
  const isOfficial = authorType === "official";
  const freshnessFactor = calcFreshnessFactor(item.publishedAt, isOfficial);

  // 6. 最終スコア = (関連度 + 品質ボーナス) × 鮮度係数
  const rawScore = relevance + qualityBonus;
  const score = Math.round(rawScore * freshnessFactor);

  if (score < REVIEW_MIN) return null;

  return { ...item, score, matchedKeywords };
}
