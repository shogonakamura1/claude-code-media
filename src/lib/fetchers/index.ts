import { SOURCES, fetchSource, fetchSourcesFromDb } from "./sources";
import { scoreItem } from "./scorer";
import type { FetchResult } from "./types";
import type { Db } from "@/lib/db";

export async function fetchAll(db?: Db): Promise<FetchResult[]> {
  const activeSources = await fetchSourcesFromDb(db);

  const results = await Promise.allSettled(
    activeSources.map(async (source) => {
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
      sourceId: activeSources[i].id,
      label: activeSources[i].label,
      fetched: 0,
      scored: [],
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}

export { SOURCES } from "./sources";
export type { FetchResult, ScoredItem } from "./types";
