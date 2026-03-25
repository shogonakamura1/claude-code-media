# SEO自動最適化システム

## 概要

ClaudeNoteのSEOを自律的に改善する自動化システム。
Google Search Console APIからデータを収集し、AIが改善提案を生成、管理画面で承認・適用する。

## アーキテクチャ

```
┌──────────────────────────────────────────────────┐
│                   日次 Cron Trigger                │
│                                                    │
│  ┌─────────────┐     ┌──────────────────────┐     │
│  │ Search Console│────→│ D1: seo_metrics      │     │
│  │ API (収集)    │     │ (日次メトリクス蓄積)   │     │
│  └─────────────┘     └──────────┬───────────┘     │
│                                  │                  │
│  ┌─────────────┐     ┌──────────▼───────────┐     │
│  │ Gemini 2.5   │────→│ D1: seo_improvements │     │
│  │ Flash (分析)  │     │ (AI改善提案)          │     │
│  └─────────────┘     └──────────┬───────────┘     │
│                                  │                  │
│                       ┌──────────▼───────────┐     │
│                       │ 管理画面 /admin/seo   │     │
│                       │ (確認・承認・適用)      │     │
│                       └──────────────────────┘     │
└──────────────────────────────────────────────────┘
```

## データフロー

### Step 1: Search Console データ収集

**エンドポイント**: `POST /api/seo/collect`
**実行タイミング**: Cron Trigger で毎日1回

1. Google Search Console API v3 にサービスアカウント認証で接続
2. 直近7日間のページ別・クエリ別パフォーマンスデータを取得
   - クリック数、表示回数、CTR、平均掲載順位
3. URLからスラッグを抽出し、articlesテーブルと紐付け
4. `seo_metrics` テーブルに日次データを蓄積

### Step 2: AI改善提案の自動生成

**エンドポイント**: `POST /api/seo/suggest`
**実行タイミング**: データ収集後に連続実行（Cron Trigger）

1. `seo_metrics` から直近7日間のデータを集計
2. 以下の問題パターンを自動検出:
   - **低CTR記事**: 50回以上表示されてCTR < 2% → タイトル改善
   - **2ページ目の記事**: 平均順位11-20位 → コンテンツ拡充
   - **デッドコンテンツ**: 14日以上表示ゼロ → 全面見直し
3. 上位5件に対してGemini 2.5 Flashで具体的な改善案を生成
4. `seo_improvements` テーブルに保存（status: pending）

### Step 3: 管理画面での確認・適用

**画面**: `/admin/seo`

- サマリーカード（クリック数、表示回数、CTR、平均順位）
- AI改善提案の一覧（現在値 → 提案値、理由、優先度）
- 「適用」ボタンで記事に反映、「却下」ボタンで非表示
- ページ別パフォーマンスランキング
- 検索クエリ一覧

## 必要な環境変数

| 変数名 | 説明 | 設定場所 |
|--------|------|---------|
| `GSC_CLIENT_EMAIL` | Googleサービスアカウントのメールアドレス | Cloudflare Workers シークレット |
| `GSC_PRIVATE_KEY` | サービスアカウントの秘密鍵（PEM形式） | Cloudflare Workers シークレット |
| `GSC_SITE_URL` | Search Consoleに登録したサイトURL | Cloudflare Workers 環境変数 |
| `GEMINI_API_KEY` | Gemini API キー（既存） | Cloudflare Workers シークレット |
| `CRON_SECRET` | Cron認証トークン（既存） | Cloudflare Workers シークレット |

## セットアップ手順

### 1. Google Cloud Console でサービスアカウントを作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）
3. 「APIとサービス」→「認証情報」→「サービスアカウントを作成」
4. サービスアカウント名を入力（例: `claudenote-seo`）
5. 作成後、「キー」タブ → 「キーを追加」→「JSON」でダウンロード

### 2. Search Console APIを有効化

1. Google Cloud Console → 「APIとサービス」→「APIを有効にする」
2. 「Google Search Console API」を検索して有効化

### 3. Search Console にサービスアカウントを追加

1. [Search Console](https://search.google.com/search-console) にアクセス
2. サイトのプロパティを選択
3. 「設定」→「ユーザーと権限」→「ユーザーを追加」
4. サービスアカウントのメールアドレスを入力（権限: フル）

### 4. Cloudflare Workers にシークレットを設定

```bash
# サービスアカウントのメールアドレス
wrangler secret put GSC_CLIENT_EMAIL

# 秘密鍵（JSONファイルのprivate_keyフィールドの値をそのまま貼り付け）
wrangler secret put GSC_PRIVATE_KEY

# サイトURL（sc-domain: 形式またはURL形式）
wrangler secret put GSC_SITE_URL
# 例: sc-domain:claudenote.jp または https://claudenote.jp/
```

### 5. マイグレーション実行

```bash
# ローカル
wrangler d1 execute claude-code-media-db --local --file=drizzle/0003_seo_metrics.sql

# 本番
wrangler d1 execute claude-code-media-db --file=drizzle/0003_seo_metrics.sql
```

### 6. Cron Trigger 設定（wrangler.toml）

wrangler.toml に以下を追加してデプロイ後、Cloudflare Dashboardでスケジュール設定:

```toml
# Cron Triggers はCloudflare Dashboardから設定
# 推奨: 毎日 UTC 00:00 (JST 09:00) に実行
```

実運用では、外部cronサービス（例: cron-job.org）から以下を叩く:

```bash
# Step 1: データ収集
curl -X POST https://claudenote.jp/api/seo/collect \
  -H "Authorization: Bearer $CRON_SECRET"

# Step 2: AI改善提案生成
curl -X POST https://claudenote.jp/api/seo/suggest \
  -H "Authorization: Bearer $CRON_SECRET"
```

## DBスキーマ

### seo_metrics（Search Console日次データ）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | TEXT PK | ユニークID |
| article_id | TEXT FK | 記事ID（articles.id） |
| slug | TEXT | 記事スラッグ |
| query | TEXT | 検索クエリ |
| clicks | INTEGER | クリック数 |
| impressions | INTEGER | 表示回数 |
| ctr | TEXT | クリック率（小数） |
| position | TEXT | 平均掲載順位 |
| date | TEXT | 日付（YYYY-MM-DD） |
| created_at | TEXT | 作成日時 |

### seo_improvements（AI改善提案）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | TEXT PK | ユニークID |
| article_id | TEXT FK | 記事ID |
| type | TEXT | 改善種別（title/description/content/internal_link） |
| current_value | TEXT | 現在の値 |
| suggested_value | TEXT | 提案値 |
| reason | TEXT | 改善理由 |
| priority | TEXT | 優先度（high/medium/low） |
| status | TEXT | ステータス（pending/approved/applied/rejected） |
| applied_at | TEXT | 適用日時 |
| created_at | TEXT | 作成日時 |

## 将来の拡張計画

### Phase 2: 完全自動化（オーナー介入ゼロ）

- 低リスク改善（メタディスクリプション変更等）は自動適用
- A/Bテストで効果測定 → 効果なしなら自動ロールバック
- 内部リンクの自動最適化

### Phase 3: 予測型最適化

- トレンド予測に基づく先行記事生成
- 検索意図の変化を検知して自動リライト
- 競合サイト分析との統合
