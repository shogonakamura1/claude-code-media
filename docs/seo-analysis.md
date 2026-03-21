# SEO分析レポート（2026-03-20）

## 現状の評価

### 実装済み（良好）
- robots.txt / sitemap.xml が正しく実装
- メタデータ（title, description, OG, Twitter Card）が各ページに設定
- 構造化データ（JSON-LD）が WebSite / ItemList / Article で実装済み
- canonical URL が設定
- `lang="ja"` が設定

### 問題点と対策

| 優先度 | 問題 | 影響 | 対策 | ステータス |
|--------|------|------|------|-----------|
| P0 | ArticleCardが外部リンク直行で記事詳細ページへの内部リンクがない | Googlebotが記事詳細ページを発見できない。滞在時間・PVが極端に低い | タイトルリンクを`/articles/[slug]`に変更。外部直行アイコンを別途配置 | 対応済み |
| P1 | 記事詳細ページのコンテンツが薄い（AI要約数行のみ） | Helpful Content Updateの基準を満たさない可能性 | Geminiで詳細要約（200〜400字）を生成し詳細ページに表示 | 対応済み |
| P2 | パンくずリストの構造化データ（BreadcrumbList JSON-LD）がない | 検索結果にパンくずが表示されずCTR低下 | BreadcrumbList JSON-LDを記事詳細ページに追加 | 未対応 |
| P2 | OG画像が未設定 | SNSシェア時にサムネイルが表示されずCTR低下 | Next.js ImageResponseで動的OG画像を生成 | 未対応 |
| P3 | generateStaticParamsが未実装 | Googlebotのクロール効率に影響する可能性 | 人気記事のSSGを検討 | 未対応 |
| P3 | ページネーションのprev/nextメタリンクがない | クロール効率に軽微な影響 | generateMetadataでprev/nextを設定 | 未対応 |

## 今後のSEO施策

### 短期（1〜2週間）
- BreadcrumbList構造化データの追加
- OG画像の動的生成
- 既存記事への詳細要約バックフィル

### 中期（1〜2ヶ月）
- Google Search Consoleでのインデックス状況モニタリング
- Core Web Vitals の最適化
- 内部リンク構造の強化（関連記事の表示）
- カテゴリページの独立化（`/category/[slug]` として個別ページ化）

### 長期
- FAQ構造化データの導入
- サイト内検索の実装（SearchAction構造化データ）
- 多言語対応（hreflang）
