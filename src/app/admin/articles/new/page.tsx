import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewArticleForm } from "./NewArticleForm";

export default function NewArticlePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/articles"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          一覧に戻る
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-muted-foreground">新規作成</span>
      </div>

      <h1 className="text-xl font-bold">記事を手動追加</h1>

      <NewArticleForm features={[]} />
    </div>
  );
}
