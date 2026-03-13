-- カテゴリ
INSERT INTO categories (id, slug, name, color, "order") VALUES
  ('cat_news', 'news', 'ニュース', '#FF6B35', 1),
  ('cat_tips', 'tips', 'Tips', '#3B82F6', 2),
  ('cat_tutorial', 'tutorial', 'チュートリアル', '#10B981', 3),
  ('cat_case', 'case-study', '事例・ハック', '#8B5CF6', 4);

-- Claude Code 機能タグ
INSERT INTO features (id, slug, name, name_en, description, icon, docs_url, "order") VALUES
  ('feat_skills', 'skills', 'スキル', 'Skills', 'カスタムスラッシュコマンド。SKILL.mdで定義する再利用可能なプロンプトとワークフロー。', '⚡', 'https://docs.anthropic.com/en/docs/claude-code/skills', 1),
  ('feat_hooks', 'hooks', 'フック', 'Hooks', 'ツール実行前後に自動実行されるシェルスクリプト。lintやテストの自動化に活用。', '🪝', 'https://docs.anthropic.com/en/docs/claude-code/hooks', 2),
  ('feat_subagents', 'sub-agents', 'サブエージェント', 'Sub-agents', 'Agentツールで起動する並列タスク実行エージェント。複数タスクを同時に処理できる。', '🤖', 'https://docs.anthropic.com/en/docs/claude-code/sub-agents', 3),
  ('feat_orchestration', 'orchestration', 'オーケストレーション', 'Orchestration', '複数エージェントの協調・調整パターン。複雑なタスクを分割して並列実行。', '🎼', 'https://docs.anthropic.com/en/docs/claude-code/orchestration', 4),
  ('feat_mcp', 'mcp', 'MCP', 'MCP', 'Model Context Protocol。外部ツール・データソースをClaudeに接続する標準プロトコル。', '🔌', 'https://docs.anthropic.com/en/docs/claude-code/mcp', 5),
  ('feat_claudemd', 'claude-md', 'CLAUDE.md', 'CLAUDE.md', 'プロジェクトコンテキスト設定ファイル。Claudeの振る舞いをプロジェクトに合わせて定義。', '📄', 'https://docs.anthropic.com/en/docs/claude-code/memory', 6),
  ('feat_memory', 'memory', 'メモリ', 'Memory', 'セッションを跨いだ情報の永続化。プロジェクト固有の知識を蓄積する。', '🧠', 'https://docs.anthropic.com/en/docs/claude-code/memory', 7),
  ('feat_permissions', 'permissions', 'パーミッション', 'Permissions', 'allow/denyによるツール実行制御。安全な自動化のためのアクセス制御。', '🔐', 'https://docs.anthropic.com/en/docs/claude-code/settings', 8),
  ('feat_keybindings', 'keybindings', 'キーバインド', 'Keybindings', 'キーボードショートカットのカスタマイズ。作業効率を高める独自ショートカット設定。', '⌨️', 'https://docs.anthropic.com/en/docs/claude-code/keybindings', 9),
  ('feat_worktrees', 'worktrees', 'ワークツリー', 'Worktrees', 'Gitワークツリーによる並列作業の分離。複数ブランチを同時に安全に操作できる。', '🌿', 'https://docs.anthropic.com/en/docs/claude-code/worktrees', 10);
