import { SourceManager } from "../sources/SourceManager";

export const runtime = "edge";

export default function FetchPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">記事フェッチ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          フェッチ対象ソースの管理と、記事の手動フェッチを実行します。
        </p>
      </div>
      <SourceManager />
    </div>
  );
}
