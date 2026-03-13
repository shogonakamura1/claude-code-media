import type { Source, RawItem } from "./types";
import { parseRSS, parseAtom, parseGitHubAtom } from "./rss-parser";

export const SOURCES: Source[] = [
  // 公式ソース
  // anthropic-blog: RSS feed URL not available, removed
  {
    id: "github-releases",
    url: "https://github.com/anthropics/claude-code/releases.atom",
    type: "github-atom",
    priority: "high",
    label: "GitHub Releases (claude-code)",
    authorType: "official",
  },
  // anthropic-news: RSS feed URL not available, removed

  // インフルエンサー（日本語）
  {
    id: "tomoam-zenn",
    url: "https://zenn.dev/tomoam/feed",
    type: "rss",
    priority: "high",
    label: "tomoam (Zenn)",
    authorType: "influencer",
  },
  // tomoam-note: RSS feed not available, removed
  {
    id: "boris-tane",
    url: "https://boristane.com/rss.xml",
    type: "rss",
    priority: "medium",
    label: "Boris Tane",
    authorType: "influencer",
  },

  // 著名人・インフルエンサー
  {
    id: "simon-willison",
    url: "https://simonwillison.net/atom/everything/",
    type: "atom",
    priority: "high",
    label: "Simon Willison",
    authorType: "influencer",
  },
  {
    id: "thorsten-ball",
    url: "https://registerspill.thorstenball.com/feed",
    type: "rss",
    priority: "medium",
    label: "Thorsten Ball (Register Spill)",
    authorType: "influencer",
  },
  {
    id: "swyx-blog",
    url: "https://www.latent.space/feed",
    type: "rss",
    priority: "medium",
    label: "swyx (Latent Space)",
    authorType: "influencer",
  },
  // harper-carroll: RSS feed not available, removed

  // コミュニティ
  {
    id: "zenn",
    url: "https://zenn.dev/topics/claudecode/feed",
    type: "rss",
    priority: "medium",
    label: "Zenn",
    authorType: "community",
  },
  {
    id: "qiita",
    url: "https://qiita.com/tags/claudecode/feed",
    type: "rss",
    priority: "medium",
    label: "Qiita",
    authorType: "community",
  },
  {
    id: "devto",
    url: "https://dev.to/feed/tag/claudecode",
    type: "rss",
    priority: "low",
    label: "dev.to",
    authorType: "community",
  },
  {
    id: "hn",
    url: "https://hn.algolia.com/api/v1/search?query=claude+code+anthropic&tags=story&hitsPerPage=20",
    type: "hn-api",
    priority: "medium",
    label: "Hacker News",
    authorType: "community",
  },
  {
    id: "reddit",
    url: "https://www.reddit.com/r/ClaudeAI/search.json?q=claude+code&sort=new&limit=20&restrict_sr=1",
    type: "reddit-api",
    priority: "medium",
    label: "Reddit r/ClaudeAI",
    authorType: "community",
  },

  // AIツール公式
  // cursor-blog: RSS feed not available, removed

  // コミュニティ（日本語）
  {
    id: "note-claudecode",
    url: "https://note.com/hashtag/ClaudeCode?rss",
    type: "rss",
    priority: "medium",
    label: "note.com",
    authorType: "community",
  },

  // メディア
  {
    id: "the-verge-ai",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    type: "rss",
    priority: "low",
    label: "The Verge AI",
    authorType: "media",
  },
  {
    id: "techcrunch-ai",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    type: "rss",
    priority: "low",
    label: "TechCrunch AI",
    authorType: "media",
  },
];

async function fetchWithTimeout(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent": "ClaudeNote-Bot/1.0",
      Accept: "application/rss+xml, application/atom+xml, application/json, text/xml, */*",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function fetchSource(source: Source): Promise<RawItem[]> {
  let url = source.url;

  // HN API: 過去7日間 + ポイント20以上に動的に制限
  if (source.type === "hn-api") {
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    url += `&numericFilters=created_at_i>${sevenDaysAgo},points>20`;
  }

  const text = await fetchWithTimeout(url);

  switch (source.type) {
    case "rss":
      return parseRSS(text, source.label);
    case "atom":
      return parseAtom(text, source.label);
    case "github-atom":
      return parseGitHubAtom(text, source.label);
    case "hn-api": {
      const data = JSON.parse(text);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data.hits ?? []).map((h: any) => ({
        title: h.title ?? "",
        url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
        description: h.story_text?.slice(0, 300) ?? "",
        publishedAt: h.created_at ?? new Date().toISOString(),
        source: source.label,
        engagement: h.points ?? 0,
      }));
    }
    case "reddit-api": {
      const data = JSON.parse(text);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data.data?.children ?? []).map((c: any) => ({
        title: c.data?.title ?? "",
        url: c.data?.url ?? `https://reddit.com${c.data?.permalink}`,
        description: c.data?.selftext?.slice(0, 300) ?? "",
        publishedAt: c.data?.created_utc
          ? new Date(c.data.created_utc * 1000).toISOString()
          : new Date().toISOString(),
        source: source.label,
        engagement: c.data?.ups ?? 0,
      }));
    }
  }
}
