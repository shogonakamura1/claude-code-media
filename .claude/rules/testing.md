# テスト戦略

## 方針
- ビジネスロジック（scorer, fetcher, parser）は単体テストを書く
- UIコンポーネントは変更時に目視確認（開発サーバー）
- API Route Handlersはインテグレーションテストを検討

## Edge Runtime制約
- Node.js専用モジュール（fs, path等）はテストでも使用不可
- D1はローカルではwrangler devで模擬可能

## ビルド確認
- PRマージ前に `npm run build` が通ることを確認
- TypeScriptの型エラーがないことを確認
