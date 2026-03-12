# バックエンド開発ルール

## API設計
- Route Handlers は `src/app/api/` に配置
- Edge Runtime で動作するコードのみ使用
- エラーレスポンスは適切なHTTPステータスコードを返す

## データベース
- Drizzle ORM経由でCloudflare D1にアクセス
- スキーマ変更は `src/lib/db/schema.ts` で管理
- マイグレーションは `npx drizzle-kit generate` → `npx drizzle-kit migrate`
- D1バインディングは `getRequestContext()` から取得

## データ収集（Fetcher）
- ソース定義は `src/lib/fetchers/sources.ts`
- 新しいソース追加時は既存の型 `Source` に従う
- スコアリングロジックは `scorer.ts` で一元管理
- RSS/Atomパースは `fast-xml-parser` を使用

## セキュリティ
- cronエンドポイントはシークレットトークンで認証
- ユーザー入力は必ずバリデーション
- SQLインジェクション対策としてDrizzle ORMのパラメータバインディングを使用
