# plot-digitizer 切り出しアーキテクチャ設計

- Status: **Draft — 司令塔レビュー待ち (need-review)**
- 対象: グラフ画像→数値抽出のコアロジックを、Vue.js(starry-digitizer)非依存の
  TypeScript/npmライブラリ「plot-digitizer」として切り出すための設計
- 実装: **本ドキュメントのレビュー合格まで着手しない**(CLAUDE.md方針)

> **2026-08-15 更新**: オーナー判断によりstarry-digitizerのAI抽出機能
> (AutoLineDigitizer / Hugging Face Space連携)を撤去した(該当APIが
> 常時503を返す状態になっていたため)。これに伴い、本ドキュメントが
> 想定していた `AutoLineDigitizerService` / `HttpClientPort` /
> `DigitizeWithAutoLineDigitizerUseCase` のcore移植(旧Phase 3の一部)は
> **スコープアウト**した。AI抽出は将来、自前モデルによる
> deep-digitizerとして再実装される可能性があるが、その際は改めて
> 設計する。以下の本文中の該当記述は当時の設計として残しつつ、
> Phase 3の節に撤去後の方針を明記している。

## 1. 調査範囲と現状(As-Is)まとめ

調査対象: `src/domain`, `src/application`, `src/presentation`, `src/general`,
`src/instanceStore`, `vite.library.config.ts`, `library-build/`, `design_doc/`,
`docs/`。

現行アプリはすでに `domain` / `application` / `presentation` の3層構成で、
`design_doc/domains_diagram.png` に旧版のクラス図(Axes/Canvas世代)が残っている。
現状のレイヤー実態は以下の通り。

| 層 | 実装 | フレームワーク結合 |
|---|---|---|
| domain/models | `Axis`, `AxisSet`, `Dataset` | なし。プリミティブ型のみで完結 |
| domain/services | `AxisSetCalculator` | なし。座標変換の純粋関数群 |
| domain/repositories | `AxisSetRepository`, `DatasetRepository` | なし。配列操作のみ |
| application/strategies | `LineExtract`, `SymbolExtractByArea`, `ExtractParent` | なし。`Uint8ClampedArray` を直接処理する純粋アルゴリズム |
| application/services | `Extractor`, `CanvasHandler`, `Interpolator`, `Magnifier`, `Confirmer`, `ProjectService`, ~~`AutoLineDigitizerService`~~(2026-08-15 撤去) | **混在**(詳細は2章) |
| general/instanceStore | `InstanceManager`, シングルトンストア | Vueではないが、モジュールレベルの単一グローバル状態に依存 |
| presentation | Vue 3 + Vuetify コンポーネント群、`HTMLCanvas`(DOM直叩き) | Vue/DOM に強結合(想定通り) |

### 発見事項: 既存の依存方向違反

切り出し設計を始める前に、現状の重大な問題を明記しておく。

- `src/application/services/canvasHandler/canvasHandler.ts` と
  `src/application/services/interpolator/interpolator.ts` が
  **`presentation/dom/HTMLCanvas` を直接 import している**
  (`import { HTMLCanvas } from '../../../presentation/dom/HTMLCanvas'`)。
  クリーンアーキテクチャの依存方向(常に内側へ)に反し、application → presentation
  という逆向き依存が既に発生している。
- `CanvasHandler` は `document.getElementById('canvasWrapper')` 等、
  **DOM要素IDをapplication層にハードコード**しており、Vueテンプレート側のid属性と
  暗黙結合している。
- `Interpolator` は `@/instanceStore/*` のシングルトンを直接importしており、
  DIではなくグローバル参照で依存している。

→ これらは「切り出しの障害」であると同時に、既存アプリ自体のクリーンアーキテクチャ
違反でもある。今回の切り出し作業は、この違反を **Portインターフェースの導入で解消
することも兼ねる**。

## 2. コードの分類(切り出し容易性)

