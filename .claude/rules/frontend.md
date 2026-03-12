# フロントエンド開発ルール

## コンポーネント設計
- React 19のServer Componentsをデフォルトで使用
- クライアントコンポーネントは `"use client"` を明記し、最小限に
- shadcn/ui コンポーネントをベースにカスタマイズ
- Tailwind CSS 4のユーティリティクラスを使用

## ページ構成
- App Routerのファイルベースルーティングに従う
- `page.tsx` はServer Component、インタラクティブ部分は別コンポーネントに分離
- `layout.tsx` で共通レイアウトを定義

## スタイリング
- Tailwind CSS 4を使用（`@import "tailwindcss"` 形式）
- ダークテーマ対応（next-themes使用）
- レスポンシブデザイン必須（mobile-first）

## パフォーマンス
- 画像は `next/image` を使用
- 動的インポートでコード分割を検討
- Edge Runtime互換のコードのみ使用
