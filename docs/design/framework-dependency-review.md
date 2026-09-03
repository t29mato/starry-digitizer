# StarryDigitizer のフレームワーク依存(Vue / Vuetify)に関する批判的レビュー

作成日: 2026-09-03 / 対象: PR #306 時点の `worktree-starrydata3-integration`

## TL;DR

- Vue に「縛られている」のはコード全体の約半分(プレゼンテーション層 5,300 行)で、ドメイン/アプリケーション層(4,500 行)と Jest テスト(3,900 行)は Vue を一切 import していない。依存の実態は「Vue アプリ」ではなく「Vue UI を載せたエンジン」に近い。
- ただしエンジンは **単体では動かない**。状態変更の通知を Vue の `reactive()` に丸投げしており、`canvasHandler` が DOM の id を直接引いている。これは Vue の問題ではなく設計の問題で、Vue を剥がしても自動的には解決しない。
- 非 Vue ホストにとって本当に重いのは Vue 本体(gzip 32KB)ではなく、Vuetify(全量 88KB gzip + テーマ/CSS の衝突)と Handsontable(420KB gzip)である。
- 今すべきは UI の書き直しではなく、(1) エンジンから DOM/Vue を切り離す境界を引くこと、(2) React ホストが現れたときの選択肢を「iframe」か「マウントラッパー」に絞れる状態を作っておくこと。
- 「React ホストが具体的に存在し、iframe が要件上不可」になった時点で初めて、(c) エンジン分離 + 各フレームワーク UI を検討する。それまでの全面書き換えは投資回収の見込みがない。

## 1. 現状の依存の実態

### 1.1 層ごとの規模と Vue 依存

| 層 | ファイル数 | 行数(テスト除く) | `vue`/`vuetify` を import するファイル | 備考 |
|---|---:|---:|---|---|
| `src/domain` | 14 | 1,168 | 0 | 素の TS クラス(`Dataset`, `AxisSet` 等) |
| `src/application` | 48 | 3,323 | 1 (`digitizerContext.ts`) | `reactive` / `provide` / `inject` のみ |
| `src/presentation` | 51 | 5,301 | 36 の `.vue` + `digitizerOptions.ts` | Vuetify コンポーネント 31 種 / 約 110 箇所 |
| ルート(`main.ts`, `App.vue` 等) | 9 | 511 | 4 | スタンドアロン app 専用 |
| Jest テスト | 29 | 3,907 | 0 | `@vue/test-utils` 利用ゼロ |
| Cypress | 19 | 2,304 | (E2E) | DOM セレクタ経由で Vue UI に依存 |

ロジックの中核(座標変換、補間、抽出、履歴、DTO)は Vue を知らない。これは事実として良い状態で、「そもそも Vue に依存している」という問いに対しては「**UI 層だけが依存している**」が正確な答えになる。

### 1.2 「Vue ではなく設計」に起因する結合

Vue を剥がしても残る結合が 3 つある。こちらの方が本質的で、かつ小さい。

| 結合 | 場所 | 内容 |
|---|---|---|
| DOM id 直参照 | `application/services/canvasHandler/canvasHandler.ts` | `getElementById('imageCanvas'/'maskCanvas'/'tempMaskCanvas'/'magnifierMaskCanvas')`。加えて `presentation/dom/HTMLCanvas` を application 層が import しており、**層の依存方向が逆転**している |
| `document` 直接操作 | `projectService.ts`, `utils/projectFileOperations.ts` | `document.querySelector('canvas')` でサムネイル取得、`<a download>` / `<input type=file>` を生成 |
| 変更通知の不在 | `domain` / `application` 全体 | Observer / EventEmitter / subscribe が **一切ない**。UI が再描画されるのは `createDigitizerContext()` が全サービスを `reactive()` で包んでいるからに過ぎない |

3 点目が最も重要である。26 個のコンポーネントが `useDigitizerContext()` で取り出したリポジトリを直接叩き(呼び出しメソッド 43 種)、その副作用を Vue の Proxy が拾って再描画する。つまり「エンジンは Vue 非依存」だが「**エンジンの使い方は Vue 前提**」で、他フレームワークからこのエンジンを使うには変更通知機構を新設しなければならない。