| 分類 | 該当コード | 切り出し方針 |
|---|---|---|
| **A. Pure Core**(そのまま移動可) | `domain/models/*`, `domain/services/axisSetCalculator`, `domain/repositories/*`, `application/strategies/*`(LineExtract/SymbolExtractByArea/ExtractParent), `application/lib/CurveInterpolatorLib`, `application/utils/pointsUtils`, `application/utils/colorPaletteUtils`, `application/services/magnifier`, `application/services/confirmer` | Phase 1でファイル単位コピー。DOM/Vue importなし。`Uint8ClampedArray` 等プリミティブ入出力のみ |
| **B. Port化が必要**(DOM結合をインターフェースで切る) | `application/services/canvasHandler`, `application/services/extractor`(CanvasHandlerInterfaceに依存), `application/services/interpolator`(描画部分) | Phase 2で `PixelSourcePort` 等を core 側に定義し、DOM実装をアプリ側アダプタへ追い出す |
| **C. Infra(isomorphicだがI/Oを持つ)** | ~~`application/services/autoLineDigitizerService`(fetch)~~(2026-08-15 機能撤去によりスコープアウト), `application/services/projectService`(ZIP/DTO変換部分) | Phase 3で `SerializeProjectUseCase` 等を介して core 側 infrastructure に移動。ただし `File`/`Blob`/`document.createElement('a')` によるダウンロードUIはアプリ側に残す |
| **D. Presentation専用**(切り出さない) | `presentation/**`, `HTMLCanvas`, `dragRectangleCalculator`, `mouseEventUtilities`, Vueコンポーネント全般 | 既存アプリに残置。core の Port実装(アダプタ)を提供する側になる |
| **E. Vue専用の薄いグルー** | `instanceStore/*`, `general/instanceManager/*` | 既存アプリのDIコンテナとして残置。core 側は状態をシングルトンで持たず、利用側がインスタンス化する設計に変更 |

## 3. 切り出し方式の比較と推薦

| 観点 | 新規リポジトリ | モノレポ内パッケージ(推薦) |
|---|---|---|
| 初期セットアップコスト | 高(CI/lint/test/publishを1から構築) | 低(既存Jest/ESLint/TS設定を流用) |
| 段階的移行のしやすさ | 低(cross-repo PRとバージョン同期が必要になり、Port導入中の頻繁な変更に弱い) | 高(同一PR内でcoreとアプリ側アダプタを同時に変更できる) |
| API安定前の試行錯誤 | やりにくい(公開npmパッケージの体裁を早期に背負う) | やりやすい(`workspace:*` 参照で即座に統合テストできる) |
| 依存方向強制(dependency-cruiser) | リポジトリが分かれるため自然に強制される | **明示的にルールを書かないと `packages/plot-digitizer-core` → `src/` の逆参照を防げない**(要CI設定) |
| 本プロジェクトの制約 | CLAUDE.mdによりmain反映・タグ発行・npm公開は司令塔経由の人間承認が必須。新規リポジトリはそれ自体が「本番反映」に近い意思決定 | developブランチ内で完結でき、「実験」段階に留められる |
| 将来の独立公開 | — | API安定後、`git filter-repo`/`git subtree split` で機械的に切り出し可能。メジャーバージョン公開と同様、司令塔経由の人間承認ポイントとして扱える |

**推薦: モノレポ内パッケージ方式(npm workspaces)を第一段階として採用する。**

理由:
1. 現在 `CanvasHandler`/`Interpolator` に見つかった依存方向違反を安全に解消するには、
   core側とアプリ側アダプタを同一PRで同時に書き換えられる必要がある。新規リポジトリ
   では移行中ずっと2リポジトリ間のバージョン不整合を抱えることになる。
2. CLAUDE.mdの「本番リリース禁止」「mainを触らない」制約下では、新規リポジトリの
   作成・公開自体が独立した意思決定であり、司令塔確認が別途必要になる。モノレポ内
   パッケージなら現行ミッション(develop上のfeatureブランチでの設計・実装)の枠内で
   進められる。
3. Port境界が安定し、`packages/plot-digitizer-core` が `src/`(Vueアプリ)から
   一切参照されない状態をdependency-cruiserで機械的に証明できたら、そのタイミングが
   「新規リポジトリへ切り出す/npm公開する」判断の自然な区切りになる(3-a参照)。

デメリットと対策:
- モノレポでは `packages/plot-digitizer-core` → `src/`(アプリ側)への誤importが
  技術的に可能。→ dependency-cruiser で **`packages/plot-digitizer-core` 配下から
  `src/` 配下への import を禁止するルール**をCIで必須化する(7章)。
