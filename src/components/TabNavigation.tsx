import Link from "next/link";

const TABS = [
  { id: "beginner", name: "🔰 入門", description: "はじめての方向け" },
  { id: "latest", name: "📰 最新", description: "直近の記事" },
  { id: "featured", name: "⭐ 注目", description: "高評価・公式" },
  { id: "practical", name: "🔧 実践", description: "すぐ使えるTips" },
];

type Props = {
  activeTab: string;
  searchParams: Record<string, string>;
};

function buildHref(tabId: string, searchParams: Record<string, string>): string {
  const params = new URLSearchParams();
  if (tabId !== "latest") {
    params.set("tab", tabId);
  }
  if (searchParams.category) {
    params.set("category", searchParams.category);
  }
  if (searchParams.feature) {
    params.set("feature", searchParams.feature);
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function TabNavigation({ activeTab, searchParams }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={buildHref(tab.id, searchParams)}
            className={`flex-1 rounded-md px-3 py-2 text-center text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={tab.description}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
