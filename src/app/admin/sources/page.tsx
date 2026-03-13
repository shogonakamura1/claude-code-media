import { SourceManager } from "./SourceManager";

export const runtime = "edge";

export default function SourcesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">ソース管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          記事の自動収集に使用するRSS/APIソースを管理します。有効なソースのみフェッチ対象になります。
        </p>
      </div>
      <SourceManager />
    </div>
  );
}
