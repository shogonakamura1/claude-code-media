export type SourceType = "rss" | "atom" | "hn-api" | "reddit-api" | "github-atom";
export type Priority = "high" | "medium" | "low";
export type AuthorType = "official" | "influencer" | "community" | "media";

export interface Source {
  id: string;
  url: string;
  type: SourceType;
  priority: Priority;
  label: string;
  authorType: AuthorType;
}

export interface RawItem {
  title: string;
  url: string;
  description: string;
  publishedAt: string;
  source: string;
}

export interface ScoredItem extends RawItem {
  score: number;
  matchedKeywords: string[];
}

export interface FetchResult {
  sourceId: string;
  label: string;
  fetched: number;
  scored: ScoredItem[];
  error?: string;
}
