# StarryDigitizer アーキテクチャ解説

作成日: 2026-09-04
対象: `worktree-starrydata3-integration` ブランチ時点の `src/`
読者: 本リポジトリに新しく入る開発者、および組み込み側(Starrydata3)の開発者

このドキュメントは**全体の地図**である。個別の設計判断はそれぞれ別ドキュメントに書かれているので、該当箇所からリンクする。ここでは同じ内容を繰り返さない。

- [`engine-boundary.md`](./engine-boundary.md) — core / vue / 既定 の 3 entry を切る設計判断とフェーズ計画
- [`framework-dependency-review.md`](./framework-dependency-review.md) — Vue / Vuetify 依存の批判的レビュー(Vuetify は既に撤去済み)
- [`interpolator-canvas-separation.md`](./interpolator-canvas-separation.md) — Interpolator から canvas 描画を Port として分離した経緯
- [`ux-ideas-implementation-design.md`](./ux-ideas-implementation-design.md) — Undo/Redo スナップショットと JSON エクスポート
- [`auto-axis-detection-design.md`](./auto-axis-detection-design.md) — 軸ラベル OCR
- [`../../README.md`](../../README.md) — 組み込み API(props / events / methods)の仕様
- [`../../AGENTS.md`](../../AGENTS.md) — CI・デプロイ・ブランチ運用

---

## 1. TL;DR — これはクリーンアーキテクチャか

**結論: 教科書的なクリーンアーキテクチャではない。用語(domain / application / presentation、Repository、Interface、DTO、Port)を借りた「レイヤードアーキテクチャ + DIP の部分適用」である。** ただし部分適用の範囲は狭くなく、一番内側は実際に守られている。

- **守れている(実測): 依存の向きは domain が完全に内側。** `grep -rn "@/application\|@/presentation" src/domain` の結果は **0 件**。`src/domain/` の 14 ファイル・1,166 行は `@/@types/types`・`@/constants`・`@/general/instanceManager/instanceManager` 以外を一切 import しておらず、`vue` もブラウザ API も参照していない。
- **守れている: 抽出アルゴリズムは Port で切れている。** `ExtractStrategyInterface.execute()`(`src/application/strategies/extractStrategies/extractStrategyInterface.ts:6`)は `(height, width, Uint8ClampedArray, Uint8ClampedArray, boolean, [r,g,b], number) => Coord[]` という純関数のシグネチャで、`Extractor.execute()` は canvas ではなく `PixelSource` port を受け取る(`src/application/services/extractor/extractor.ts:37`)。
- **守れていない(実測): application → presentation の逆流が 1 件実在する。** `src/application/utils/interpolationToggle.ts:3` が `@/presentation/hacks/forceRenderCanvasPoints` を import している。詳細は §6.1。
- **守れていない: 「Use Case」層に相当するものが存在しない。** UI のイベントハンドラがリポジトリとドメインエンティティを直接叩く。手動プロットは `CanvasMain.vue:195-196` で `historyManager.capture()` → `activeDataset.addPoint()` と 2 行並べて呼ばれており、この組み合わせを保証するアプリケーションサービスは無い。
- **守れていない: ドメインに変更通知の口が無い。** 唯一の通知機構は `createDigitizerContext()` が全サービスを `reactive()` で包んでいること(`src/application/digitizerContext.ts:71`)。ドメイン層に observer / subscribe は 1 つも無く、UI が再描画されるのはコンポーネントの直接ミューテーションを Vue の Proxy が観測しているからにすぎない。これは `digitizerContext.ts:63-70` にコメントとして明記されている既知の負債。
- **総括:** 「内側(計算とモデル)は外側を知らない」というクリーンアーキテクチャの中心的な要請は概ね満たしている。満たしていないのは「境界を越える制御の流れを Use Case にまとめる」「境界をまたぐデータは通知機構を通す」という部分で、そこは Vue に肩代わりさせている。**「エンジンは Vue 非依存だが、エンジンの使い方は Vue 前提」**という `framework-dependency-review.md` の要約が今も正確である。

> 補足: `ux-ideas-implementation-design.md:3` が参照している `docs/design/plot-digitizer-architecture.md` は存在しない。全体像を書いたドキュメントは本ファイルが最初のものになる。

---

## 2. レイヤ構成

### 2.1 図

