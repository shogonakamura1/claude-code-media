import type { RawItem, ScoredItem, AuthorType } from "./types";

const EXCLUDE_KEYWORDS = ["monet", "debussy", "impressionist", "painting", "artwork"];

const SCORE_KEYWORDS: { keyword: string; weight: number }[] = [
  { keyword: "claude code", weight: 5 },
  { keyword: "claude-code", weight: 5 },
  { keyword: "claudecode", weight: 5 },
  { keyword: "anthropic", weight: 3 },
  { keyword: "claude 4", weight: 3 },
  { keyword: "claude opus", weight: 3 },
  { keyword: "claude sonnet", weight: 3 },
  { keyword: "claude haiku", weight: 3 },
  { keyword: "mcp", weight: 2 },
  { keyword: "model context protocol", weight: 3 },
  { keyword: "claude api", weight: 3 },
  { keyword: "claude hooks", weight: 4 },
  { keyword: "claude agent", weight: 3 },
  { keyword: "agentic", weight: 1 },
  { keyword: "llm coding", weight: 2 },
  { keyword: "ai coding", weight: 1 },
  { keyword: "claude.md", weight: 4 },
  { keyword: "CLAUDE.md", weight: 4 },
  { keyword: "subagent", weight: 3 },
  { keyword: "sub-agent", weight: 3 },
  // AI coding tools
  { keyword: "cursor", weight: 2 },
  { keyword: "windsurf", weight: 2 },
  { keyword: "copilot", weight: 1 },
  { keyword: "ai coding", weight: 1 },
  { keyword: "vibe coding", weight: 2 },
  { keyword: "agentic coding", weight: 3 },
  { keyword: "cline", weight: 2 },
  { keyword: "continue.dev", weight: 2 },
  { keyword: "ai editor", weight: 1 },
  { keyword: "ai ide", weight: 1 },
];

const AUTHOR_TYPE_BONUS: Record<AuthorType, number> = {
  official: 5,
  influencer: 4,
  community: 1,
  media: 0,
};

const MIN_SCORE = 4;

export function scoreItem(
  item: RawItem,
  isHighPrioritySource = false,
  authorType?: AuthorType
): ScoredItem | null {
  const text = `${item.title} ${item.description}`.toLowerCase();

  for (const ex of EXCLUDE_KEYWORDS) {
    if (text.includes(ex)) return null;
  }

  let score = 0;
  const matchedKeywords: string[] = [];

  for (const { keyword, weight } of SCORE_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      const inTitle = item.title.toLowerCase().includes(keyword.toLowerCase());
      score += inTitle ? weight * 3 : weight;
      matchedKeywords.push(keyword);
    }
  }

  if (isHighPrioritySource) score += 2;

  if (authorType) {
    score += AUTHOR_TYPE_BONUS[authorType];
  }

  if (score < MIN_SCORE) return null;

  return { ...item, score, matchedKeywords };
}
