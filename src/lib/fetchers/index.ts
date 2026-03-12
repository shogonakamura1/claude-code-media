import { SOURCES, fetchSource } from "./sources";
import { scoreItem } from "./scorer";
import type { FetchResult } from "./types";

export async function fetchAll(): Promise<FetchResult[]> {
  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const isHigh = source.priority === "high";
      const items = await fetchSource(source);
      const scored = items
        .map((item) => scoreItem(item, isHigh, source.authorType))
        .filter((item) => item !== null);

      return {
        sourceId: source.id,
        label: source.label,
        fetched: items.length,
        scored,
      } satisfies FetchResult;
    })
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      sourceId: SOURCES[i].id,
      label: SOURCES[i].label,
      fetched: 0,
      scored: [],
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}

export { SOURCES } from "./sources";
export type { FetchResult, ScoredItem } from "./types";