```
                 ┌──────────────────────────────────────────────┐
   外側          │  presentation/  (69 files / 7,626 lines)      │
   (framework)   │  .vue コンポーネント / 自前 UI キット (ui/)   │
                 │  provide・inject / DOM 入出力                 │
                 └───────────────┬──────────────────────────────┘
                                 │ import OK
                 ┌───────────────▼──────────────────────────────┐
                 │  application/   (49 files / 3,420 lines)      │
                 │  services/ strategies/ utils/ dto/ ports/     │
                 │  canvas/ digitizerContext.ts (DI コンテナ)    │
                 └───────────────┬──────────────────────────────┘
                                 │ import OK
                 ┌───────────────▼──────────────────────────────┐
   内側          │  domain/        (14 files / 1,166 lines)      │
   (pure)        │  models/ repositories/ services/             │
                 │  ※ vue / ブラウザ API を一切 import しない    │
                 └──────────────────────────────────────────────┘

   横断(層に属さない共有物、どの層からも import 可):
     src/constants.ts          MANUAL_MODE / MASK_MODE / POINT_MODE / STYLE
     src/@types/types.d.ts     Coord / Point / ManualMode ほかの型
     src/general/              InstanceManager(汎用ユーティリティ、2 files / 23 lines)
```

### 2.2 各層の責務と依存ルール

| 層 | ディレクトリ | 責務 | 依存してよいもの | 実測結果 |
|---|---|---|---|---|
| domain | `src/domain/` | グラフの意味そのもの。`Axis` / `AxisSet` / `Dataset` のモデル、それらを保持する Repository、複数モデルにまたがる計算(`AxisSetCalculator`) | 横断のみ | 逆流 **0 件** |
| application | `src/application/` | ユースケースの部品。サービス(状態 + 操作)、抽出 Strategy、DTO とマイグレーション、Port 定義、複数サービスをまたぐ操作(`digitizerOperations.ts`) | domain + 横断 | 逆流 **1 件**(§6.1) |
| presentation | `src/presentation/` | Vue コンポーネント、自前 UI キット(`ui/`)、DOM/ブラウザとの入出力(`utils/downloadBlob.ts` など) | application + domain + 横断 | — |
| ルート | `src/main.ts`, `src/App.vue`, `src/appContext.ts` | スタンドアロン app 専用の外殻(Sentry 初期化、メニューバー)。ライブラリには含まれない | すべて | — |

`src/general/` は「層ではない汎用コード」の置き場で、現在は `InstanceManager` だけが入っている。domain からも import されている(`src/domain/repositories/datasetRepository/manager/datasetRepositoryManager.ts:2`)ので、ここには**フレームワークにもブラウザにも依存しないものだけ**を置く。

`src/constants.ts`(モード定数と表示サイズ)と `src/@types/types.d.ts`(`Coord` / `Point` / 各 Mode 型)も同じ扱いで、どの層からも import してよい。逆に「presentation 層専用の定数ファイル」は現在存在しない。かつて `src/presentation/constants.ts` に置かれていた画像 MIME タイプ一覧は、application から参照されて逆流を作っていたため `src/application/utils/imageLoader.ts:12-17` に移された。**層専用の定数を作るときは、それが本当にその層でしか使われないかを先に確かめる。**

---

## 3. 主要な構成要素

### 3.1 Repository — 「永続化」ではなく「集約のインメモリ保持」

| | |
|---|---|
| 何のために | `AxisSet` / `Dataset` のコレクションと「今アクティブなのはどれか」を 1 箇所で持つ。ID 採番、アクティブ切り替え、一括クリアもここ |
| ファイル | `src/domain/repositories/axisSetRepository/axisSetRepository.ts`, `src/domain/repositories/datasetRepository/datasetRepository.ts` |
| 注意 | 名前に反して **DB やファイルへの永続化は一切しない**。`new AxisSetRepository()` はコンストラクタで初期 AxisSet を 1 つ作る(`axisSetRepository.ts:10-22`)。永続化にあたるのは `ProjectService`(DTO ⇄ ZIP)の側 |

`activeDatasetId === 0` が "View All" モードを表す(`datasetRepository.ts:34-36`)という約束があり、`ProjectService` はこれを壊さないよう `activeDataset.id` ではなく `activeDatasetId` を直接読む(`src/application/services/projectService/projectService.ts:41-43`)。

### 3.2 Interface + Manager — 実装の差し替え口と生成の集約

各サービス/リポジトリは `Xxx.ts`(実装)/ `xxxInterface.ts`(型)/ `manager/xxxManager.ts`(生成)の 3 点セットで構成される。

| | |
|---|---|
| 何のために | (1) 利用側が具象クラスではなく interface に依存する(DIP)。(2) **どの実装をどう組み立てるかという知識を Manager 1 箇所に閉じ込める** |
| ファイル | `src/general/instanceManager/instanceManager.ts`(共通の基底)、各 `manager/*Manager.ts` |

`InstanceManager<T>` は `getInstance()`(同じインスタンスを返す)と `getNewInstance()`(毎回新しく作る)の 2 つを持つ(`instanceManager.ts:7,16`)。Manager が引き受ける「配線」の実例:

- `ExtractorManager` は `new Extractor(LineExtract.instance)` と、既定 Strategy の選択まで行う(`src/application/services/extractor/manager/extractorManager.ts:8`)
- `InterpolatorManager` は `InterpolatorCanvas`(canvas 描画の実装)と repository / canvasHandler を `Interpolator` に注入する(`src/application/services/interpolator/manager/interpolatorManager.ts:17-21`)。`Interpolator` 自身は `InterpolatorCanvasInterface` しか知らない → [`interpolator-canvas-separation.md`](./interpolator-canvas-separation.md)

一方で `HistoryManager` と `ProjectService` には Manager が無い。コンストラクタ引数が多く、`createDigitizerContext()` が直接 `new` している(`src/application/digitizerContext.ts:79-84`)。`AxisOcrReader` も Manager を持たない(`assetBaseUrl` を都度渡すため)。**Manager は「全サービスに必須の作法」ではなく「生成に知識が要るものだけが持つ」**と理解してよい。

なお `getInstance()`(シングルトン側)は、**実装コードからは 1 箇所も呼ばれていない**。呼んでいるのは各 Manager 自身のユニットテストだけである(§6.5)。

### 3.3 Strategy — 抽出アルゴリズムの差し替え

| | |
|---|---|
| 何のために | 「Symbol Extract(散布図)」と「Line Extract(線グラフ)」という 2 つの抽出アルゴリズムを、`Extractor` が実装を知らないまま切り替える |
| ファイル | `src/application/strategies/extractStrategies/extractStrategyInterface.ts`, `lineExtract.ts`, `symbolExtractByArea.ts`, 共通処理は `extractParent.ts` |

シグネチャが重要である。

```ts
// src/application/strategies/extractStrategies/extractStrategyInterface.ts:6-14
execute(
  height: number,
  width: number,
  imageColors: Uint8ClampedArray,
  maskColors: Uint8ClampedArray,
  isDrawnMask: boolean,
  targetColor: [number, number, number],
  colorMatchThreshold: number,
): Coord[]
```

canvas も DOM も Vue も現れない。**このライブラリで最も価値のあるコードが、最も依存の少ない形で書かれている**。ここを崩さないことが以降のリファクタリングの制約になる。

ただし両 Strategy は `static get instance` によるプロセスワイドのシングルトンであり(`lineExtract.ts:13-19`, `symbolExtractByArea.ts:13-19`)、`dxPx` / `dyPx` / `minDiameterPx` / `maxDiameterPx` という**可変の設定値を持つ**。この点は §6.4 で扱う。

### 3.4 Port — ヘキサゴナルの入力口

| | |
|---|---|
| 何のために | 抽出に必要な「ピクセル」を、canvas / DOM の型を使わずに表現する。実装を差し替えれば非ブラウザ環境でも抽出が走る |
| ファイル | `src/application/ports/pixelSource.ts:5-14` |

```ts
export interface PixelSource {
  readonly width: number
  readonly height: number
  getImagePixels(): Uint8ClampedArray
  getMaskPixels(): Uint8ClampedArray
  readonly hasMask: boolean
}
```

`CanvasHandlerInterface` がこれを継承し(`src/application/services/canvasHandler/canvasHandlerInterface.ts:17`)、`CanvasHandler` がブラウザ実装を提供する(`src/application/services/canvasHandler/canvasHandler.ts:337-347`)。呼び出し側は `this.extractor.execute(this.canvasHandler)` と canvasHandler を渡しているが、**宣言型は `PixelSource`** である(`src/presentation/components/Settings/ExtractorSettings.vue:206-209`)。canvas を一切使わない手書きの `PixelSource` で抽出が走ることは `src/application/services/extractor/extractor.pixelSource.test.ts` で担保されている。

もう 1 つの Port が `InterpolatorCanvasInterface`(`src/application/services/interpolator/interpolatorCanvasInterface.ts`)で、こちらは出力側(描画)の Port にあたる。

### 3.5 DTO — 保存形式とバージョニング

| | |
|---|---|
| 何のために | ドメインモデル(可変クラス)と、保存・ホストへの受け渡しに使う plain object を分ける。ホストは DTO を不透明に保存するため、後方互換の責任がここに集中する |
| ファイル | `src/application/dto/projectDTO.ts`, `axisSetDTO.ts`, `datasetDTO.ts`, `axisDTO.ts`, `canvasHandlerDTO.ts`, 変換は `converters.ts` |