- `package.json` に `workspaces` フィールドが無い(現状は単一パッケージ)。→
  Phase 0のセットアップタスクとして追加が必要(実装フェーズで対応、設計フェーズでは
  ディレクトリ構成のみ提案)。

### 3-a. 将来の新規リポジトリ分離の判定基準(参考・司令塔合意事項)

以下をすべて満たした時点で、新規リポジトリ分離を司令塔に提案する:
- `plot-digitizer-core` のドメイン層テストカバレッジが6章の目標を継続的に達成
- dependency-cruiserで `core → src/` 方向の依存が0件
- core の公開APIが2バージョン以上、破壊的変更なく安定
- `starry-digitizer`(Vueライブラリ)が `plot-digitizer-core` 経由でのみコア機能を
  利用しており、旧 `src/domain`,`src/application` の重複コードが削除済み

## 4. ターゲットアーキテクチャ(To-Be)

### 4.1 ディレクトリ構成(提案)

```
plot-digitizer/ (リポジトリルート)
├── packages/
│   └── plot-digitizer-core/          # 新規npmパッケージ("plot-digitizer")
│       ├── src/
│       │   ├── domain/
│       │   │   ├── models/           # Axis, AxisSet, Dataset (既存をほぼそのまま移植)
│       │   │   └── services/         # AxisSetCalculator
│       │   └── application/
│       │       ├── strategies/       # LineExtract, SymbolExtractByArea, ExtractParent
│       │       ├── useCases/         # ExtractPointsUseCase, InterpolatePointsUseCase,
│       │       │                     # SerializeProjectUseCase
│       │       └── ports/            # PixelSourcePort (interfaceのみ)
│       ├── tests/
│       └── package.json               # name: "plot-digitizer"
├── src/                                # 既存Vueアプリ(starry-digitizer) 変更後
│   ├── presentation/                   # 既存。plot-digitizer-coreのPortを実装するアダプタを追加
│   │   └── adapters/
│   │       └── BrowserPixelSourceAdapter.ts  # PixelSourcePortのDOM実装(旧CanvasHandlerの一部)
│   ├── application/                    # 段階的に薄くなる。UI用の状態管理・イベントハンドリングのみ残る
│   └── domain/                         # Phase 4完了後は削除し、plot-digitizer-coreを直接importする
└── library-build/                      # 既存。StarryDigitizer.vueのエントリはそのまま
```

### 4.2 レイヤーと依存方向

```mermaid
flowchart TB
    subgraph core["plot-digitizer-core (npm: plot-digitizer)"]
        direction TB
        D[Domain\nAxis / AxisSet / Dataset / AxisSetCalculator]
        A[Application\nUseCases + ExtractStrategies]
        P["Ports (interfaces)\nPixelSourcePort"]
        A -->|depends on| D
        A -->|depends on| P
    end

    subgraph app["starry-digitizer (Vue app, 既存リポジトリ直下)"]
        direction TB
        UC[Application(UI)\nCanvasHandler(薄化) / ViewModel]
        AD["Adapters\nBrowserPixelSourceAdapter (implements PixelSourcePort)"]
        UI[Presentation\nVue Components]
    end

    UI --> UC
    UC -->|import| core
    AD -->|implements| P
    UC -->|inject| AD

    style core fill:#1e293b,color:#f8fafc
    style app fill:#312e2955,color:inherit
```

依存方向の原則(クリーンアーキテクチャ):
- `domain` は何にも依存しない。
- `application`(core)は `domain` と `ports`(自パッケージ内の抽象)にのみ依存する。
- `infrastructure`(core)は `ports` を実装し、`application` から呼ばれる(DIで注入)。
  fetch等isomorphicなI/Oはcore内に置いてよいが、**DOM/Vueには一切依存しない**。
- アプリ側 (`src/`) の `adapters` が `PixelSourcePort` などcoreの port を実装し、
  `HTMLCanvas`/`document` を扱う。**coreからアプリ側への依存は禁止**
  (dependency-cruiserで機械的に強制。7章)。
- 現状発見した違反(`CanvasHandler`/`Interpolator` → `presentation/dom/HTMLCanvas`)
  は、Phase 2で `PixelSourcePort` 導入により解消する。

