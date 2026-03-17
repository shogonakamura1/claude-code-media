# SEO対策チェックリスト

ClaudeNote のSEO対応状況を記録・管理するドキュメント。

---

## ステータス凡例

- ✅ 完了
- ⚠️ 一部対応（改善の余地あり）
- ❌ 未対応

---

## 1. テクニカルSEO

### 1-1. sitemap.xml ✅ 完了

| 項目 | 内容 |
|------|------|
| 実装ファイル | `src/app/sitemap.ts` |
| 方式 | Next.js MetadataRoute API（動的生成） |
| 含むURL | トップページ（priority 1.0）、カテゴリ4ページ（0.7）、公開記事最大500件（0.8） |
| lastModified | DB の updatedAt を使用 |

**確認方法:**
```
curl https://claudenote.jp/sitemap.xml
```

### 1-2. robots.txt ✅ 完了

| 項目 | 内容 |
|------|------|
| 実装ファイル | `src/app/robots.ts` |
| Allow | `/`（公開ページ全般） |
| Disallow | `/admin/`, `/api/` |
| Sitemap | `${SITE_URL}/sitemap.xml` を参照 |

**確認方法:**
```
curl https://claudenote.jp/robots.txt
```

### 1-3. Canonical URL ✅ 完了

| 項目 | 内容 |
|------|------|
| トップページ | `src/app/layout.tsx` → `alternates.canonical: "/"` |
| カテゴリページ | `src/app/page.tsx` → カテゴリ別に canonical 設定 |
| 記事詳細 | `src/app/articles/[slug]/page.tsx` → `/articles/${slug}` |

**確認方法:**
```
curl -s https://claudenote.jp | grep -i canonical
curl -s https://claudenote.jp/articles/任意のslug | grep -i canonical
```

### 1-4. 構造化データ（JSON-LD） ✅ 完了

| 項目 | 内容 |
|------|------|
| 実装ファイル | `src/components/JsonLd.tsx` |
| トップページ | `WebSite` + `ItemList`（最大10件の記事リスト） |
| 記事詳細 | `Article`（headline, description, datePublished, author, publisher） |

**確認方法:**
```
# Google のリッチリザルトテストで確認
https://search.google.com/test/rich-results?url=https://claudenote.jp
https://search.google.com/test/rich-results?url=https://claudenote.jp/articles/任意のslug
```

### 1-5. Heading構造（h1/h2） ✅ 完了

| ページ | h1 | h2 |
|--------|----|----|
| トップページ | 「ClaudeNote — Claude Code の最新情報」 | 日付セパレーター |
| 記事詳細 | 記事タイトル | 「AI要約」「編集部コメント」 |

**確認方法:**
```
curl -s https://claudenote.jp | grep -oP '<h[1-3][^>]*>.*?</h[1-3]>'
```

---

## 2. メタデータ

### 2-1. title / description ✅ 完了

| ページ | title | description |
|--------|-------|-------------|
| トップページ | テンプレート: `%s \| ClaudeNote` | Claude Code・AI開発ツールの最新情報... |
| カテゴリ | カテゴリ名を含む動的title | カテゴリ別の説明 |
| 記事詳細 | 記事タイトル | AI要約の先頭160文字 |

**確認方法:**
```
curl -s https://claudenote.jp | grep -E '<title>|<meta name="description"'
curl -s https://claudenote.jp/articles/任意のslug | grep -E '<title>|<meta name="description"'
```

### 2-2. Open Graph (OGP) ⚠️ 一部対応

| 項目 | 状態 |
|------|------|
| og:type | ✅ website（トップ）/ article（記事） |
| og:locale | ✅ ja_JP |
| og:site_name | ✅ ClaudeNote |
| og:title | ✅ 各ページ固有 |
| og:description | ✅ 各ページ固有 |
| og:url | ✅ 各ページ固有 |
| **og:image** | ❌ **未設定** |

**未対応の影響:** SNSシェア時にサムネイルが表示されない。CTRが大幅に低下する。

**確認方法:**
```
curl -s https://claudenote.jp | grep 'og:'
# または以下のツールで視覚的に確認
# https://www.opengraph.xyz/
# https://cards-dev.twitter.com/validator
```

**対応案:**
- DBスキーマに `ogImage` フィールドは既に存在（`src/lib/db/schema.ts:45`）
- Next.js の `ImageResponse` で動的OG画像を生成する（`src/app/api/og/route.tsx`）

### 2-3. Twitter Card ⚠️ 一部対応

| 項目 | 状態 |
|------|------|
| twitter:card | ✅ summary_large_image |
| twitter:title | ✅ 各ページ固有 |
| twitter:description | ✅ 各ページ固有 |
| **twitter:image** | ❌ **未設定** |

