import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Feature } from "@/lib/db/schema";

type Props = {
  features: (Feature & { articleCount: number })[];
  activeSlug?: string;
};

export function FeatureHub({ features, activeSlug = "all" }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {features.map((feature) => {
        const isActive = activeSlug === feature.slug;
        return (
          <Link
            key={feature.id}
            href={isActive ? "/" : `/?feature=${feature.slug}`}
          >
            <Card
              className={`flex flex-col items-center gap-1 p-3 text-center transition-colors hover:border-primary/50 hover:bg-accent ${
                isActive
                  ? "border-primary bg-accent"
                  : "border-border"
              }`}
            >
              <span className="text-2xl">{feature.icon}</span>
              <span className="text-xs font-medium">{feature.name}</span>
              <span className="text-xs text-muted-foreground">
                {feature.articleCount}記事
              </span>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