### 4.3 クラス図(Mermaid classDiagram)

```mermaid
classDiagram
    %% ==== domain ====
    class Axis {
      +string name
      +number value
      +Coord coord
      +coordIsFilled: boolean
      +clearCoord()
    }
    class AxisSet {
      +Axis x1
      +Axis x2
      +Axis y1
      +Axis y2
      +boolean xIsLogScale
      +boolean yIsLogScale
      +boolean considerGraphTilt
      +addAxisCoord(coord)
      +moveActiveAxis(vector)
    }
    class Dataset {
      +number id
      +string name
      +Point[] points
      +addPoint(xPx, yPx)
      +clearPoint(id)
      +pointsSortedByXAscending() Point[]
    }
    class AxisSetCalculator {
      -AxisSet axisSet
      +calculateXYValues(xt, yt) XYValue
      +calculatePixelCoordinates(xValue, yValue) Coord
    }
    AxisSetCalculator --> AxisSet : reads

    %% ==== application: strategies (pure) ====
    class ExtractStrategyInterface {
      <<interface>>
      +execute(height, width, imageColors, maskColors, isDrawnMask, targetColor, threshold) Coord[]
    }
    class ExtractParent {
      <<abstract>>
      #matchColor(rgb1, rgb2, ratio) boolean
      #isOnMask(r,g,b,a) boolean
    }
    class LineExtract {
      +execute(...) Coord[]
    }
    class SymbolExtractByArea {
      +execute(...) Coord[]
    }
    ExtractStrategyInterface <|.. LineExtract
    ExtractStrategyInterface <|.. SymbolExtractByArea
    ExtractParent <|-- LineExtract
    ExtractParent <|-- SymbolExtractByArea

    %% ==== application: ports ====
    class PixelSourcePort {
      <<interface>>
      +width: number
      +height: number
      +getImageColors() Uint8ClampedArray
      +getMaskColors() Uint8ClampedArray
      +isDrawnMask: boolean
    }

    %% ==== application: use cases ====
    class ExtractPointsUseCase {
      -ExtractStrategyInterface strategy
      +execute(pixelSource: PixelSourcePort, targetColor, threshold) Coord[]
    }
    ExtractPointsUseCase --> ExtractStrategyInterface
    ExtractPointsUseCase --> PixelSourcePort

    class InterpolatePointsUseCase {
      +execute(anchorPoints: Point[], interval: number) Coord[]
    }

    class SerializeProjectUseCase {
      +toProjectDTO(axisSets, datasets) ProjectDTO
      +fromProjectDTO(dto) : {axisSets, datasets}
    }

    %% ==== app-side adapter (別リポジトリ配下 src/) ====
    class BrowserPixelSourceAdapter {
      -HTMLCanvasElement canvas
      +getImageColors() Uint8ClampedArray
      +getMaskColors() Uint8ClampedArray
    }
    PixelSourcePort <|.. BrowserPixelSourceAdapter : implements (app側)
```

### 4.4 公開API(ファサード)案

npm利用者向けの最上位エクスポートは、既存の内部構造を直接晒さず、ユースケース単位の
関数/クラスに絞る(将来の内部リファクタの自由度を確保するため)。

```ts
// packages/plot-digitizer-core/src/index.ts (イメージ)
export { Axis, AxisSet, Dataset } from './domain/models'
export { AxisSetCalculator } from './domain/services'
export type { PixelSourcePort } from './application/ports'
export { ExtractPointsUseCase } from './application/useCases/extractPointsUseCase'
export { InterpolatePointsUseCase } from './application/useCases/interpolatePointsUseCase'
export { SerializeProjectUseCase } from './application/useCases/serializeProjectUseCase'
export type { ProjectDTO, AxisSetDTO, DatasetDTO } from './application/dto'
```

`starry-digitizer`(Vueライブラリ)は `plot-digitizer` を dependency として持ち、
UI固有の状態管理(`instanceStore`)・DOM操作(`CanvasHandler`の描画部分)・
Vueコンポーネントのみを担当する形に薄くなる。

## 5. 既存UIとの共存方法・段階的移行手順