## 2. Vue 依存の本当のコスト(非 Vue ホストの視点)

### 2.1 バンドルと二重フレームワーク

| 依存 | gzip 概算 | 性質 |
|---|---:|---|
| `vue` runtime | 32KB | React ホストなら丸ごと追加 |
| `vuetify` | 88KB(全量。tree-shake で 31 種に絞れば 40〜60KB) | 追加 + CSS 400KB(min、非 gzip) |
| `handsontable` | 420KB | **フレームワーク非依存**。Vue とは無関係に重い |
| `starry-digitizer` 本体 | 181KB(ES, 未 min) | うち Vue テンプレート由来はおよそ半分 |

Vue+Vuetify を React ページに載せる追加コストは概ね 120〜150KB gzip。無視できないが、Handsontable 1 つより小さい。「Vue だからバンドルが重い」は半分しか正しくない。

### 2.2 実際の手間と制約

- **マウントラッパー自体は小さい**。`createApp(StarryDigitizer, props).use(vuetify).mount(el)` を React の `useEffect` で包み、props 変更を `app.unmount()`+再 mount か `reactive` props で流す。30〜80 行。
- **Vuetify インスタンスとテーマ**が問題の中心。`v-app` 相当のレイアウトコンテキスト、`mdi` アイコンフォント、`vuetify/styles` のグローバル CSS(`html`/`body` のリセットを含む)をホストが読む必要がある。React + MUI/Tailwind のホストでは CSS リセットの衝突が高確率で起きる。`src/vuetify-style.css` は `.v-field` に `!important` を当てているが、これは app 専用のため lib には含まれない(良い判断)。
- **バージョン固定の連鎖**。peer は `vue ^3.3.4` / `vuetify ^3.3.13`、Starrydata3 は `vue 3.5.42` / `vuetify 3.13.3` で現状は問題ない。しかし Vuetify 4 が出ればホストと本ライブラリの同時追従が必須になる。Vuetify 2→3 では全コンポーネントの API が変わった前例がある。
- **iframe との比較**。iframe なら上記は全て消え、ホストは `postMessage` で `ProjectDTO` と `DatasetValues` をやり取りするだけでよい。失うのは Starrydata3 統合仕様が求めた「同一ページで複数インスタンス」「ホストのスナックバーでエラー表示」「データセット名候補のコンボボックス」等の密結合 UX。**Vue でないホストに限れば iframe の方が総コストは低い**。

## 3. 反対に、Vue 依存を今すぐ剥がすコスト

| 項目 | 規模 | 内容 |
|---|---:|---|
| Vue コンポーネント書き換え | 36 ファイル / 約 4,800 行 | `CanvasMain.vue`(565 行、マウス/キー処理)、`AxisSetSettings.vue`(487 行)が重い |
| Vuetify 部品の代替 | 31 種 | 特に `v-color-picker`, `v-combobox`, `v-select`, `v-dialog`, `v-menu`, `v-tooltip`, `v-snackbar`, `v-file-input` は自作が高コスト |
| 変更通知機構の新設 | 新規 | §1.2 の通り。エンジン全体に `subscribe()` か immutable 化を入れる必要がある。ドメインクラスは可変(`points` を直接 `push`)なので影響は広い |
| Jest | 影響ほぼゼロ | Vue に依存していないため |
| Cypress | 19 ファイル / 2,300 行 | セレクタと Vuetify のクラス名に依存しており、UI を替えれば大半が要修正 |
| Handsontable | `@handsontable/vue3` のみ差し替え | 本体は非依存 |

概算で **2〜3 人月**。しかも書き換えても機能は増えず、現在の唯一のホスト(Vue)には利益がない。

## 4. 選択肢の比較

