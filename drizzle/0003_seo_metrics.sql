-- SEOメトリクス（Search Console日次データ）
CREATE TABLE IF NOT EXISTS `seo_metrics` (
  `id` text PRIMARY KEY NOT NULL,
  `article_id` text REFERENCES `articles`(`id`) ON DELETE CASCADE,
  `slug` text NOT NULL,
  `query` text,
  `clicks` integer NOT NULL DEFAULT 0,
  `impressions` integer NOT NULL DEFAULT 0,
  `ctr` text NOT NULL DEFAULT '0',
  `position` text NOT NULL DEFAULT '0',
  `date` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

-- SEO改善提案（AI生成）
CREATE TABLE IF NOT EXISTS `seo_improvements` (
  `id` text PRIMARY KEY NOT NULL,
  `article_id` text NOT NULL REFERENCES `articles`(`id`) ON DELETE CASCADE,
  `type` text NOT NULL,
  `current_value` text,
  `suggested_value` text NOT NULL,
  `reason` text NOT NULL,
  `priority` text NOT NULL DEFAULT 'medium',
  `status` text NOT NULL DEFAULT 'pending',
  `applied_at` text,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

-- インデックス
CREATE INDEX IF NOT EXISTS `idx_seo_metrics_article_date` ON `seo_metrics` (`article_id`, `date`);
CREATE INDEX IF NOT EXISTS `idx_seo_metrics_date` ON `seo_metrics` (`date`);
CREATE INDEX IF NOT EXISTS `idx_seo_improvements_article` ON `seo_improvements` (`article_id`);
CREATE INDEX IF NOT EXISTS `idx_seo_improvements_status` ON `seo_improvements` (`status`);
