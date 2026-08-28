# UI Refresh 実装ノート (HQ Issue #56)

`docs/design/ui-refresh-spec.md` を元にした実装スコープと、意図的に外した/変更した点の記録。**ロジック層(application/domain)には一切触れず、Vueコンポーネントのテンプレート構成とスタイルのみを変更する。**

## 実装した項目

1. **左サイドバーをステップ・アコーディオンに再編**(`StarryDigitizer.vue`)
   - `v-expansion-panels`(accordion variant)で ①Image ②Axes ③Extract ④Data & Export の4ステップに再構成
   - ③Extract に `extractor-settings`(Manual/Automatic抽出)を右サイドバーから移動。コンポーネント自体は無変更、置き場所のみ変更のため、`#line-extract-dx` 等の既存E2Eセレクタはそのまま残る
   - 各ステップ見出しに完了チェック(✓)を追加。判定は既存の状態(`canvasHandler.uploadImageUrl` の有無、`axisSetRepository.activeAxisSet.hasAtLeastOneAxis`、`datasetRepository` の点の有無)を読むだけの新規computedで、ドメイン層のメソッド呼び出しは一切行わない
2. **アプリバー新設**(`App.vue`): 高さ48pxの薄いバーにロゴ+アプリ名+`project-manager`(保存/読込)を配置。`project-manager` は `StarryDigitizer.vue` から `App.vue` 直下へ移動
3. **右サイドバー**: Magnifier + カード化した「Cursor readout」(x,y)。`MagnifierMain.vue` に表示専用の変換関数を追加し、`Infinity`/`NaN` を `—` に置換(`AxisSetCalculator` の計算結果自体は変更しない、表示直前のフォーマットのみ)
4. **視覚システム**: `App.vue` にscopedでない追加`<style>`ブロックを設け、8pxグリッド寄りの余白・ボタンのALL CAPS解除(`text-transform: none`)・背景色 `#FAFAFA`・カード境界線などをグローバルに適用
5. **フッター**: `v-footer` を1行の細いバーに縮小

## 意図的に対象外にした項目(理由つき)

- **Undo/Redoボタンのアプリバー常設**: PR #248(Undo/Redo)は本ブランチの元になった `develop` にまだマージされていないため、対応するコンポーネント自体が存在しない。#248マージ後に別PRで対応する
- **ズームコントロールのアプリバー移設**: `CanvasHeader.vue` は `#reset-canvas-scale` 等、複数のE2Eテストが直接依存するIDを持つ。移設によるセレクタ破壊のリスクを避けるため、現状の位置(キャンバス直上)を維持する。キャンバスに隣接した位置自体はUXとして妥当と判断
- **フッターの色**: 本番/非本番でフッター色を変える既存の仕組み(`isProd ? 'primary' : 'orange'`)は「今どの環境を見ているか」をひと目で示す安全装置として機能している可能性があるため、色分け自体は維持しつつ薄い1行の帯に縮小するに留めた(完全な単色ニュートラル化はしない)
- **「Try with sample」リンクへの格下げ**、アイコンボタン全数へのツールチップ監査: 変更範囲を抑えるため今回は対象外

## オーナーフィードバック反映(2026-08-29)

オーナーがプレビューを確認し、HQ経由で以下が確定した:

- **ロゴA案(星座モチーフ)を採用**。`docs/design/brand/starry-logo.svg` および各サイズPNGをアプリバーのロゴ・favicon(`index.html`)に組み込んだ。B案/C案の素材(`starry-logo-b*`, `starry-logo-c*`)は不採用のためブランチから削除
- **アコーディオンは廃止**。①〜④のグルーピングと配置(Extractor Settingsを左サイドバー③に置く等、Phase 1の配置)はそのまま維持しつつ、`v-expansion-panels` によるクリックで開閉する構造をやめ、常に全ステップが表示された状態の静的な見出し(番号のみ、完了チェックのトグルなし)に変更した

## 完了条件の担保

- 既存Cypress E2E(`spec.cy.ts`, `spec.interpolation.cy.ts`, `spec.data-table.cy.ts`, `spec.upload-figure-image.cy.ts`, `spec.multiplyAxesValues.cy.ts`)を移動前後でローカル実行し、全通過を確認する
- Jest, `eslint src`, `vue-tsc`, `dependency-cruiser` も同様にグリーンであることを確認する
