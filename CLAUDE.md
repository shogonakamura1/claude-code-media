# ClaudeNote - Claude Code メディアサイト

## プロジェクト概要
Claude Code、Anthropic、AI開発ツールに関するキュレーションメディアサイト（日本語）。
RSS/APIから記事を自動収集し、スコアリング後に管理画面でレビュー・公開する。

## 技術スタック
- **フレームワーク**: Next.js 15.5 (App Router, Edge Runtime)
- **言語**: TypeScript (ES2017 target)
- **UI**: React 19 + Tailwind CSS 4 + shadcn/ui
- **DB**: Cloudflare D1 (SQLite) + Drizzle ORM 0.45
- **デプロイ**: Cloudflare Workers (@cloudflare/next-on-pages)
- **パーサー**: fast-xml-parser (RSS/Atom)

## コマンド
- `npm run dev` - 開発サーバー起動 (port 3000)
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバー起動

## ディレクトリ構成
```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # トップページ（ヒーロー、特集、カテゴリフィルタ）
│   ├── articles/[slug]/    # 記事詳細ページ
│   ├── admin/              # 管理画面（ダッシュボード、記事管理、フェッチ実行）
│   └── api/cron/           # 記事自動収集エンドポイント（Edge Function）
├── components/             # UIコンポーネント
│   ├── Header.tsx          # グローバルヘッダー
│   ├── ArticleCard.tsx     # 記事カード
│   ├── FeatureHub.tsx      # 特集ナビゲーショングリッド
│   └── ui/                 # shadcn コンポーネント群
├── lib/
│   ├── db/
│   │   ├── schema.ts       # DBスキーマ（5テーブル: categories, features, tags, articles, junction tables）
│   │   ├── index.ts        # Drizzle ORM接続設定
│   │   └── seed.ts         # シードデータ
│   ├── fetchers/
│   │   ├── sources.ts      # RSS/APIソース定義（7ソース）
│   │   ├── rss-parser.ts   # RSS/Atom/GitHubパーサー
│   │   └── scorer.ts       # 記事スコアリング
│   ├── mock-data.ts        # 開発用モックデータ
│   └── utils.ts            # ユーティリティ
└── types/
    └── cloudflare.d.ts     # D1Database型定義
```

## DB スキーマ概要
- **articles**: メインコンテンツ（status: PENDING/DRAFT/PUBLISHED/REJECTED）
- **categories**: 記事カテゴリ（news, tips, tutorial, case-study）
- **features**: Claude Code機能タグ（skills, hooks, sub-agents, MCP等）
- **tags / articleTags / articleFeatures**: 多対多リレーション

## 開発ルール
- パスエイリアス `@/*` → `src/*`
- コンポーネントは関数コンポーネント + TypeScript
- shadcn/ui コンポーネントは `src/components/ui/` に配置
- Edge Runtime互換性を常に意識（Node.js専用APIは使用不可）
- 日本語UIだがコード・変数名は英語

---

## Agent Teams ワークフロー

**重要: サブエージェント（Agent tool）ではなく、必ずチームメイト（Teammate）をスポーンすること。**
チームメイトは独立したClaude Codeセッションとしてtmuxペインに分割表示される。
タスクを委任する際は「チームメイトをスポーンして」と明示的に指示する。

### チーム構成（5チームメイト）

#### 仕様検討フェーズ（2エージェント）
- **SpecAgent-A（仕様検討A）**: ユーザー視点・UX重視で仕様を考える
- **SpecAgent-B（仕様検討B）**: 技術的実現性・アーキテクチャ重視で仕様を考える

#### 実装フェーズ（3エージェント）
- **Frontend**: UI/コンポーネント実装（src/app/, src/components/）
- **Backend**: API/DB/フェッチャー実装（src/app/api/, src/lib/）
- **QA**: テスト作成・ビルド検証・コードレビュー

### ワークフロー

```
ユーザーの曖昧な要望
    ↓
┌─────────────────────────────────┐
│  Phase 1: 独立提案               │
│  SpecAgent-A → 案Aを提出         │
│  SpecAgent-B → 案Bを提出         │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│  Phase 2: 相互レビュー           │
│  A が B の案のメリット・デメリットを指摘  │
│  B が A の案のメリット・デメリットを指摘  │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│  Phase 3: 方向性の合意            │
│  両者の一致点を抽出               │
│  → 合意した方向性を「基本方針」として確定 │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│  Phase 4: 肉付け・選定           │
│  基本方針に沿って各自が詳細案を出す    │
│  → より方向性に合う案を毎回選択・採用  │
│  → 最終仕様書を作成               │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│  Phase 5: 実装指示               │
│  最終仕様書を Frontend/Backend/QA に配布 │
│  各エージェントが担当範囲を並行実装     │
└─────────────────────────────────┘
```

### 仕様検討エージェントのルール
1. **独立思考**: 最初は相手の案を見ずに自分の案を出す
2. **建設的批評**: メリット・デメリットは具体的な理由付きで述べる
3. **合意優先**: 意見が分かれた場合、ユーザーの意図により近い方を採用
4. **方向性ロック**: 一度合意した基本方針は覆さない（詳細のみ議論）
5. **選定基準**: 毎ラウンド、合意した方向性との整合性が高い案を採用
6. **仕様書フォーマット**: 最終出力は以下の構成
   - 概要（何を作るか）
   - ユーザーストーリー（誰が・何を・なぜ）
   - 画面/機能一覧
   - データ構造の変更点
   - 実装上の制約・注意事項
   - Frontend / Backend / QA それぞれへの具体的な指示

### 実装エージェントのルール
- 仕様書に記載された自分の担当範囲のみ実装する
- 他エージェントの担当ファイルは編集しない
- 不明点は仕様書を再確認し、それでも不明なら作業を止めてリードに報告