各Phaseは独立してマージ可能な単位とし、Phase内で `develop` へのPRを作成する
(CLAUDE.mdの通りmain・push・タグ操作は行わない/司令塔承認まで留保)。

### Phase 0: 土台整備
- `package.json` に `workspaces: ["packages/*"]` を追加し、
  `packages/plot-digitizer-core` を新規パッケージとして作成(`name: "plot-digitizer"`)。
- core用の `tsconfig.json`(`strict: true`, DOM libなし)、Jest(またはVitest)設定、
  ESLintをセットアップ。
- dependency-cruiser導入(7章のルールをCIに追加、最初は空集合でも通ることを確認)。
- **影響: 既存アプリの挙動変更なし。**

### Phase 1: Pure Coreの移植(分類A)
- `domain/models/*`, `domain/services/axisSetCalculator`,
  `application/strategies/*`, `application/lib/CurveInterpolatorLib`,
  `application/utils/{pointsUtils,colorPaletteUtils}`, `magnifier`, `confirmer` を
  `packages/plot-digitizer-core` にコピー(既存テストも移植し、Red→Greenを確認)。
- 既存アプリの `src/domain/*` 等は **削除せず**、`plot-digitizer-core` を
  re-export する薄いラッパーに置き換える(例: `src/domain/models/axis/axis.ts` が
  `export { Axis } from 'plot-digitizer'` のみになる)。既存importパスを壊さない。
- **影響: アプリの公開挙動は不変。テストはcore側で実施し、アプリ側は統合確認のみ。**

### Phase 2: Port導入によるDOM分離(分類B、既存違反の解消)
- core に `PixelSourcePort` を定義。
- `Extractor`/`ExtractPointsUseCase` の引数を `CanvasHandlerInterface` 依存から
  `PixelSourcePort` 依存へ変更。
- アプリ側に `BrowserPixelSourceAdapter`(`src/presentation/adapters/`)を新設し、
  既存 `CanvasHandler` が持っていた `originalImageCanvasColors` 等のDOM処理を移設。
- `CanvasHandler`/`Interpolator` から `presentation/dom/HTMLCanvas` への直接import
  を削除し、アダプタ経由に置き換える(**既存の依存方向違反を解消**)。
- **影響: 挙動不変を目標にリファクタ。Cypress E2Eで回帰確認必須。**

### Phase 3: Infra移植(分類C)

> **スコープ変更(2026-08-15)**: `AutoLineDigitizerService`(AI抽出/Hugging Face
> Space連携)は、当該APIが常時503エラーを返す状態になったためオーナー判断で
> starry-digitizer本体から**撤去済み**。これに伴い、本Phaseで予定していた
> `AutoLineDigitizerService` の `HttpClientPort` 経由でのcore移植、および
> `HttpClientPort` / `DigitizeWithAutoLineDigitizerUseCase` 自体の新設は
> **スコープアウト**する。AI抽出機能は将来、自前モデルによる
> **deep-digitizer**として再実装される可能性があるが、その際は改めて
> 別途設計する(HttpClientPort相当のPortが必要になるかどうかも含め再検討)。

- `ProjectService` のうち `ProjectDTO ⇄ ドメインモデル` 変換ロジック
  (`exportProject`のDTO組み立て、`loadProject`の復元処理)を
  `SerializeProjectUseCase` としてcoreへ移植。
  ZIP化・ダウンロード・`File`/`Blob`操作はアプリ側 `ProjectService` に残す。
- **影響: プロジェクト入出力のリグレッションテストを重点実施。**

### Phase 4: 公開APIファサード確定 & 重複削除
- `packages/plot-digitizer-core/src/index.ts` を確定し、SemVer 0.x系で
  `npm run build` 相当のパッケージビルドを用意(公開はしない。7章参照)。
- 既存 `src/domain`, `src/application` 内の re-export ラッパーを整理し、
  アプリコード全体が `plot-digitizer` を直接importする形に統一。
- **影響: 大規模だが機械的な import置換が中心。dependency-cruiserで
  `src/domain`,`src/application` への新規追加をCIで禁止し、後戻りを防ぐ。**

### Phase 5(参考、本ミッション範囲外): 独立リポジトリ化・npm公開の検討
- 3-aの判定基準を満たした時点で司令塔に提案。承認後に着手(本ミッションには含めない)。

