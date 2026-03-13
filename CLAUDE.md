# ClaudeNote - Claude Code メディアサイト

## 経営方針

### ミッション

Claude Code・Anthropic・AI開発ツールの最新情報を、AI要約付きで短時間にキャッチアップできる日本語メディア。
開発の実務で役立つ情報やAIの使い方が上手くなるナレッジを提供し、読者の開発生産性を向上させる。

### 収益目標

| フェーズ | 目標 | 手段 |
|---------|------|------|
| Phase 1（現在） | 月¥18,000（Claude Code利用料の回収） | Google AdSense（審査中） |
| Phase 2 | 月¥50,000〜 | AdSense最適化 + アクセス増加施策 |
| Phase 3 | 月¥100,000〜 | 一部機能の有料化・サブスクリプション導入 |
| Phase 4（最終目標） | 月¥1,000,000 | サブスク収益 + 広告収益の最大化 |

### Claudeの役割

Claudeは **戦略パートナー兼実装者** の両方を担う。

- **戦略パートナーとして**: 収益化戦略・SEO・Webマーケティングの壁打ち相手。オーナーはWebマーケティング未経験のため、SEO戦略・集客施策・収益最適化について積極的にアドバイス・提案する
- **実装者として**: 壁打ちで合意した方針に基づき、コード実装を主導する
- 収益に直結する施策を見つけたら、指示を待たずに提案すること

### 判断の優先順位

意思決定に迷ったとき、以下の順序で判断する：

1. **収益** — 収益に繋がるか？（最優先）
2. **ユーザー体験** — 読者にとって使いやすく価値があるか？（収益の源泉）
3. **コンテンツ量・質** — 情報量、要約の質、アルゴリズムの精度は十分か？
4. **開発速度** — AIに委任するため最後でよい

### 制約条件・やらないこと

- 法的・倫理的に問題のある手法は使わない（スパムSEO、虚偽コンテンツ等）
- 現時点は日本語ユーザーをターゲットとする（将来的に英語圏への展開を予定）
- Cloudflare無料プランの範囲内で運用し、収益が出てから有料プランへ移行する

### 現在の資産・リソース

- **インフラ**: Cloudflare Workers/D1（無料プラン）
- **AI**: Gemini 2.5 Flash（要約生成）、Claude Code（開発・戦略）
- **収益化**: Google AdSense（審査中）
- **稼働時間**: オーナーが1日約5時間コミット可能
- **コンテンツ**: RSS自動収集（7ソース）+ AI要約の仕組みが稼働済み

### 差別化ポイント

- AI要約付きで短時間で情報をキャッチアップできる
- Claude Code / AI開発ツールに特化したニッチ戦略
- 開発実務に直結する実用的な情報に絞る

---

## プロジェクト概要

Claude Code、Anthropic、AI開発ツールに関するキュレーションメディアサイト（日本語）。
RSS/APIから記事を自動収集し、Gemini 2.5 FlashでAI要約を生成、管理画面でレビュー・公開する。

## 技術スタック

- **フレームワーク**: Next.js 15.5 (App Router, Edge Runtime)
- **言語**: TypeScript (ES2017 target)
- **UI**: React 19 + Tailwind CSS 4 + shadcn/ui
- **DB**: Cloudflare D1 (SQLite) + Drizzle ORM 0.45
- **AI要約**: Gemini 2.5 Flash（記事の自動要約・難易度判定）
- **デプロイ**: Cloudflare Workers (@cloudflare/next-on-pages)
- **パーサー**: fast-xml-parser (RSS/Atom)
- **テスト**: Vitest（単体テスト） + Playwright（E2Eテスト）

## コマンド

- `npm run dev` - 開発サーバー起動 (port 3000)
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバー起動
- `npm run test` - 単体テスト実行 (Vitest)
- `npm run test:watch` - 単体テストのウォッチモード
- `npm run test:e2e` - E2Eテスト実行 (Playwright)

## ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # トップページ（ヒーロー、特集、カテゴリフィルタ）
│   ├── admin/              # 管理画面
│   │   ├── page.tsx        # ダッシュボード
│   │   ├── articles/       # 記事管理（一覧・新規作成・編集）
│   │   └── fetch/          # フェッチ実行
│   └── api/
│       ├── articles/       # 記事CRUD API
│       ├── cron/           # 記事自動収集エンドポイント（Edge Function）
│       ├── summarize/      # Gemini要約API（認証付き）
│       └── summarize-live/ # ライブ要約API
├── components/             # UIコンポーネント
│   ├── Header.tsx          # グローバルヘッダー
│   ├── ArticleCard.tsx     # 記事カード
│   ├── FeatureHub.tsx      # 特集ナビゲーショングリッド
│   ├── TabNavigation.tsx   # タブナビゲーション
│   ├── WeeklyHighlights.tsx # 週間ハイライト
│   ├── CollapsibleSummary.tsx # 折りたたみAI要約
│   ├── SummaryToggle.tsx   # ライブ要約トグル
│   └── ui/                 # shadcn コンポーネント群
├── lib/
│   ├── db/
│   │   ├── schema.ts       # DBスキーマ（5テーブル: categories, features, tags, articles, junction tables）
│   │   ├── index.ts        # Drizzle ORM接続設定
│   │   └── seed.ts         # シードデータ
│   ├── fetchers/
│   │   ├── sources.ts      # RSS/APIソース定義（7ソース）
│   │   ├── rss-parser.ts   # RSS/Atom/GitHubパーサー
│   │   ├── scorer.ts       # 記事スコアリング
│   │   ├── types.ts        # フェッチャー型定義
│   │   ├── index.ts        # フェッチャーエントリポイント
│   │   └── __tests__/      # scorer単体テスト
│   ├── gemini.ts           # Gemini 2.5 Flash連携（要約・難易度判定）
│   ├── fetch-live-articles.ts # ライブ記事取得ロジック
│   ├── mock-data.ts        # 開発用モックデータ
│   └── utils.ts            # ユーティリティ
├── types/
│   └── cloudflare.d.ts     # D1Database型定義
e2e/
└── homepage.spec.ts        # トップページE2Eテスト
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
