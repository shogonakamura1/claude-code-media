# Git ワークフロー

## コミットメッセージ
- Conventional Commits形式を使用する: feat:, fix:, docs:, test:, chore:, refactor:
- コミットメッセージは70文字以内に収める
- 「なぜ」を重視し、「何を」は差分から分かるようにする

## コミット前チェック
- `npm run build` が通ることを確認
- `npx tsc --noEmit` で型エラーがないことを確認
- `npm run test` でテストが通ることを確認
- console.log が残っていないことを確認

## ブランチ運用
- **Git Flow**: `main`（本番） ← `develop`（開発ベース） ← `feat/xxx`（機能ブランチ）
- featureブランチは必ず `develop` から切る（mainから直接切らない）
- PRのマージ先は `develop`。リリース時に `develop` → `main` にマージ
- mainブランチへのforce pushは禁止
- PRマージ前にビルド・テスト・型チェックをパスさせる
- PRマージはオーナーが手動で行う（Claudeが勝手にマージしない）

## コミット対象外
- `.env`, `.env.local` などの環境変数ファイルは絶対にコミットしない
- `credentials.json` などのシークレットファイルはコミットしない
- `node_modules/` はコミットしない
- 大きなバイナリファイルは避ける
