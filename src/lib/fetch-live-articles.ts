import { fetchAll } from "@/lib/fetchers";
import type { ScoredItem } from "@/lib/fetchers";
import type { ArticleWithRelations, Category, Feature } from "@/lib/db/schema";
import { MOCK_FEATURES } from "@/lib/mock-data";

// カテゴリ定義
const CATEGORIES: Record<string, Category> = {
  news: { id: "cat_news", slug: "news", name: "ニュース", color: "#FF6B35", order: 1 },
  tips: { id: "cat_tips", slug: "tips", name: "Tips", color: "#3B82F6", order: 2 },
  tutorial: { id: "cat_tutorial", slug: "tutorial", name: "チュートリアル", color: "#10B981", order: 3 },
  "case-study": { id: "cat_case", slug: "case-study", name: "事例・ハック", color: "#8B5CF6", order: 4 },
};

// キーワード → Feature マッピング
const KEYWORD_FEATURE_MAP: Record<string, string> = {
  "claude hooks": "hooks",
  "claude.md": "claude-md",
  "CLAUDE.md": "claude-md",
  "mcp": "mcp",
  "model context protocol": "mcp",
  "subagent": "sub-agents",
  "sub-agent": "sub-agents",
  "agentic coding": "orchestration",
  "claude agent": "sub-agents",
  "cursor": "mcp",
  "windsurf": "mcp",
  "cline": "mcp",
};

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function generateSlug(title: string, url: string): string {
  const ascii = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const hash = simpleHash(url);
  return ascii ? `${ascii}-${hash}` : hash;
}

function guessCategory(item: ScoredItem): Category {
  const text = `${item.title} ${item.description}`.toLowerCase();
  if (/release|リリース|update|アップデート|announce|launch|v\d/.test(text)) {
    return CATEGORIES.news;
  }
  if (/tutorial|チュートリアル|guide|ガイド|入門|hands-on|step.by.step|how to build/.test(text)) {
    return CATEGORIES.tutorial;
  }
  if (/case.study|事例|導入|比較|migrate|移行|production/.test(text)) {
    return CATEGORIES["case-study"];
  }
  return CATEGORIES.tips;
}

function guessFeatures(item: ScoredItem): Feature[] {
  const featureSlugs = new Set<string>();
  for (const kw of item.matchedKeywords) {
    const slug = KEYWORD_FEATURE_MAP[kw];
    if (slug) featureSlugs.add(slug);
  }
  return MOCK_FEATURES.filter((f) => featureSlugs.has(f.slug));
}

function stripHtmlAndMarkdown(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")          // HTMLタグ除去
    .replace(/#{1,6}\s*/g, "")         // Markdownヘッダー除去
    .replace(/[*_~`]{1,3}/g, "")       // 強調・コード記法除去
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // リンク記法を文字のみに
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "") // 画像記法除去
    .replace(/^\s*[-*+]\s+/gm, "")     // リスト記法除去
    .replace(/\n{2,}/g, " ")           // 連続改行をスペースに
    .replace(/\n/g, " ")               // 改行をスペースに
    .replace(/\s{2,}/g, " ")           // 連続スペースを1つに
    .trim()
    .slice(0, 300);
}

function guessLanguage(item: ScoredItem): string {
  return /[\u3000-\u9fff]/.test(item.title) ? "ja" : "en";
}

function scoredItemToArticle(
  item: ScoredItem,
  index: number,
): ArticleWithRelations {
  const category = guessCategory(item);
  const features = guessFeatures(item);
  const slug = generateSlug(item.title, item.url);
  const lang = guessLanguage(item);
  const isEnglish = lang === "en";

  return {
    id: `live_${index}`,
    slug,
    title: item.title,
    originalTitle: isEnglish ? item.title : null,
    originalUrl: item.url,
    source: item.source,
    ogImage: null,
    comment: stripHtmlAndMarkdown(item.description) || null,
    categoryId: category.id,
    status: "PUBLISHED",
    score: item.score,
    aiSummary: null,
    difficulty: null,
    contentType: category.slug as "news" | "tips" | "tutorial" | "case-study",
    readingTimeMin: null,
    authorName: item.source,
    isEssential: item.score >= 10 ? 1 : 0,
    language: lang,
    fetchedAt: new Date().toISOString(),
    publishedAt: item.publishedAt,
    createdAt: item.publishedAt,
    updatedAt: item.publishedAt,
    category,
    features,
    tags: [],
  };
}

// ── 記事フェッチのインメモリキャッシュ ─────────────────────────────────────
let cachedScoredItems: ScoredItem[] | null = null;
let scoredCacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10分

export interface FetchLiveArticlesResult {
  articles: ArticleWithRelations[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export async function fetchLiveArticles(
  page: number = 1,
  pageSize: number = 10
): Promise<FetchLiveArticlesResult> {
  const now = Date.now();

  // スコアリング済み記事のキャッシュ
  if (!cachedScoredItems || now - scoredCacheTimestamp >= CACHE_TTL) {
    const results = await fetchAll();
    const allScored = results
      .flatMap((r) => r.scored)
      .sort((a, b) => b.score - a.score);

    // 重複URL除去
    const seen = new Set<string>();
    cachedScoredItems = allScored.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
    scoredCacheTimestamp = now;
  }

  const totalCount = cachedScoredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (safePage - 1) * pageSize;
  const pageItems = cachedScoredItems.slice(startIndex, startIndex + pageSize);

  const articles = pageItems.map((item, i) =>
    scoredItemToArticle(item, startIndex + i)
  );

  return {
    articles,
    totalCount,
    currentPage: safePage,
    totalPages,
  };
}
