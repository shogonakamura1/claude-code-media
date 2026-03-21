export const runtime = "edge";

import { headers } from "next/headers";
import { SeoDashboardClient } from "./SeoActions";
import type { SeoMetricsData } from "./SeoActions";

async function fetchMetrics(baseUrl: string): Promise<SeoMetricsData | null> {
  try {
    const res = await fetch(`${baseUrl}/api/seo/metrics?days=7`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as SeoMetricsData & { ok: boolean };
      if (data.ok) return data;
    }
  } catch {
    // fallback
  }
  return null;
}

export default async function SeoPage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const data = await fetchMetrics(baseUrl);

  return (
    <div>
      <h1 className="mb-6 text-lg font-bold">SEO自動最適化</h1>
      <SeoDashboardClient initialData={data} />
    </div>
  );
}