## 6. ドメイン層テストカバレッジ目標(提案)

CLAUDE.mdの暫定値(90%)をベースに、`plot-digitizer-core` 向けに層ごとの目安を提案する。

| 層 | カバレッジ目標 | 理由 |
|---|---|---|
| `domain/models`, `domain/services` | **95%** | 副作用なし・分岐が少なく高カバレッジが低コストで達成可能。既存 `axis.test.ts`/`axisSet.test.ts`/`axisSetCalculator.test.ts` が土台としてすでに存在 |
| `application/strategies`(抽出アルゴリズム) | **90%** | ピクセル走査のループ・境界条件が多く、既存 `extractor.test.ts`/`lineExtract.test.js` 等を移植・拡充 |
| `application/useCases` | **90%** | Port経由の統合ロジック。Portはテストダブルで代替可能なため到達しやすい |
| `infrastructure`(fetchアダプタ等) | **70%**(参考値・CLAUDE.md全体目標には含めない) | 外部API呼び出しはネットワークモック中心になり、境界値以上の網羅は費用対効果が低い |

**司令塔への確認事項**: `packages/plot-digitizer-core` 全体(domain+application)の
CIゲート目標を **90%** のままとし、infrastructureはCI集計対象から除外する、という
方針で確定してよいか(CLAUDE.mdの90%はdomain限定の記載だが、切り出し後は
domain単体だと母数が小さすぎるため application を含めた数値での運用を提案)。

## 7. CIでの依存方向強制(dependency-cruiser)

`.dependency-cruiser.cjs`(実装フェーズで追加予定)のルール概要案:

```js
// イメージ(実装時に精査)
module.exports = {
  forbidden: [
    {
      name: 'core-no-app-dependency',
      severity: 'error',
      from: { path: '^packages/plot-digitizer-core' },
      to: { path: '^src/' }, // アプリ側(Vue)への依存を禁止
    },
    {
      name: 'core-domain-no-outward-dependency',
      severity: 'error',
      from: { path: '^packages/plot-digitizer-core/src/domain' },
      to: { pathNot: '^packages/plot-digitizer-core/src/domain' },
    },
    {
      name: 'core-no-vue-or-dom',
      severity: 'error',
      from: { path: '^packages/plot-digitizer-core' },
      to: { path: '^(vue|@vue|vuetify)' },
    },
  ],
}
```
CI(GitHub Actions)で `npx depcruise` をlintジョブに追加し、違反時はビルド失敗とする
(CLAUDE.mdの通り、設定を緩めない)。

## 8. リスク・未決事項(司令塔確認事項)

1. **カバレッジ目標の確定**(6章): domain単体90%か、application込み90%か。
2. **モノレポ方式の承認**: 3章の推薦(新規リポジトリではなくモノレポ内パッケージ)
   でよいか。
3. **Phase 2でのCanvasHandler分割範囲**: `CanvasHandler` はマスク描画(ペン/box/
   eraser)など明確にUI操作な機能も多く持つ。今回 `PixelSourcePort` として切り出す
   のは「ピクセル読み取り」機能のみとし、マスク描画自体はアプリ側に残す想定だが、
   この境界線で問題ないか。
4. **ProjectService分割の粒度**: DTO変換ロジックのみcoreへ、ZIP/File操作はアプリ側、
   という切り分けで妥当か(JSZip自体はisomorphicなためcoreに含める案も検討可能)。
5. ~~**`AutoLineDigitizerService` のAPIエンドポイント**~~: **対応不要になった
   (2026-08-15)**。当該API(`https://t29mato-autolinedigitizer.hf.space/...`)
   が常時503を返す状態となり、機能自体をstarry-digitizer本体から撤去した
   ため、core移植の要否も含めて未決事項ではなくなった。将来deep-digitizer
   として再実装する際は、この項目で懸念していた「公開npmパッケージへの
   特定外部APIのデフォルト同梱は不適切」という論点自体は引き続き有効な
   ので、その時点で再度議論する。

## 9. 次のアクション

- 本ドキュメントのレビュー([REPORT] status: need-review)を司令塔に依頼。
- レビュー合格後、Phase 0から着手(featureブランチ、develop起点、TDD)。