- `PROJECT_DTO_VERSION = '2.0.0'`(`projectDTO.ts:19`)。semver の **MAJOR がスキーマ世代**で、major 1 は旧形式、2 が現行。
- `migrateProject(input: unknown): ProjectDTO`(`projectDTO.ts:58`)が唯一の入口。壊れた入力は `DigitizerError('PROJECT_INVALID')`、未来のバージョンは `DigitizerError('DTO_VERSION_UNSUPPORTED')` を投げる(`projectDTO.ts:60-76`)。入力は変更せず新しいオブジェクトを返す。
- ドメイン ⇄ DTO の変換は `converters.ts` の `toAxisSetDTO` / `fromAxisSetDTO` / `toDatasetDTO` / `fromDatasetDTO`(`converters.ts:19,51,73,88`)に集約され、**`ProjectService`(保存)と `HistoryManager`(Undo/Redo)が同じ関数を共有する**(`src/application/services/historyManager/historyManager.ts:6-11`)。保存と履歴でスキーマがずれない構造になっている。

### 3.6 DigitizerContext — DI コンテナ相当かつ唯一の通知機構

| | |
|---|---|
| 何のために | `<StarryDigitizer>` 1 インスタンス分の状態(2 リポジトリ + 7 サービス)を 1 つのオブジェクトにまとめ、コンポーネントに配る |
| ファイル | `src/application/digitizerContext.ts`(生成)、`src/presentation/digitizerContextProvider.ts`(provide/inject) |

`createDigitizerContext()`(`digitizerContext.ts:47`)は Manager 経由でインスタンスを作り、依存関係(`interpolator` には repository と canvasHandler、`projectService` / `historyManager` にはリポジトリ)を手で配線したうえで、まとめて `reactive()` で包んで返す(`digitizerContext.ts:71-85`)。

**この `reactive()` がエンジンの唯一の変更通知機構である。**`digitizerContext.ts:63-70` に負債として明記されている。`@vue/reactivity` から import しているため(`digitizerContext.ts:1`)、Vue のレンダラには依存しない。詳細な選択肢比較は [`engine-boundary.md` §1](./engine-boundary.md) にある。

Vue への橋渡しは presentation 側に分離されている。`provide` / `inject` はアクティブなコンポーネントインスタンスを要求するため、これだけが `vue` を import する(`src/presentation/digitizerContextProvider.ts:1-9`)。

- `provideDigitizerContext(ctx)` / `useDigitizerContext()`(`digitizerContextProvider.ts:15,19`)
- キーは `Symbol` の `InjectionKey`(`digitizerContextProvider.ts:11`)
- スタンドアロン app は `src/appContext.ts:7` で 1 つ作り、メニューバーと `<StarryDigitizer :context>` で共有する

モジュールレベルのシングルトンを廃してこの形にした理由は、同一ページに複数インスタンスを置けるようにするため(`digitizerContext.ts:21-27`)。

---

## 4. データの流れ

### 4.1 画像を読み込んで自動抽出するまで

```
[host / file input]
   │  props.image (Blob | data URL | URL)  または  <input type=file>
   ▼
StarryDigitizer.vue  ─────────────────────────────────── presentation
   │  applyImage(ctx, source)
   ▼
application/utils/digitizerOperations.ts:20  applyImage()
   ├─ loadImageAsDataUrl(source)            utils/imageLoader.ts (FileReader / fetch)
   ├─ canvasHandler.initializeImageElement(dataUrl)   canvasHandler.ts:114 (new Image)
   ├─ canvasHandler.drawFitSizeImage()                canvasHandler.ts:470
   ├─ extractor.setSwatches(canvasHandler.colorSwatches)   canvasHandler.ts:349
   └─ interpolator.resizeCanvas()
   ▼
[ユーザーが色・閾値・マスクを設定して RUN]
   ▼
ExtractorSettings.vue:202  extractPoints()  ───────────── presentation
   │  extractor.execute(canvasHandler)   ← canvasHandler を PixelSource として渡す
   ▼
application/services/extractor/extractor.ts:37  execute(source: PixelSource)
   │  strategy.execute(height, width, imagePixels, maskPixels, hasMask, targetColor, threshold)
   ▼
application/strategies/extractStrategies/lineExtract.ts (または symbolExtractByArea.ts)
   │  => Coord[]    ← ここは純関数。canvas も Vue も知らない
   ▼
datasetRepository.setPoints(coords) / sortPoints()  ───── domain
   ▼
reactive() proxy が変更を観測 → Vue が再描画
```

canvas 要素そのものは presentation 側が所有し、`canvasHandler.attachCanvases({...})` で貸し出す(`src/presentation/components/Canvas/CanvasMain.vue:126`, `src/presentation/components/Magnifier/MagnifierImage.vue:72`)。`CanvasHandler` は `document.getElementById` を使わない — 複数インスタンスが同一ページに載るため(`src/application/canvas/HTMLCanvas.ts:1-5`)。

