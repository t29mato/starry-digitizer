# 設計メモ: core を切り出す前に解く2つの問題

作成日: 2026-09-04
対象: [issue #307](https://github.com/t29mato/starry-digitizer/issues/307)「entry point を core / vue / 既定 の 3 つに分ける」
前提: [`framework-dependency-review.md`](./framework-dependency-review.md)(Vue/Vuetify 依存の批判的レビュー)

## TL;DR

- **#307 の方向に賛成する。** 5 件の要望がすべてレイアウトの都合だったという指摘は正しく、境界が presentation にある限り要望の往復は終わらない。
- ただし現状の `domain` + `application` をそのまま `core` として配ると、2 つの理由で期待どおりには動かない。
  1. **変更通知を Vue の `reactive()` に外注している。** ドメイン層に observer が一切なく、Vue の Proxy が直接ミューテーションを観測することで UI が再描画されている。Vue を外すと「状態は変わるが誰も気づかない」core になる。
  2. **`core` は DOM ツリーには依存しないが、ブラウザには依存する。** canvas 2D コンテキスト、`Image`、`FileReader`、`fetch` が必要で、素の Node では動かない。「Vue なし・DOM なし」という表の記載は、正確には「**Vue なし・DOM ツリーなし・ブラウザは必要**」になる。
- 良い知らせとして、**一番価値のある部分は既に純粋**である。抽出アルゴリズムは `(height, width, Uint8ClampedArray, Uint8ClampedArray, boolean, [r,g,b], number) => Coord[]`(`extractStrategyInterface.ts:6-14`)で、canvas も Vue も知らない。座標変換 `AxisSetCalculator` と DTO のマイグレーションも同様。
- したがって切り出しの線は「domain+application を core にする」ではなく、**「純粋な計算」「ブラウザ依存の入出力」「Vue の UI」の 3 層**に引くのが正しい。問題 1 は `@vue/reactivity` を使えば**コード変更ほぼゼロ**で解ける。問題 2 は当面「ブラウザ必須」と明示するだけでよく、Node 対応は必要になってから。

---

## 1. 問題A: 変更通知が Vue に外注されている

### 1.1 事実

`createDigitizerContext()` は 9 つのサービスをまとめて `reactive()` で包んでいる
(`src/application/digitizerContext.ts:67-81`)。`domain` + `application` の 62 ファイル・4,514 行のうち、
**`vue` を import しているのはこの 1 ファイルだけ**で、しかも `inject` / `provide` / `reactive` の 3 つだけである。
`src/domain/` には `vue` の import が 1 つもない。同ファイルには既にこの注記がある。

(Phase 1 でここは解消済み。`reactive` は `@vue/reactivity` から import するようになり、
`provide` / `inject` は `src/presentation/digitizerContextProvider.ts` に移した。
現在 `domain` + `application` に `vue` の import は 1 つもない。→ §4)

> this `reactive()` wrapper is the ONLY change-notification mechanism the engine has. Domain/application classes expose no observer/subscribe API; the UI re-renders because Vue's Proxy observes direct mutations made by components on repositories/services.

コンポーネントはリポジトリやドメインエンティティのプロパティを**直接書き換えている**。
実地調査の結果、書き込み箇所は **20 件**(プレーンな代入 16、`v-model` 4)で、内訳は
**ドメインエンティティへの書き込み 10 件**と **`canvasHandler` のプロパティへの書き込み 10 件**。
`src/App.vue` と `src/presentation/**/*.ts` には 1 件もない。典型例:

```ts
axisSetRepository.activeAxisSet.xIsLogScale = Boolean($event)   // AxisSetSettings.vue
axisSetRepository.activeAxisSet.isVisible = !isVisible          // App.vue
v-model="dataset.name"                                          // DatasetManager.vue
```

つまり **「エンジンは Vue 非依存」だが「エンジンの使い方は Vue 前提」** である。

数としては多くない(20 件)ので、A-3(通知の自前実装)も**非現実的ではない**。ただし
`canvasHandler` への 10 件はモード切替(`manualMode` / `maskMode`)で、すでに
`setManualMode()` / `setMaskMode()` というメソッドが存在するのに代入で書かれている。
まずそこを揃えるだけで実質 10 件まで減る。

### 1.2 なぜ core で致命的か

React ホストが `starry-digitizer/core` を import して `datasetRepository.activeDataset.addPoint(x, y)` を呼んでも、**再描画のきっかけが存在しない**。ホストは以下のいずれかを強いられる。

- 毎フレーム状態をポーリングする
- 操作のたびにホストが手動で「変わったはず」と宣言する
- 結局 Vue を入れる

どれも `core` を配る意味を失わせる。

### 1.3 選択肢

| 案 | 内容 | 利点 | 欠点 | 工数 |
|---|---|---|---|---|
| A-1 | **`core` は状態を持たない純粋関数だけにする**(計算・DTO・アルゴリズム)。状態は `vue` entry に残す | 今日すぐ出せる。嘘がない | ホストは「点を打つ」等の状態操作を自作することになる | 数日 |
| A-2 | **`@vue/reactivity` にだけ依存する** core。`reactive()` をそこから import し、購読は `effect()` を再エクスポート | **コード変更がほぼゼロ**。React/Svelte からも `effect(() => ...)` で購読できる(このパッケージはレンダラを含まない独立ライブラリ) | 「依存ゼロ」ではなくなる。ただし依存は 1 つで、Vue ホストなら `vue` に同梱済み | 1〜2 日 |
| A-3 | 自前の observer/EventEmitter をリポジトリとサービスに実装 | 依存ゼロ。通知の粒度を設計できる | 直接ミューテーションを全部サービスメソッド経由に書き換える必要がある。既存の Undo/Redo・履歴と噛み合わせる作業も伴う | 2〜4 週 |
| A-4 | `reactive` を自前実装(Proxy ベース) | 依存ゼロ | Vue の再実装。バグの温床で、得るものが A-2 と変わらない | 却下 |
| A-5 | signal ライブラリを追加(`@preact/signals-core` 等) | 小さい | A-2 と同じ性質で、Vue ホストには余分な依存になる | 却下 |

### 1.4 推奨

**A-2 を採る。** 理由は 3 つ。

1. `@vue/reactivity` は Vue のレンダラから独立して公開されているライブラリで、**非 Vue のプロジェクトでも普通に使われている**。「Vue に依存する core」ではなく「reactivity ライブラリに依存する core」になる。
2. 既存コードの書き換えが要らない。直接ミューテーションのスタイルをそのまま維持できる。
3. Vue ホストにとっては実質ゼロコスト(`vue` パッケージが同じものを内包している)。

そのうえで、**中期的には直接ミューテーションを減らす**(A-3 の方向)。ただしこれは #307 のためではなく、Undo/Redo の履歴取得点を 1 箇所にまとめるという別の動機で価値がある。現在は `historyManager.capture()` をコンポーネント側が呼び忘れると履歴が飛ぶ構造になっている。

#### API のかたち(実装済み)

```ts
// starry-digitizer/core
import { createDigitizerContext, effect } from 'starry-digitizer/core'

const ctx = createDigitizerContext()

// 非 Vue ホストの購読
const stop = effect(() => {
  // ctx から読んだものが変わるたびに走る
  render(ctx.datasetRepository.activeDataset.points.length)
})
stop()
```

`@vue/reactivity` を core からそのまま再エクスポートするだけでよい。**新しい概念を発明しない**のが要点。
Phase 1 で実際に再エクスポートしたのは
`effect` / `stop` / `computed` / `ref` / `reactive` / `readonly` / `effectScope` と
ガード類(`isReactive` / `isRef` / `unref` / `toRaw` / `markRaw`)、および型 `ReactiveEffectRunner`
(`src/core-main.ts`)。

**`watch` は再エクスポートしていない。**当初案には `effect` / `watch` / `computed` と書いたが、
`watch` が `@vue/reactivity` に入ったのは **Vue 3.5** からで、peer の下限は `^3.3.4` である。
3.3 系のホストで `watch` を export すると解決できない import になるため外した。
購読の用途は `effect` で足り、Vue ホストは `vue` の `watch` をそのまま使える。

実地確認(2026-09-04): `@vue/reactivity` は独立したパッケージとして公開されており、
`vue` パッケージは `effect` をそのまま再エクスポートしている(`typeof require('vue').effect === 'function'`)。
したがって Vue ホストでは追加のインストールもバンドル増加も発生しない。

### 1.5 単一コピー問題(`@vue/reactivity` を external にする理由)

リアクティビティのランタイムは、ホストの中で **1 コピーでなければならない**。
`@vue/reactivity` をライブラリ側にバンドルすると、ホストの `vue` が持つコピーとライブラリのコピーの
2 つが存在することになり、ライブラリが作った `reactive` オブジェクトのミューテーションを
Vue のレンダラ側の effect が追跡できない(依存の登録先が別モジュールの WeakMap になるため)。
症状は「状態は変わるが再描画されない」で、例外は出ないので発見が遅れる。

このため `vite.library.config.ts` の `external` に `/^@vue\/reactivity$/` を加え、
`vue` と同じくホストの解決に委ねている。`package.json` でも `dependencies` ではなく
`peerDependencies`(`^3.3.4`)に置いている。

実地確認(2026-09-04、この worktree の `node_modules`): `vue@3.3.4` / `@vue/reactivity@3.3.4` で

```
require('vue').reactive === require('@vue/reactivity').reactive  // => true
```

`vue` は `@vue/reactivity` に依存しており、npm/yarn が両者を hoist して 1 コピーに解決するため、
Vue ホストでは何もしなくても同一物になる。

**ただし保証ではない。** ホスト側で `vue` と `@vue/reactivity` のバージョンがずれた場合
(片方だけを pin する、複数のパッケージが別レンジを要求する等)、解決順によっては
`node_modules/@vue/reactivity` と `node_modules/vue/node_modules/@vue/reactivity` が
並存しうる。そのときは上の等値が `false` になり、再描画が止まる。
README にも同じ注意を書いた(「Choosing an entry point」)。バージョンを揃えるか
`resolutions` / `overrides` で重複排除するのが対処になる。

---

## 2. 問題B: DOM ではなくブラウザに依存している

### 2.1 事実

`src/domain` と `src/application` に残るブラウザ API 依存は次のとおり。DOM ツリーの探索(`getElementById` / `querySelector`)は既に排除済みで、要素は `canvasHandler.attachCanvases()` で注入する形になっている。

| 用途 | API | 場所 | Node で代替可能か |
|---|---|---|---|
| ピクセル取得(自動抽出・色抽出) | `document.createElement('canvas')` + 2D context | `canvasHandler.ts` の `originalImageCanvasColors` / `originalSizeMaskCanvasColors` / `colorSwatches` / `resize` の 4 箇所 | node-canvas 等で可 |
| 画像のデコード | `new Image()` | `canvasHandler.ts`(`initializeImageElement` / `clearImage`) | node-canvas の `loadImage` で可 |
| 画像の読み込み | `FileReader`, `fetch` | `imageLoader.ts`, `projectService.ts` | Node 18+ の `fetch` と `Buffer` で可 |
| 描画(表示) | 注入された `HTMLCanvasElement` | `canvasHandler`, `application/canvas/HTMLCanvas.ts` | 表示は不要なのでスキップ可 |
| 軸ラベルの OCR | `HTMLImageElement` + `tesseract.js`(動的 import) | `services/axisOcr/axisOcrReader.ts:30,35` | 可(ただし WASM の配信が要る) |
| 設定の永続化 | `localStorage` | `utils/localStorageUtils.ts`(`:40` に `typeof` ガードあり) | ガード済みなので Node でも落ちない |
| CSV コピー | `navigator.clipboard.writeText` | `utils/dataExport.ts:49` | 不要な機能としてスキップ可 |

つまり **「DOM ツリーは要らないが、canvas と画像デコードは要る」**。`core` の約束を「Vue なし・DOM なし」と書くと、Node で `import 'starry-digitizer/core'` した利用者が実行時に落ちる。

**`src/domain/` にはブラウザ API が 1 つもない**(実地調査で確認)。1,168 行・14 ファイルのこの層は、
今日そのまま Node で動く。将来 `core/pure` を切り出すときの土台はここになる。

### 2.2 既に純粋なもの(ここが資産)

| 対象 | シグネチャ / 性質 | 根拠 |
|---|---|---|
| 抽出アルゴリズム | `execute(height, width, imageColors: Uint8ClampedArray, maskColors: Uint8ClampedArray, isDrawnMask, targetColor, threshold): Coord[]` | `extractStrategyInterface.ts:6-14` |
| 座標変換 | `AxisSetCalculator.calculateXYValues(xPx, yPx)` — 対数・傾き補正込みの純粋計算 | `domain/services/axisSetCalculator.ts` |
| 物理量変換 | `getDatasetValues(axisSetRepo, datasetRepo, digits)` | `application/utils/datasetValues.ts` |
| DTO とマイグレーション | `migrateProject(unknown): ProjectDTO` | `application/dto/projectDTO.ts` |
| 補間 | `getInterpolatedCoordsList()` — canvas への描画は `InterpolatorCanvasInterface` に分離済み | `application/lib/CurveInterpolatorLib.ts` |

**ライブラリの本当の価値は UI ではなく計算だ**、という #307 の主張はここで裏づけられる。そしてその計算部分は、既に canvas も Vue も知らない。

### 2.3 選択肢

| 案 | 内容 | 利点 | 欠点 | 工数 |
|---|---|---|---|---|
| B-1 | **`core` は「ブラウザ必須」と明示する**。実装は今のまま | 今日出せる。嘘がない | Node バッチはできない | 0 |
| B-2 | ピクセル取得を `PixelSource` ポートに切り出し、ブラウザ実装と node-canvas 実装を分ける | Node バッチ(大量の図の一括再抽出、回帰テスト)が可能になる | `canvasHandler` の分解が要る。node-canvas は optional dependency 扱いにする必要 | 1〜2 週 |
| B-3 | `canvasHandler` を「状態」と「描画」に完全分離し、描画は presentation へ | 層としては最も正しい | 上記に加えマスク描画・ズームの移動が必要。回帰リスクが高い | 3〜4 週 |

### 2.4 推奨

**B-1 で出し、B-2 は需要が出てから。**

Node バッチ処理は魅力的だが、**現時点で具体的な利用者がいない**。`core` を「ブラウザで動く、Vue に依存しない計算エンジン」と正確に定義すれば、Starrydata3 の当面の用途(ホストが自前 UI を組む)は完全に満たせる。

ただし B-2 に進みやすいよう、**今のうちに `PixelSource` の形だけ決めておく**。

**実施済み(2026-09-04)。** `src/application/ports/pixelSource.ts` に以下を定義した。

```ts
export interface PixelSource {
  readonly width: number
  readonly height: number
  /** RGBA pixels of the original-size image */
  getImagePixels(): Uint8ClampedArray
  /** RGBA pixels of the original-size mask */
  getMaskPixels(): Uint8ClampedArray
  /** whether the user has drawn a selection mask */
  readonly hasMask: boolean
}
```

`Extractor.execute()` は既に `canvasHandler` からこの 5 つしか読んでいなかったので、引数を
`CanvasHandlerInterface` から `PixelSource` に変えるだけで抽出は canvas から独立した。
`CanvasHandlerInterface` は `PixelSource` を継承し、`CanvasHandler` は既存の
`originalWidth` / `originalHeight` / `originalImageCanvasColors` /
`originalSizeMaskCanvasColors` / `isDrawnMask` に対する薄いエイリアスとしてこれを実装している
(既存メンバーはすべてそのまま)。呼び出し側(`ExtractorSettings.vue`)は渡す値を変えておらず、
宣言型だけが変わった。

canvas を一切使わない手書きの `PixelSource` で抽出が走ることは
`src/application/services/extractor/extractor.pixelSource.test.ts` で担保している。
残る B-2 の作業(node-canvas 実装、`colorSwatches` / `resize` の分離)は Phase 4 のまま。

---

## 3. 以上を踏まえた 3 entry の定義

#307 の表を、上の 2 点を反映して書き直したもの。**entry を 3 つにするという骨子は変えていない。**

| entry | 中身 | 依存 | 実行環境 | 想定利用者 |
|---|---|---|---|---|
| `starry-digitizer/core` | `domain/` + `application/`(services / strategies / utils / dto) | `@vue/reactivity` / `jszip` / `curve-interpolator` / `tesseract.js`(遅延) | **ブラウザ**(canvas と画像デコードが必要) | 自前 UI を組むホスト、別フレームワークのホスト |
| `starry-digitizer/vue` | `useDigitizer()` / provide・inject / 個別パネル(スタイル最小) | 上記 + `vue` | ブラウザ | Vue で自前レイアウトを組むホスト |
| `starry-digitizer`(既定・現状維持) | `<StarryDigitizer>` 一式(13 パネル + レイアウト + CSS) | 上記 + 同梱 CSS | ブラウザ | スタンドアロン版、すぐ動かしたいホスト |

`core` の約束として README に明記する文言(案):

> `core` runs in a browser and does not depend on Vue's renderer. It needs a
> 2D canvas context and image decoding; it is not a Node package.
> Change notification is `@vue/reactivity`, re-exported as `effect` / `stop` /
> `computed` / `ref` — usable from React, Svelte or plain JavaScript.

(`watch` は含めない。理由は §1.4。)`@vue/reactivity` は `core` の唯一の必須 peer 依存で、
ホストの中で 1 コピーに解決される必要がある(§1.5)。`vue` は `/vue` と既定 entry のためのもので、
`peerDependenciesMeta` で optional にしてある。

Node で**今日でも動く部分集合**(`migrateProject`、`AxisSetCalculator`、抽出アルゴリズム本体)は、必要になったときに `starry-digitizer/core/pure` として切り出せる。先に作らない。

---

## 4. 段階

| Phase | 内容 | 工数 | 状態 | これで #307 の何が満たされるか |
|---|---|---|---|---|
| 0 | `Extractor.execute()` の引数を `PixelSource` に変更。`canvasHandler.manualMode` / `maskMode` への直接代入 10 件を既存の `setManualMode()` / `setMaskMode()` に置換。`core` の実行環境を文書化 | 1〜2 日 | **実施済み(2026-09-04)**(→ §2.4) | 将来の分割の前提が整う |
| 1 | `package.json` の `exports` に `./core` と `./vue` を追加し、`vite.library.config.ts` を 3 entry 化。`@vue/reactivity` を `digitizerContext.ts` の import 元にする | 3〜5 日 | **実施済み(2026-09-04)**(→ 下記) | **ホストが `core` を import できる。#307 の主目的が達成される** |
| 2 | `useDigitizer()` composable を `vue` entry に用意(context の生成・provide・破棄を 1 行に) | 3 日 | 未着手 | ホストのボイラープレートが減る |
| 3(条件付き) | 直接ミューテーションのサービス経由への集約 | 2〜4 週 | 未着手 | 履歴取得の一元化。**非 Vue ホストが実在してから** |
| 4(条件付き) | `PixelSource` の node-canvas 実装 | 1〜2 週 | 未着手 | Node バッチ。**具体的な用途が出てから** |

Phase 1 まで(1 週間程度)で #307 の目的はほぼ達成される。Phase 3・4 は仮説段階で着手しない。

### Phase 1 の実施内容

**実施済み(2026-09-04)。** 実装は §3 の定義どおりで、既定 entry の import 面は変えていない。

**entry を 3 つにした。**

| ファイル | subpath | 中身 |
|---|---|---|
| `src/core-main.ts` | `starry-digitizer/core` | 状態(`createDigitizerContext`)・操作(`applyImage` / `replaceImage` / `loadProject` / `reset` / `getDatasetValues` / `loadImageAsDataUrl`)・DTO とマイグレーション・`DigitizerError`・`PixelSource` 型、および `@vue/reactivity` の再エクスポート(§1.4) |
| `src/vue-main.ts` | `starry-digitizer/vue` | パネル 13 個・`provideDigitizerContext()` / `useDigitizerContext()` / `DIGITIZER_CONTEXT_KEY`・`digitizerOptions`(`DEFAULT_OPTIONS` / `DEFAULT_FEATURES`) |
| `src/library-main.ts` | `starry-digitizer`(既定) | `<StarryDigitizer>` + 上記 2 つの `export *`。**既存ホストの import 面は不変** |

`package.json` の `exports` に `./core` と `./vue` を追加した(型は `core.d.ts` / `vue.d.ts`、
ESM は `core.js` / `vue.js`、CJS は `.cjs`)。`vite.library.config.ts` の `lib.entry` は
オブジェクト形式の 3 entry になり、形式は従来どおり `es` / `cjs` のみ(multi-entry lib mode は
UMD を作れないが、UMD はもともと出していない)。2 つ以上の entry から参照される共有コードは
`chunks/[name]-[hash].js` に出るので、`core` と `vue` の両方を import するホストでも
状態のコピーは 1 つになる。

**変更通知を `@vue/reactivity` に移した。**

- `src/application/digitizerContext.ts` の `reactive` の import 元を `vue` → `@vue/reactivity` に変更。それ以外のコード変更はない(A-2 の狙いどおり)。
- `provide` / `inject` / `DIGITIZER_CONTEXT_KEY` は Vue のレンダラ(アクティブなコンポーネントインスタンス)を必要とするため、`src/presentation/digitizerContextProvider.ts` に移した。**パッケージルートからの export 名は変わっていない**ので、ホスト側の変更は不要。
- `peerDependencies` に `@vue/reactivity: ^3.3.4` を追加し、`vue` は `peerDependenciesMeta` で optional にした。`/core` だけを使うホストは Vue を入れなくてよい。
- `@vue/reactivity` は external のまま(理由は §1.5 の単一コピー問題)。
- `watch` は再エクスポートしていない(理由は §1.4)。

**`lib-check` をスクリプト化した。** `package.json` に埋めた 1 行から `scripts/lib-check.mjs` に移し、
検査を 2 つにした。

1. 従来どおり、`library-build/dist` 配下に外部オリジン(Sentry / GTM / jsdelivr / projectnaptha)や `import.meta.env` が混入していないこと(統合仕様 R8)。
2. **`core.js` / `core.cjs` から相対 import を辿って到達できる全モジュール**に、`vue` / `vue/*` / `@vue/runtime-*` の import が無いこと。`@vue/reactivity` だけは許可する。core の実体の多くは `chunks/` にあるため、entry ファイルだけを見る検査では意味がない。

**未着手のまま残したもの:** Phase 2 の `useDigitizer()`(ホストは今のところ
`createDigitizerContext()` + `provideDigitizerContext()` を自分で呼ぶ)、Phase 3、Phase 4。

---

## 5. やらないこと

- **`reactive` の自前実装。** Vue の再実装であり、得るものが `@vue/reactivity` を使う場合と変わらない。
- **パッケージそのものの分割(monorepo 化)。** subpath exports で足りる。公開先が増えると、tarball 配布(npm publish しない方針)の手順も 3 倍になる。
- **既定 entry の変更。** スタンドアロン版と既存ホストを壊さないことが前提。
- **「Node で動く」と書くこと。** 動かない。Phase 4 を終えるまでは書かない。
- **レイアウト用の CSS 変数をこれ以上増やすこと。** 増やすほど「既定レイアウトを微調整する」道が太くなり、`core`/`vue` に移る動機が薄れる。現在の変数群で止め、それ以上の要求は Phase 1 の `vue` entry で受ける。
