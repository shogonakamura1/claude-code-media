import type { RawItem } from "./types";

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractCdata(str: string): string {
  const m = str.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1].trim() : decodeHtml(str.trim());
}

function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getTagContent(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? extractCdata(m[1]) : "";
}

// RSS 2.0
export function parseRSS(xml: string, sourceLabel: string): RawItem[] {
  const items: RawItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = stripTags(getTagContent(block, "title"));
    const url =
      getTagContent(block, "link") ||
      (() => {
        const g = block.match(/<guid[^>]*>([^<]+)<\/guid>/);
        return g ? g[1].trim() : "";
      })();
    const description = stripTags(getTagContent(block, "description")).slice(0, 300);
    const pubDate = getTagContent(block, "pubDate");
    const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();

    if (title && url) {
      items.push({ title, url, description, publishedAt, source: sourceLabel });
    }
  }

  return items;
}

// Atom 1.0
export function parseAtom(xml: string, sourceLabel: string): RawItem[] {
  const items: RawItem[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/gi;
  let m: RegExpExecArray | null;

  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const title = stripTags(getTagContent(block, "title"));

    // <link rel="alternate" href="..." /> or <link href="..." />
    const linkM = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
    const url = linkM ? linkM[1] : "";

    const summary = stripTags(
      getTagContent(block, "summary") || getTagContent(block, "content")
    ).slice(0, 300);

    const updated = getTagContent(block, "updated") || getTagContent(block, "published");
    const publishedAt = updated ? new Date(updated).toISOString() : new Date().toISOString();

    if (title && url) {
      items.push({ title, url, description: summary, publishedAt, source: sourceLabel });
    }
  }

  return items;
}

// GitHub Releases Atom (link要素が少し異なる)
export function parseGitHubAtom(xml: string, sourceLabel: string): RawItem[] {
  return parseAtom(xml, sourceLabel);
}
