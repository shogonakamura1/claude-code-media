import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// ── カテゴリ（ニュース / Tips / チュートリアル / 事例） ──────────────────
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#FF6B35"),
  order: integer("order").notNull().default(0),
});

// ── Claude Code 機能（Skills / Hooks / MCP / ...） ────────────────────────
export const features = sqliteTable("features", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),       // 日本語名
  nameEn: text("name_en").notNull(),  // 英語名
  description: text("description").notNull(),
  icon: text("icon").notNull(),       // emoji
  docsUrl: text("docs_url"),          // 公式ドキュメントURL
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ── タグ ──────────────────────────────────────────────────────────────────
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});

// ── 記事 ──────────────────────────────────────────────────────────────────
export const articles = sqliteTable("articles", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),           // 日本語タイトル
  originalTitle: text("original_title"),    // 原文タイトル
  originalUrl: text("original_url").notNull().unique(),
  source: text("source").notNull(),         // ドメイン名 (e.g. "anthropic.com")
  ogImage: text("og_image"),
  comment: text("comment"),                 // 管理者の解説（Markdown）
  categoryId: text("category_id").references(() => categories.id),
  // PENDING=自動取得済 / DRAFT=承認・編集中 / PUBLISHED=公開 / REJECTED=却下
  status: text("status", {
    enum: ["PENDING", "DRAFT", "PUBLISHED", "REJECTED"],
  })
    .notNull()
    .default("PENDING"),
  score: integer("score").default(0),       // 自動取得時のスコア
  aiSummary: text("ai_summary"),             // Gemini生成の3行要約（日本語）
  difficulty: text("difficulty", {
    enum: ["beginner", "intermediate", "advanced"],
  }),
  contentType: text("content_type", {
    enum: ["news", "tips", "tutorial", "case-study"],
  }),
  readingTimeMin: integer("reading_time_min"),
  authorName: text("author_name"),
  isEssential: integer("is_essential").default(0), // 入門必読フラグ
  language: text("language").default("ja"),
  fetchedAt: text("fetched_at"),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ── 記事 ↔ Feature 中間テーブル ───────────────────────────────────────────
export const articleFeatures = sqliteTable(
  "article_features",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    featureId: text("feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.featureId] })]
);

// ── 記事 ↔ Tag 中間テーブル ───────────────────────────────────────────────
export const articleTags = sqliteTable(
  "article_tags",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.tagId] })]
);

// ── RSSソース ────────────────────────────────────────────────────────────────
export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  type: text("type", {
    enum: ["rss", "atom", "hn-api", "reddit-api", "github-atom"],
  }).notNull(),
  priority: text("priority", {
    enum: ["high", "medium", "low"],
  }).notNull(),
  label: text("label").notNull(),
  authorType: text("author_type", {
    enum: ["official", "influencer", "community", "media"],
  }).notNull(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ── 型エクスポート ─────────────────────────────────────────────────────────
export type Category = typeof categories.$inferSelect;
export type Feature = typeof features.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type ArticleStatus = "PENDING" | "DRAFT" | "PUBLISHED" | "REJECTED";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type ContentType = "news" | "tips" | "tutorial" | "case-study";

export type SourceRow = typeof sources.$inferSelect;

export type ArticleWithRelations = Article & {
  category: Category | null;
  features: Feature[];
  tags: Tag[];
};