### 4.2 手動で点を打ってから物理量として取り出すまで

```
[canvas 上で左クリック]
   ▼
CanvasMain.vue:161  point(e)  ───────────────────────── presentation
   ├─ options.readonly / isViewAllMode / isDrawingMask を弾く
   ├─ getMouseCoordFromMouseEvent(e, imageCanvasElement)   presentation/utils/mouseEventUtilities.ts
   ├─ xPx = canvasCoord.xPx / canvasHandler.scale          CanvasMain.vue:179-180
   ├─ 画像範囲外なら return                                 CanvasMain.vue:183-190
   └─ manualMode === ADD のとき:
        historyManager.capture()                          CanvasMain.vue:195
        datasetRepository.activeDataset.addPoint(xPx, yPx) CanvasMain.vue:196  → domain/models/dataset/dataset.ts:50
        activeAxisSet.inactivateAxis()
        activeDataset.addManuallyAddedPointId(lastPointId)
      軸が未確定のとき:
        historyManager.capture()                          CanvasMain.vue:215
        activeAxisSet.addAxisCoord({xPx, yPx})             domain/models/axisSet/axisSet.ts:182
        4 軸そろったら canvasHandler.setManualMode(ADD)     CanvasMain.vue:223

[点はピクセル座標のまま Dataset に保持される。物理量への変換は読み出し時]

   ▼ ホストが値を要求 / change イベント
StarryDigitizer.vue:308  getDatasetValues()
   ▼
application/utils/datasetValues.ts:73  getDatasetValues(axisSetRepo, datasetRepo, digits)
   │  各 dataset を「その dataset 自身の axisSetId」の AxisSet で変換する(:70-72)
   ▼
application/utils/datasetValues.ts:30  calculatePhysicalValue()
   ▼
domain/services/axisSetCalculator.ts:33  calculateXYValues(xPx, yPx)
   ├─ 4 軸が未配置なら 'NaN'                     axisSetCalculator.ts:34-36
   ├─ considerGraphTilt なら傾き補正             axisSetCalculator.ts:60-69
   └─ log スケールなら対数補間
   ▼
DatasetValues[]  { points: 物理量, pixelPoints: ピクセル座標 }
   ▼
emit('change', { project, datasets })  StarryDigitizer.vue:285(updateDebounceMs で debounce)
```

画面上の表(`DataTable.vue`)と File メニューの CSV コピーは、同じ `datasetToValues()` を通る別の入口(`src/application/utils/dataExport.ts:10-31`)。**「ピクセル座標を保持し、物理量は読み出しのたびに計算する」**のがこのアプリの一貫した方針で、軸の値を後から直しても既存の点が壊れないのはこのため。

---

## 5. 3 つのエントリポイント

`package.json` の `exports` で 3 つの subpath を公開している。ビルドは `vite.library.config.ts:57-61` の 3 entry 構成。

| entry | ファイル | 中身 | Vue レンダラ | 想定利用者 |
|---|---|---|---|---|
| `starry-digitizer` | `src/library-main.ts` | 下記 2 つの再エクスポート + `<StarryDigitizer>` 本体(`library-main.ts:15`) | 要 | スタンドアロン相当をすぐ載せたいホスト |
| `starry-digitizer/core` | `src/core-main.ts` | 状態(`createDigitizerContext`)、操作(`applyImage` / `loadProject` / `reset` / `getDatasetValues`)、DTO と `migrateProject`、`PixelSource`、エラー、`@vue/reactivity` の `effect` 等の再エクスポート(`core-main.ts:21-34`) | **不要** | 自前 UI を組むホスト、React/Svelte |
| `starry-digitizer/vue` | `src/vue-main.ts` | 個別パネル(`CanvasMain` / `MagnifierMain` / `DatasetManager` ほか、`vue-main.ts:23-39`)、provide/inject、options | 要 | Vue で自前レイアウトを組むホスト |

- 新しい export を足すときは `core-main.ts` か `vue-main.ts` に足す。`library-main.ts` は再エクスポートだけを行う(`library-main.ts:7-10`)。
- **`core` が Vue のレンダラを引き込んでいないことはビルド後に機械的に検証される。** `scripts/lib-check.mjs:65-75` が `core.js` / `core.cjs` から到達可能なモジュールを辿り、`vue` / `vue/*` / `@vue/runtime-*` の import があれば `npm run lib-build` を失敗させる(`@vue/reactivity` は許可)。同スクリプトは外部オリジン(Sentry / CDN)の混入も検査する(`lib-check.mjs:38-43`)。
- `core` は **Node パッケージではない**。canvas 2D コンテキストと画像デコードを必要とする(`core-main.ts:8-11`)。

