CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`type` text NOT NULL,
	`priority` text NOT NULL,
	`label` text NOT NULL,
	`author_type` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);

-- Seed: initial sources
INSERT OR IGNORE INTO `sources` (`id`, `url`, `type`, `priority`, `label`, `author_type`) VALUES
  ('github-releases', 'https://github.com/anthropics/claude-code/releases.atom', 'github-atom', 'high', 'GitHub Releases (claude-code)', 'official'),
  ('tomoam-zenn', 'https://zenn.dev/tomoam/feed', 'rss', 'high', 'tomoam (Zenn)', 'influencer'),
  ('boris-tane', 'https://boristane.com/rss.xml', 'rss', 'medium', 'Boris Tane', 'influencer'),
  ('simon-willison', 'https://simonwillison.net/atom/everything/', 'atom', 'high', 'Simon Willison', 'influencer'),
  ('thorsten-ball', 'https://registerspill.thorstenball.com/feed', 'rss', 'medium', 'Thorsten Ball (Register Spill)', 'influencer'),
  ('swyx-blog', 'https://www.latent.space/feed', 'rss', 'medium', 'swyx (Latent Space)', 'influencer'),
  ('zenn', 'https://zenn.dev/topics/claudecode/feed', 'rss', 'medium', 'Zenn', 'community'),
  ('qiita', 'https://qiita.com/tags/claudecode/feed', 'rss', 'medium', 'Qiita', 'community'),
  ('devto', 'https://dev.to/feed/tag/claudecode', 'rss', 'low', 'dev.to', 'community'),
  ('hn', 'https://hn.algolia.com/api/v1/search?query=claude+code+anthropic&tags=story&hitsPerPage=20', 'hn-api', 'medium', 'Hacker News', 'community'),
  ('reddit', 'https://www.reddit.com/r/ClaudeAI/search.json?q=claude+code&sort=new&limit=20&restrict_sr=1', 'reddit-api', 'medium', 'Reddit r/ClaudeAI', 'community'),
  ('note-claudecode', 'https://note.com/hashtag/ClaudeCode?rss', 'rss', 'medium', 'note.com', 'community'),
  ('the-verge-ai', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', 'rss', 'low', 'The Verge AI', 'media'),
  ('techcrunch-ai', 'https://techcrunch.com/category/artificial-intelligence/feed/', 'rss', 'low', 'TechCrunch AI', 'media');