| 選択肢 | 向く状況 | 工数感 | 主な欠点 |
|---|---|---:|---|
| (a) 現状維持 + 非 Vue 用の薄いマウントラッパー | 当面のホストが Vue のみ。React が来ても「動けばよい」 | 1〜3 日 | Vuetify の CSS/テーマ衝突はホスト側で吸収。二重フレームワーク 120〜150KB gzip |
| (b) Vuetify だけ剥がして素の Vue に | ホストが Vue だが Vuetify でない(Quasar/PrimeVue/Tailwind)可能性がある | 3〜5 週 | 31 種の部品を自作。得るものは Vuetify 非依存だけで、React 問題は解決しない |
| (c) エンジン(domain+application+canvas 描画)を別パッケージ化、Vue UI はリファレンス実装 | React ホストが確定し、iframe が不可 | 4〜8 週(エンジン境界と通知機構) + UI ごとに 6〜10 週 | 設計としては最も正しいが、UI を 2 つ保守することになる。単独開発体制では現実的でない |
| (d) Web Components(custom elements) | 「どのホストでも `<starry-digitizer>` 1 タグ」を売りにしたい | 2〜4 週 | Vue の `defineCustomElement` で作れるが、Vuetify は Shadow DOM 内で CSS/テレポート(`v-dialog`, `v-menu`)が壊れやすい。Vuetify を剥がす (b) が前提になり、結局 (b)+2〜4 週 |
| (e) 完全に framework-less で書き直し | 依存ゼロが最優先 | 3〜4 人月 | 状態管理・再描画を自前実装。canvas 部分以外の DOM UI で車輪の再発明 |

(d) は Vuetify 前提では成立しない点に注意。Vuetify の `v-dialog`/`v-menu`/`v-tooltip` は `<body>` 直下へテレポートするため、Shadow DOM 境界でスタイルが外れる。

## 5. 推奨

### 今すべきこと(Vue を維持したまま)

1. **エンジンから DOM を追い出す**。`canvasHandler` に `HTMLCanvasElement` を id ではなくコンストラクタ/`attach()` で渡す。`projectService` のサムネイル取得と `<a download>` を presentation 側へ移す。application → presentation の逆依存(`HTMLCanvas` import)を解消する。1 週間以内。これは (a)〜(e) の **どれを選んでも必要**になる。
2. **変更通知の穴を認識しておく**。今すぐ Observer を入れる必要はないが、「Vue の `reactive()` がエンジンの通知機構を代替している」ことを `digitizerContext.ts` のコメントに明記し、ドメインクラスへの直接変更を新たに増やさない。
3. **(a) のマウントラッパーをサンプルとして 1 つ置く**(`examples/` に framework-less の `mount(el, props)` 例)。React ホストの可否をコード 50 行で判断できるようにする。
4. **Handsontable の再検討**。フレームワークに関係なく最大の依存(420KB gzip、13 系は商用ライセンスキー要)。CSV 表示だけなら `<table>` で足りる可能性が高い。

### 今すべきでないこと

- (b)(c)(e) の着手。現時点のホストは Vue+Vuetify の Starrydata3 のみで、非 Vue ホストは仮説に過ぎない。仮説のために 2〜3 人月を使うより、Starrydata3 統合の完成に充てるべきである。
- 「将来のため」に Vuetify 部品を減らす部分的な書き換え。中途半端な二重実装が最も保守コストが高い。

### 「React ホストが現れたら」の判断基準

| 条件 | 判断 |
|---|---|
| ホストが 1 つで、UX 要件が「画像 + ProjectDTO を渡して結果を受け取る」で足りる | **iframe + postMessage**。Vue 問題は消える |
| 同一ページ複数インスタンスや、ホストのスナックバー/テーマ統合が必須 | まず **(a) マウントラッパー**で 1 週間試し、Vuetify の CSS 衝突が実用上許容できるか確認する |
| (a) で衝突が許容できず、そのホストの継続利用が確定している | **(c) エンジン分離**。ただし Vue UI は捨てず、React UI は必要最小限(表示 + 手動打点)から始める |
| 3 フレームワーク以上からの利用が見込まれる | (c) の上で (d) を検討。この時点で Vuetify を剥がす (b) が前提になる |

結論として、「Vue に依存していること」自体は現時点で妥当な判断であり、問題があるとすれば依存の場所ではなく、**エンジンが単独で立てない設計**(DOM id 結合と通知機構の不在)の方である。そこを先に直しておけば、フレームワークの選択は後から安く変えられる。
