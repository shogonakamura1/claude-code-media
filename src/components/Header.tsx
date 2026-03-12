import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { label: "ニュース", href: "/?category=news" },
  { label: "Tips", href: "/?category=tips" },
  { label: "機能で探す", href: "/#features" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">
            Claude<span className="text-primary">Note</span>
          </span>
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
            β
          </Badge>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
