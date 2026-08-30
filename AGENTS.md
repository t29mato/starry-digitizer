# AGENTS.md

このリポジトリで作業するAIエージェント向けの実務メモ。「新しくワークスペースを立ち上げた時にデプロイ方法が分からない」を防ぐためのもの。運用ルール(ブランチ運用の是非、本番リリース可否など)は `CLAUDE.md` が正で、本ファイルはその下で実際に何が・どのトリガーで・どこにデプロイされるかを説明する。

## セットアップ

- Node.js 22
- パッケージマネージャ: **yarn**(CIは全てyarnを使用)。`package-lock.json` も存在するが、CI/デプロイの実体はyarn。混在させない。
  ```bash
  yarn install
  yarn dev          # 開発サーバー起動 http://localhost:8888
  yarn lint         # eslint + vue-tsc
  yarn test         # jest
  yarn test:coverage
  yarn cypress:open # Cypress E2E(ローカル)
  ```

## デプロイの自動化(GitHub Actions × Vercel)

3本のworkflowが全て `.github/workflows/vercel-*.yaml` にあり、それぞれ別トリガー・別環境。

| トリガー | 環境 | ジョブの流れ | workflowファイル |
|---|---|---|---|
| 任意ブランチへの **PR作成/更新** | Vercel Preview(PRごと) | UnitTest(lint+test+coverage→Codecov) → Deploy-Preview → Slack通知。E2E(Cypress)は **base branchがmainの時のみ** 実行([#211](https://github.com/t29mato/starry-digitizer/issues/211)参照) | `vercel-preview-development.yaml` |
| **developへのpush**(PRマージ含む) | Vercel Preview(develop固定URL) | UnitTest → Deploy-Develop → Slack通知 | `vercel-develop-deployment.yaml` |
| `v[0-9]+.[0-9]+.[0-9]+` 形式の **タグをpush** | 本番(Vercel Production) + npm公開 | UnitTest, E2E-Test → (バージョン一致検証) → Deploy-Production-on-Vercel と Publish-Production-on-NPM を並列実行 → Slack通知 | `vercel-production-deployment.yaml` |

補足:
- 本番デプロイ・npm公開のジョブはどちらも「タグ名のバージョン」と `package.json` の `version` が一致しているかを検証してから実行する(不一致ならジョブがfailする)。
- Vercelの認証情報は `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` / `VERCEL_TOKEN` の repo secrets。ローカルでVercel CLIを直接使う場合は `vercel link` で作られる `.vercel/`(git管理外)にプロジェクト情報が入る。Vercelプロジェクト名: `starrydigitizer`。
- Slack通知先は `DIGITIZER_DEV_SLACK_WEBHOOK`。

## このリポジトリでの制約(CLAUDE.mdより、要点のみ)

- **タグ作成・GitHub Release・npm公開・mainへの反映(本番リリース)はAIエージェントが自分の判断で行わない。** 上表の通りタグpushが本番デプロイ+npm公開の引き金になるため、タグを打つ行為そのものが実質「本番リリース」であることに注意。人間の承認を経ること。
- **mainへの直接pushは禁止。** `develop` を基点に featureブランチ → `develop` へのPRのみで進める。
- 詳細・背景は `CLAUDE.md` を参照。

## 参考

- `README.md`: プロダクト概要・機能一覧・使い方
- `CLAUDE.md`: このリポジトリで作業するAIエージェント(ワーカー)向けの運用ルール・品質方針