**確認方法:**
```
curl -s https://claudenote.jp | grep 'twitter:'
```

---

## 3. コンテンツ・ページ

### 3-1. 記事詳細ページ ✅ 完了

| 項目 | 内容 |
|------|------|
| ルート | `/articles/[slug]` |
| 実装ファイル | `src/app/articles/[slug]/page.tsx` |
| SSR | Edge Runtime + revalidate: 300（ISR 5分） |
| 404対応 | 存在しない記事は `notFound()` |

**確認方法:**
```
curl -I https://claudenote.jp/articles/任意のslug
# 200が返ればOK、存在しないslugで404が返ればOK
```

### 3-2. RSSフィード ❌ 未対応

| 項目 | 内容 |
|------|------|
| 実装 | なし |
| 必要なファイル | `src/app/feed/route.ts`（または `src/app/rss.xml/route.ts`） |

**対応案:**
- Atom/RSS 2.0 フィードを `/feed` エンドポイントで提供
- `<link rel="alternate" type="application/rss+xml">` をlayoutに追加
- リピーター獲得に直結する施策

---

## 4. 外部サービス連携

### 4-1. Google Search Console ✅ 完了

| 項目 | 内容 |
|------|------|
| 認証ファイル | `public/google38b5d118679160d6.html` |
| 認証方式 | HTMLファイルアップロード方式 |

**確認方法:**
```
curl https://claudenote.jp/google38b5d118679160d6.html
# Google認証トークンが返ればOK

# Search Console でインデックス状況を確認:
# https://search.google.com/search-console
# → 「ページ」→ インデックス登録されたページ数を確認
# → 「サイトマップ」→ sitemap.xml が送信済みか確認
```

### 4-2. Google Analytics (GA4) ⚠️ 要確認

| 項目 | 内容 |
|------|------|
| 実装ファイル | `src/components/GoogleAnalytics.tsx` |
| 環境変数 | `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| 組み込み | `src/app/layout.tsx` で読み込み済み |

**確認方法:**
```
# 本番サイトでGA4が動作しているか確認
curl -s https://claudenote.jp | grep 'googletagmanager'
# gtagスクリプトが出力されていればOK

# GA4管理画面でリアルタイムデータが取れていれば動作確認済み
# （スクリーンショットの通り、データが取れているため動作中）
```

**現状:** スクリーンショットからGA4データが取得できているため、環境変数は設定済みと判断。

### 4-3. Google AdSense ⚠️ 審査中

| 項目 | 内容 |
|------|------|
| ads.txt | `public/ads.txt` に配置済み |

**確認方法:**
```
curl https://claudenote.jp/ads.txt
```

---

## 5. パフォーマンス・UX

### 5-1. 画像最適化（next/image） ❌ 未使用

| 項目 | 内容 |
|------|------|
| 状態 | サイト全体で `next/image` 未使用 |
| 影響 | 現時点ではテキスト中心のため影響小。OGP画像実装時に必要 |

### 5-2. Edge Runtime ✅ 完了

| 項目 | 内容 |
|------|------|
| 記事詳細ページ | `runtime: "edge"` 設定済み |
| ISR | `revalidate: 300`（5分キャッシュ） |

---

## 優先度付きアクションリスト

| 優先度 | 項目 | 影響 | 工数目安 |
|--------|------|------|----------|
| **P0** | Google Search Console でサイトマップ送信・インデックス確認 | インデックスされなければ検索流入ゼロ | 手動作業10分 |
| **P1** | OGP画像の動的生成 | SNSシェア時のCTR大幅向上 | 実装2-3時間 |
| **P2** | RSSフィード実装 | リピーター獲得 | 実装1-2時間 |
| **P3** | Twitter/Xアカウント連携・シェアボタン | 拡散導線 | 実装1時間 |

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03-17 | 初回作成。GA4データをもとに全項目を棚卸し |
| 2026-03-17 | 本番確認: sitemap.xml → 200 OK（content-type: application/xml）、robots.txt → 200 OK（content-type: text/plain, 101bytes）。両方正常動作を確認 |
| 2026-03-17 | GA4 → 管理画面スクリーンショットで動作確認済み（28日間で11ユーザー、112イベント） |
| 2026-03-17 | Search Console確認: インデックス登録済み1ページ（トップのみ）、未登録23ページ（404: 18、canonical重複: 2、クロール済み未登録: 3） |
| 2026-03-17 | **重大バグ修正**: 日本語スラッグが404の根本原因と特定。generateSlug()をASCII-onlyに修正、既存スラッグのバッチ修正APIを追加（PR #XX） |