判断の背景・フェーズ計画は [`engine-boundary.md` §3-§5](./engine-boundary.md) を参照。組み込み API の具体的な使い方は [`README.md`](../../README.md) の "Using as a library" 以降。

---

## 6. 現状の逸脱と技術的負債

実測に基づく。「なぜ今そうなっているか」と「直すとしたらどこか」を併記する。

### 6.1 application → presentation の逆流(1 件)

```
$ grep -rn "@/presentation" src/application
src/application/utils/interpolationToggle.ts:3:import { forceRenderCanvasPoints } from '@/presentation/hacks/forceRenderCanvasPoints'
src/application/utils/projectFileOperations.ts:6:  (コメント内の言及のみ。import ではない)
```

| 逆流 | なぜ今そうなっているか | 直すとしたら |
|---|---|---|
| `interpolationToggle.ts:3` → `src/presentation/hacks/forceRenderCanvasPoints.ts` | 中身は `addPoint(9999,9999)` → `clearPoint()` で無理やり再描画を起こすハック(`forceRenderCanvasPoints.ts:3-11`)。**§6.2 の「通知機構が無い」ことの直接の帰結**であり、application 層の `toggleInterpolation()` からも同じハックを呼ぶ必要が生じた(`interpolationToggle.ts:39-41`) | 単体では直せない。§6.2 を解決して「tempPoints の変更が通知される」ようにすれば、この関数ごと消える。当座の緩和策としては、`toggleInterpolation()` から再描画の責務を外し、呼び出し元(`ExtractorSettings.vue` / `App.vue`)に戻す |

もう 1 件、`imageLoader.ts` が `@/presentation/constants` の `VALID_IMAGE_TYPES` を import する逆流が 2026-09-04 まで存在したが、定数を `src/application/utils/imageLoader.ts:12-17` へ移して解消済み(`src/presentation/constants.ts` は削除された)。**逆流は「置き場所が UI 都合で決まった共有物」から生まれやすい**、という教訓としてここに残す。

なお `presentation → domain` の import は 6 ファイル(`AxisSetSettings.vue:179`, `CanvasAxis.vue:80`, `MagnifierAxis.vue:36`, `MagnifierMain.vue:115`, `CanvasMain.vue:56`, `forceRenderCanvasPoints.ts:1`)あるが、これは**方向としては正しい**(外→内)。ただし `MagnifierMain.vue:115` は application を飛ばして domain サービス `AxisSetCalculator` を直接 `new` しており、`datasetValues.ts` の `calculatePhysicalValue()` と同じ計算が二重に存在している。層の違反ではないが、変換ロジックの入口は 1 本にまとめたい。

### 6.2 `reactive()` が唯一の変更通知機構

