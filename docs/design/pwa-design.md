# 実装設計: PWA化(HQ #59, 最小版)

## スコープ

「ホーム画面に追加してインストールでき、静的アセットがオフラインでもある程度動く」最小版。
プッシュ通知・バックグラウンド同期・オフラインでの画像処理結果の永続化のような高度な機能は
対象外。

## 方針

- 手書きのService Workerではなく `vite-plugin-pwa`(内部で Workbox を使用)を採用する。
  Viteプロジェクトでのデファクトであり、manifest生成・Service Worker生成・登録スクリプトの
  注入を自動化できるため、手書きより実装・保守コストが低い
- アイコン: HQ #56のロゴA案は本チケットの対象外(オーナーが#56自体を却下し、ロゴ対応は
  別途仕切り直しとHQから指示があったため、今使うのは適切でない)。代わりに既存の
  `public/favicon.ico`(既存ブランドとして本番で既に使われている"SD"モノグラム)を
  192px/512pxにリサイズしたものを暫定アイコンとして使う。ロゴが正式決定した際に
  差し替える前提の暫定品質である旨をここに明記しておく
- キャッシュ戦略はvite-plugin-pwaの `generateSW` モード(デフォルト)のprecache
  (ビルド成果物の静的アセットを事前キャッシュ)のみを使う。APIコールは元々存在しない
  (アプリはクライアントサイド完結)ため、ランタイムキャッシュの追加設定は不要
- `registerType: 'prompt'` — 新デプロイを検知したら即時自動更新はせず、
  `PWAUpdatePrompt.vue` のポップアップ(v-snackbar)でユーザーに更新を促す。
  「Reload」で `updateServiceWorker(true)`(skipWaiting + リロード)、
  「Later」で見送り(次回リロード時に再度表示される)

## アップデート通知とリリースノート表示

- リリースノートはリポジトリルートの `release-notes.json` で管理する
  (キー: `package.json` の `version`、値: 変更点の文字列配列)
- ビルド時に `vite.config.js` のインラインプラグイン(`emit-version-json`)が
  `version.json`(`{ version, notes }`)を成果物に出力する
- `version.json` はWorkboxのprecache対象から除外している(`globIgnores`)。
  旧Service Workerのキャッシュから古い版が返ると「新バージョンの内容」を
  表示できないため、必ずネットワークから取得する(加えてキャッシュバスター
  クエリ + `cache: 'no-store'` でHTTPキャッシュも回避)
- 新Service Workerの待機を検知(`onNeedRefresh`)したら `version.json` を
  取得し、新バージョン番号と変更点をポップアップに表示する。取得失敗時や
  バージョン番号が変わらない再デプロイ時は、バージョン詳細なしの汎用文言で
  ポップアップだけ表示する
- PWAウィンドウは長時間開きっぱなしになりがちなので、1時間ごとに
  `registration.update()` を呼び、開いたままでも更新を検知できるようにする
- リリース時の運用: `package.json` の `version` を上げ、`release-notes.json` に
  同じバージョンキーで変更点を追記する(追記を忘れた場合は変更点リストが
  空のポップアップになるだけで、動作は壊れない)

## 変更箇所

- `vite.config.js`: `VitePWA` プラグインを追加し、`manifest` オプションでアプリ名・
  アイコン・テーマカラーを設定。`version.json` を出力するインラインプラグインも追加
- `release-notes.json`: バージョンごとの変更点(アップデートポップアップに表示)
- `src/presentation/components/Generals/PWAUpdatePrompt.vue`: 更新通知ポップアップ
  (`App.vue` にマウント。開発サーバーではService Worker未登録のため表示されず、
  Cypress E2Eにも影響しない)
- `public/`: `pwa-192.png` / `pwa-512.png`(ロゴA案から生成済みのサイズを流用)
- ビルド成果物に `manifest.webmanifest` と `sw.js`(+ Workboxランタイム)が生成される。
  `index.html` へのリンクタグ挿入はプラグインが自動で行う(`injectRegister: 'auto'`)

## 実装中に確認したこと(HQ #39の教訓を踏まえて)

`vite-plugin-pwa` はビルド時にService Worker/manifestを生成するだけで、pdfjs-distのような
「ランタイムで巨大なライブラリをevalする」構成ではないため、PDF importで踏んだ
「未使用機能なのにアプリ全体がクラッシュする」种の問題は原理的に起きにくい。とはいえ念のため、
組み込み後に既存Cypress E2Eスイートをローカルで実際に実行し、影響がないことを確認してから
コミットする。

## 完了条件

- `npm run app-dev-build` の成果物に `manifest.webmanifest` と `sw.js` が生成されること
- 既存Cypress E2E 5ファイルが全通過すること(機能不変の確認)
- Vercelプレビューで実際に manifest.webmanifest が200で取得できること(実機確認)