- 事実: `src/domain` と `src/application` に observer / EventEmitter / subscribe は 1 つも無い。`createDigitizerContext()` の `reactive()`(`digitizerContext.ts:71`)だけが通知を担う。
- なぜ: 元々 Vue の Options API の `data()` からシングルトンを返す構造だったものを、そのまま context 化した経緯があり、通知を自前で持つ必要が一度も無かった(`digitizerContext.ts:57-61`)。
- 影響: 非 Vue ホストは `effect()` を張らない限り再描画のきっかけを得られない。`forceRenderCanvasPoints`(§6.1 #2)のようなハックが必要になる。`tempPoints` のように「通知が漏れる」ケースが実在する。
- 直すとしたら: `engine-boundary.md` §1.3 の A-3(リポジトリ/サービスに明示的な通知を実装)。ただし前提として §6.3 の直接ミューテーションを潰す必要がある。同ドキュメントは「非 Vue ホストが実在してから」という判断(Phase 3、条件付き)を示している。

### 6.3 コンポーネントからのドメイン直接ミューテーション(9 箇所)

`v-model` を含めた書き込みは現在 9 箇所。

| 種別 | 箇所 |
|---|---|
| 代入 | `AxisSetSettings.vue:37` (`xIsLogScale`), `:75` (`yIsLogScale`), `:117` (`isVisible`), `:490` (`considerGraphTilt`) |
| 代入 | `CanvasMain.vue:295` (`activeAxisSet.isAdjusting`), `:296` (`activeDataset.pointsAreAdjusting`) |
| `v-model` | `AxisSetManager.vue:38` (`axisSet.name`), `DatasetManager.vue:56`, `:65` (`dataset.name`) |

`canvasHandler` のモード切替は既に `setManualMode()` / `setMaskMode()` に統一済みで(`CanvasMain.vue:223,539,543,546`)、直接代入は残っていない。

- なぜ: Vue の `reactive()` がプロパティ代入をそのまま拾うので、セッターを作る動機が無かった。`v-model` は特に自然に書けてしまう。
- 影響: (1) §6.2 の通知を後から挿す穴が 9 箇所に散る。(2) **Undo 履歴の取得点がコンポーネント任せ**になる。`historyManager.capture()` は `CanvasMain.vue:195,215,556,590` から明示的に呼ばれており、呼び忘れると履歴が飛ぶ。これは `ux-ideas-implementation-design.md` で意図的に選んだ方式(「capture の呼び出しは Presentation 層の責務とする」)だが、コストも同時に負っている。
- 直すとしたら: ドメインモデル側に `setXIsLogScale()` / `rename()` 等を足し、`v-model` は `:model-value` + `@update:model-value` に開く。9 箇所なので機械的に潰せる。そのうえで通知と `capture()` をメソッド内部に寄せる。

### 6.4 抽出 Strategy がプロセスワイドのシングルトン

`LineExtract.instance` / `SymbolExtractByArea.instance`(`lineExtract.ts:13-19`, `symbolExtractByArea.ts:13-19`)はモジュールレベルの単一インスタンスで、`dxPx` / `dyPx` / `minDiameterPx` / `maxDiameterPx` という可変設定を持つ。`LineExtractSettings.vue:44` と `SymbolExtractSettings.vue:43` はこのシングルトンを直接 `data()` に載せて編集している。

- 影響: **同一ページに `<StarryDigitizer>` を 2 つ置くと、抽出パラメータが共有される。** `DigitizerContext` 化で repositories / services のインスタンス分離は達成された(`digitizerContext.ts:21-27`)が、Strategy だけがその外に取り残されている。`ExtractorManager` も `LineExtract.instance` を渡している(`extractorManager.ts:8`)。
- なぜ: Strategy は「アルゴリズム」であって状態を持たない想定だったが、UI から調整するパラメータが後から生えた。
- 直すとしたら: `ExtractorManager` で `new LineExtract()` / `new SymbolExtractByArea()` を作り、`Extractor` が両方を保持する。設定コンポーネントは `extractor.strategy` 経由で参照する。`static get instance` は削除。Strategy の `execute()` シグネチャは変えなくてよい。

### 6.5 `InstanceManager.getInstance()`(シングルトン側)が実質デッドコード

`getInstance()` を呼んでいるのは各 Manager のユニットテスト(`extractorManager.test.ts:9,13` など)だけで、実装コードからの呼び出しは 0 件。実際の生成は全て `getNewInstance()` である(`digitizerContext.ts:48-50,54,76-78`)。

- なぜ: モジュールシングルトン時代の名残。`DigitizerContext` 導入で「1 インスタンス 1 状態」に切り替えたが、`InstanceManager` の API はそのまま残った。
- 直すとしたら: `getInstance()` と `InstanceManagerInterface.getInstance` / `RepositoryManagerInterface.getInstance` を削除し、Manager を「ファクトリ」に単純化する。対応するテストも消える。ただし公開 API ではないため急ぐ理由は無い。

### 6.6 ブラウザ API への依存

`src/domain/` にはブラウザ API が 1 つも無い。依存は application 層に集中している。

| 用途 | API | 場所 |
|---|---|---|
| ピクセル取得・リサイズ | `document.createElement('canvas')` + 2D context | `canvasHandler.ts:297,312,354,521` |
| 画像デコード | `new Image()` | `canvasHandler.ts:47,380` |
| ファイル読み込み | `FileReader` / `fetch` | `imageLoader.ts:25`, `projectService.ts` |
| OCR | `HTMLImageElement` + `tesseract.js`(動的 import) | `axisOcrReader.ts:30,34` |
| 設定の永続化 | `localStorage`(`typeof` ガードあり) | `localStorageUtils.ts:40` |
| CSV コピー | `navigator.clipboard.writeText` | `dataExport.ts:49` |

- なぜ: 画像処理アプリなので canvas は本質的に必要で、これを全部 Port 化するのは費用対効果が悪い。`PixelSource`(§3.4)は「一番効く 1 箇所」だけを切った結果である。
- 一方で **DOM を触る出力側は既に presentation へ追い出されている**。`<a download>` は `src/presentation/utils/downloadBlob.ts:3`、`<input type=file>` は `src/presentation/utils/projectFileDialog.ts`、application 側は Blob を返すだけ(`src/application/utils/projectFileOperations.ts:5-7,33-38`)。同じパターンで残りも移せる。
- 直すとしたら: [`engine-boundary.md` §2.3](./engine-boundary.md) の B-2(node-canvas 実装の追加)。具体的な用途が出るまで着手しない方針。

### 6.7 その他

- `dataExport.ts:37-42` のコメントが Handsontable を前提にしているが、Handsontable は既に撤去済み(`framework-dependency-review.md` の追記参照)。コメントが実態から遅れている。
- テストの配置は「実装の隣に `*.test.ts`」で統一されている(35 ファイル)。jest は `src/domain/**` と `src/application/**` を coverage 対象とし、`.vue` はパースエラーのため除外されている(`jest.config.cjs:22-24`)。**Vue コンポーネントのユニットテストは存在しない**(`@vue/test-utils` の利用ゼロ)。UI の回帰は Cypress(`cypress/e2e/`、24 spec)が担保している。この分担自体は妥当だが、「コンポーネントに置かれたロジック(§6.3、`CanvasMain.vue` の 600 行超)はユニットテストで守られていない」ことは認識しておく必要がある。

---

## 7. 新しくコードを足すときの指針

### 7.1 判断表

| 追加したい処理 | 置く場所 | 理由 / 具体例 |
|---|---|---|
| グラフの意味に関するルール(軸の並び、点の ID 採番、対数変換) | `src/domain/models/` または `src/domain/services/` | ブラウザにも Vue にも依存しない。`AxisSetCalculator` と同じ棚 |
| 複数のドメインモデルにまたがる計算 | `src/domain/services/` | `axisSetCalculator.ts:1` のコメントがこの基準を明文化している |
| モデルの集合とアクティブ選択の管理 | `src/domain/repositories/` | 永続化ではない。ID 採番と「今どれか」がここ |
| UI から調整する設定値を持ち、操作を提供するもの | `src/application/services/<name>/` に `xxx.ts` + `xxxInterface.ts` | `magnifier`, `extractor`, `confirmer` と同じ形。生成に知識が要るなら `manager/` も足す |
| 複数のサービス/リポジトリをまたぐ 1 つの操作 | `src/application/utils/`(`digitizerOperations.ts` に寄せる) | 「画像を差し替えたらデータと履歴も消す」のような手順。全入口が同じ関数を通ることが目的(`digitizerOperations.ts:10-13`) |
| ピクセルを処理するアルゴリズム | `src/application/strategies/` | 引数は素の数値と `Uint8ClampedArray`。canvas を引数に取らない |
| 保存形式に現れるもの | `src/application/dto/` + `converters.ts` + `migrateProject` | **フィールドを増やしたら `migrateProject` に既定値を書く。読めなくなる変更なら MAJOR を上げる**(`projectDTO.ts:7-18`) |
| ブラウザ固有の入出力(DOM 生成、`<a download>`、ファイルダイアログ、クリップボード) | `src/presentation/utils/` | application 側は Blob / 文字列を返すところまで。`downloadBlob.ts` / `projectFileDialog.ts` のペアが手本 |
| 外部ライブラリ(WASM、重いもの)の呼び出し | `src/application/services/` に薄いアダプタ + interface。ロジックは別の純粋な util へ | `axisOcrReader.ts`(tesseract.js を動的 import)と `axisOcrMatcher.ts`(純粋なマッチング)の分割 |
| 見た目・レイアウト | `src/presentation/` | 汎用部品は `ui/`(`SdButton` 等)。文言は各コンポーネントに英語で直書き(多言語対応は持たない方針) |
| ホストに公開したい API | `core-main.ts`(Vue 不要)か `vue-main.ts`(Vue 必要)。`library-main.ts` には書かない | `library-main.ts:7-10` |

### 7.2 迷ったときの 3 つの質問

1. **`vue` を import する必要があるか?** → あるなら presentation。無いなら application 以下に置けるか検討する。
2. **`document` / `window` / `Image` / `canvas` に触るか?** → 触るなら presentation か、`CanvasHandler` のようなアダプタに閉じ込める。触らないなら application か domain。
3. **グラフ画像や UI の都合と無関係に説明できるか?**(「x1 と x2 が同じ値なら値を計算できない」など) → できるなら domain。

### 7.3 やってはいけないこと

- `src/domain/` から `@/application` / `@/presentation` を import する。**現在 0 件なので、この線だけは絶対に守る。**
- `src/application/` から `@/presentation` を新たに import する。残り 1 件(§6.1)を増やさない。
- コンポーネントからドメインのプロパティを新たに直接代入する / ドメインのプロパティに `v-model` を張る(§6.3)。サービスかモデルのメソッドを経由する。
- 抽出 Strategy の `execute()` に canvas / DOM / Vue の型を持ち込む(§3.3)。
- `core-main.ts` から到達するコードで `vue` を import する。`npm run lib-build` が `lib-check` で落ちる(`scripts/lib-check.mjs:65-75`)。
- モジュールレベルのシングルトンを新設する。1 ページ複数インスタンスが壊れる(§6.4 が既にその状態)。
