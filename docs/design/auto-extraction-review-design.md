# 実装設計: 自動抽出結果のレビュー(取り込み形式・編集ログ)

依頼元: real-chart-bench(論文図の自動抽出ベンチマーク)。依頼文は 6 機能(取り込み、信頼度表示、系列編集、編集ログ、
画素座標つき書き出し、差分表示)で、優先は 1 → 4 → 3 → 2 → 5 → 6。**本設計で実装するのは 1(自動抽出結果の取り込み)と
4(編集ログ)**。2/3/5/6 は本設計のデータ構造の上に後から載せられるよう、拡張点だけ決めておく(末尾「後続機能への拡張点」)。

## 既存機能との重なり(調査結果)

| 既存機能 | 場所 | 重なり | 方針 |
|---|---|---|---|
| プロジェクト保存/読み込み(ZIP: `project.json` + 画像) | `ProjectService`, `projectFileOperations.ts` | 「状態を外から入れる」点で重なる | `project.json` は内部状態のダンプ(点 id、`visiblePointIds`、`pointMode`、拡大率…)で、外部の抽出器が書く形式には向かない。**取り込み形式は別に定める**が、取り込み後の状態は既存の `AxisSet` / `Dataset` そのものなので、保存/読み込み・undo はそのまま効く。レビュー中の状態(初期状態と操作ログ)は `ProjectDTO` に任意フィールド `reviewSession` として足し、途中保存→再開しても編集ログが続くようにする |
| JSON 書き出し | なし(書き出しはクリップボードへの CSV と ZIP のみ) | — | 編集ログの `final` に「取り込み形式と同じスキーマの最終状態(画素座標+値)」を入れる。これが機能 5 の土台になる |
| 軸 OCR(`AxisOcrReader` + `axisOcrMatcher`) | `AxisSetSettings.vue` | 軸の値を自動で入れる点で重なる | 取り込みで `axes` があれば軸校正済みの状態で始まるので OCR は不要。`axes: null` なら従来どおり人が x1/x2/y1/y2 をクリックし、OCR も使える。コードの共有はない |
| 自動検出(`Extractor` の Symbol/Line Extract) | `ExtractorSettings.vue` → `datasetRepository.setPoints()` | 点を自動で置く点で重なる | 取り込んだ系列も同じ `Dataset` なので、取り込んだ系列の上で既存の自動検出を走らせることもできる(その場合、元の点は「削除」、新しい点は「追加」として編集ログに数えられる) |
| Undo/Redo(`HistoryManager`) | `capture()` を各編集操作の直前に呼ぶ | 「編集操作の発生点」を既に網羅している | 編集ログのイベント記録は `capture(action)` にラベルを足してフックする(各画面にログ処理を散らさない)。取り込み直後は新しい画像を開いたときと同じく履歴を消す |
| 軸の値⇄画素の変換(`AxisSetCalculator`) | `calculateXYValues` / `calculatePixelCoordinates` | 値で渡された点を画素に置く・最終状態を値で出す | そのまま使う。目盛 3 本以上の最小二乗校正は、その結果を既存の 4 点(x1/x2/y1/y2)へ落とし込むので、計算器は変えない |

## 1. 取り込み形式(`starry-digitizer/auto-extraction` v1)

依頼の案を基本に、曖昧な所だけ決めた。確定版の説明は `/var/tmp/starry-digitizer-auto-extraction-schema-v1.md` に置く(real-chart-bench 向け)。

```jsonc
{
  "format": "starry-digitizer/auto-extraction", // 任意。あれば一致を検査
  "version": 1,                                  // 必須。1 のみ
  "image": "fig.png" | { "url": "...", "width": 800, "height": 600 } | null, // 任意
  "axes": {                                      // 任意。null/省略 = 軸は人が校正する
    "x": { "scale": "linear" | "log", "ticks": [{ "px": 120.0, "value": 300 }, ...] },
    "y": { "scale": "linear" | "log", "ticks": [{ "px": 480.5, "value": 0.1 }, ...] }
  },
  "series": [{
    "label": "x=0.1",                            // 任意。なければ "series 1" ...
    "points_px":    [[x, y], ...] | null,        // 画像の画素座標
    "points_value": [[x, y], ...] | null,        // 印字どおりの値
    "scores":       [0.93, ...] | null           // 点ごとの信頼度(任意)
  }],
  "source": { "extractor": "markernet-v2", "run": "..." } // 任意・自由形式。編集ログにそのまま写す
}
```

決めたこと:

- **画素座標の約束**: 元画像の画素単位、原点は左上の画素の左上の角、x は右、y は下が正。画素 (i, j) の中心は (i + 0.5, j + 0.5)。
  starry-digitizer がクリック位置を記録する座標系と同じ。numpy の添字(中心 = 整数)で持っている書き出し側は 0.5 を足す。
- **目盛の `px`**: x 軸の目盛は x 画素座標、y 軸の目盛は y 画素座標(1 次元)。軸は画像の縦横に平行と仮定する(傾き補正は人が後で使える)。
- **目盛 2 本以上**: 値(log 軸は log10 値)と画素の間を最小二乗で直線に当てはめ、目盛ごとの残差(当てはめた画素 − 与えた画素)、
  RMS、最大値を返す。当てはめた直線から、最小値と最大値の目盛の位置に既存の x1/x2(y1/y2)を置く。残差が大きい(既定 2px 超)ときは警告。
  ゼロ割れ・同一値・log 軸で値 ≤ 0 はエラー。
- **点の座標の優先順**: `points_px` があればそれで置く。`points_px` が null で `points_value` だけなら、`axes` で画素へ変換して置く
  (`axes` が無ければエラー)。両方あるときは `points_px` で置き、`points_value` は取り込み時の値として保持するだけ(照合はしない)。
  `points_px` / `points_value` / `scores` は、あれば同じ長さでなければならない。
- **画像の範囲外の点**: 取り込むが警告に数える(凡例・目盛を拾った誤検出は人が消せばよい)。数値でない座標はエラー。
- **画像**: 文字列は URL(データ URL 可)。オブジェクトは `url` と、照合用の `width` / `height`。`null`・省略なら今の画像のまま
  (ライブラリ API で画像を別に渡す場合もこれ)。`width` / `height` が実画像と違えば警告。URL パラメータから読んだ場合、
  相対 URL は JSON の URL を基準に解決する。画像は fetch してデータ URL にしてから読み込む(別オリジンの画像で canvas が汚れて
  自動検出が使えなくなるのを防ぐ。相手側に CORS が必要)。
- **未知のフィールドは無視**(将来の追加で古い starry-digitizer が壊れないように)。`version` が 1 以外はエラー。

取り込みの結果、既存の状態はすべて置き換える(軸セット 1 つ、系列ごとに `Dataset` 1 つ、「View All」表示、履歴は消去)。

### 点の出自の記録

`Point` 型に任意フィールドを 2 つ足す。

```ts
export type Point = {
  id: number
  xPx: number
  yPx: number
  origin?: { series: number; index: number } // 取り込んだ点だけが持つ。series/index は取り込み文書での添字
  score?: number                              // 取り込み時の信頼度(機能 2 で使う)
}
```

点の移動(`moveActivePoint`)は同じオブジェクトを書き換え、undo のスナップショットとプロジェクト保存は `points` をそのまま
JSON にするので、`origin` はどの経路でも保たれる。人が足した点には `origin` が無い。**これにより編集ログは「操作を数える」の
ではなく「初期状態と現在の状態の差」から決まる**(下記)。

### 渡し方(入口)

1. **ライブラリ API**(`library-build/entry.ts` から export)
   - `parseAutoExtraction(json: unknown): ParsedAutoExtraction`(検査と正規化だけ。状態は変えない。エラーは例外)
   - `loadAutoExtraction(doc, options?: { image?: string; baseUrl?: string }): Promise<AutoExtractionLoadResult>`
     (`AutoExtractionLoadResult` = 系列数・点数・軸校正の残差・警告)
   - `buildEditLog(): EditLog | null`、`downloadEditLog(filename?)`
2. **URL パラメータ**: `?extraction=<JSON の URL>`(http/https のみ)。起動時に fetch して取り込む。
3. **postMessage**: 起動時に `window.opener` / `window.parent` へ `{ type: 'starry-digitizer:ready' }` を送る(データを含まないので
   targetOrigin は `*`)。受け付けるのは **`window.opener` か `window.parent` から来たメッセージだけ**(任意のページから状態を
   入れ替えられないように)。
   - `{ type: 'starry-digitizer:load-auto-extraction', document, image? }` → 取り込んで `{ type: 'starry-digitizer:load-result', ok, result | error }` を返す
   - `{ type: 'starry-digitizer:get-edit-log' }` → `{ type: 'starry-digitizer:edit-log', editLog }` を返す(返信先は送り主のオリジンに限る)
4. **アプリのメニュー**: File → 「Import Auto-Extraction (JSON)…」「Export Edit Log (JSON)」。

## 4. 編集ログ(`starry-digitizer/edit-log` v1)

### 考え方: 差分が主、操作の記録は従

- 既存の編集経路は一律ではない(削除モードのクリック・自動検出・軸の値の入力欄は `capture()` を呼ばない)。操作を数えるだけだと
  取りこぼし、undo で戻した操作の扱いも曖昧になる。そこで **修正コストの数値(`summary`)は、取り込み直後の状態と書き出し時の
  状態の差から計算する**。どの UI 経路で直しても、undo しても、途中で保存・再読み込みしても同じ答えになる。
- 加えて、時刻つきの操作の記録(`events`)も残す。`HistoryManager.capture(action)` にラベルを渡し、`HistoryManager` の購読者として
  `ReviewSession` が記録する。undo/redo もイベントとして残る。時間や手数を見たい分析用で、`summary` には使わない。
  ついでに、削除モードのクリックと自動検出の実行にも `capture()` を足す(undo できなかった操作が undo できるようになる)。

### 差分の定義

取り込み時に `ReviewSession` が初期状態(系列ごとの点の画素座標、軸校正の 4 点・値・log 指定)を保持する。書き出し時の状態と比べる。

- 点(`origin` で同一性を判定)
  - **deleted**: 初期にあって、どの系列にも残っていない
  - **moved**: 残っていて、移動量が `moveTolerancePx`(既定 0.5px)を超える。移動量(px)の一覧も出す
  - **kept**: 残っていて動いていない
  - **added**: `origin` を持たない点(人が足した点、補間で確定した点、自動検出で置き直した点)
  - **reassigned**: 残っている点のうち、元の系列の「主な行き先」(その系列の点を最も多く含む `Dataset`)以外にある点
- 系列
  - **split**: 元の系列 s の点が k 個の `Dataset` に分かれていれば k − 1 を数える
  - **merged**: 1 つの `Dataset` に k 本の元系列の点が入っていれば k − 1 を数える
  - **added**: 点を持ち、`origin` つきの点を 1 つも持たない `Dataset`
  - **removed**: 初期に点があり、点が 1 つも残っていない元系列
  - **renamed**: 主な行き先の名前が元の `label` と違う
- 軸
  - 取り込み時に校正済みなら、x1/x2/y1/y2 のうち位置が `moveTolerancePx` を超えて動いた・値が変わったものの数、log 指定の変更の数
  - 取り込み時に未校正なら `initially_calibrated: false` とし、書き出し時に校正済みかどうかだけ出す(人がゼロから校正した、の意)

### 出力

```jsonc
{
  "format": "starry-digitizer/edit-log",
  "version": 1,
  "source": { ... },                      // 取り込み文書の source をそのまま
  "imported_at": "2026-10-09T01:23:45.000Z",
  "exported_at": "2026-10-09T01:30:00.000Z",
  "elapsed_ms": 375000,
  "move_tolerance_px": 0.5,
  "summary": {
    "points":  { "initial": 120, "final": 118, "kept": 100, "moved": 10, "deleted": 10, "added": 8, "reassigned": 3 },
    "series":  { "initial": 4, "final": 3, "split": 0, "merged": 1, "added": 0, "removed": 0, "renamed": 1 },
    "axes":    { "initially_calibrated": true, "finally_calibrated": true, "reference_points_changed": 1, "scale_changed": 0 },
    "events":  { "total": 42, "undo": 2, "redo": 0 }
  },
  "details": {
    "moved":   [{ "series": 0, "index": 3, "dx": 1.0, "dy": -2.0, "distance": 2.24 }],
    "deleted": [{ "series": 1, "index": 7, "px": [301.5, 220.0], "score": 0.31 }],
    "added":   [{ "dataset": "x=0.1", "px": [140.0, 300.5] }],
    "series_mapping": [{ "series": 0, "label": "x=0.1", "destinations": [{ "dataset": "x=0.1", "points": 30 }] }]
  },
  "events": [{ "t_ms": 1200, "action": "point.add" }, { "t_ms": 3400, "action": "undo" }],
  "final": { /* 取り込み形式 v1 と同じスキーマの最終状態(points_px と、校正済みなら points_value) */ }
}
```

`final` は取り込み形式と同じなので、そのまま読み込み直せる。`final.axes` は x1/x2/y1/y2 の 4 点を目盛 2 本ずつとして出す。
`final.series[].scores` は元の点の score を引き継ぐ。人が足した点に仮の値(1 など)を入れると意味の違う値が混ざるので、
**score を持たない点が 1 つでもある系列では `scores` を `null` にする**。点ごとの出自は `final.series[].origins`
(`[[series, index] | null, ...]`)として出す(取り込み時は無視される拡張フィールド)。

## 構成

```mermaid
classDiagram
    class autoExtractionParser {
        <<pure functions>>
        +parseAutoExtraction(json) ParsedAutoExtraction
    }
    class axisTickFitter {
        <<pure functions / domain service>>
        +fitAxisTicks(ticks, scale) AxisFit
    }
    class editLogDiff {
        <<pure functions>>
        +diffReviewState(initial, current, tolerance) EditLogDiff
    }
    class ReviewSession {
        +isActive: boolean
        +start(initialState, source)
        +record(action)
        +clear()
        +toDTO() / restore(dto)
        +buildEditLog(currentState, final) EditLog
    }
    class autoExtractionOperations {
        <<application functions>>
        +loadAutoExtraction(doc, options) Promise~LoadResult~
        +buildEditLog() EditLog
        +downloadEditLog()
        +loadAutoExtractionFromUrlParam()
        +installPostMessageBridge()
    }
    class HistoryManager {
        +capture(action?)
        +subscribe(listener)
    }
    autoExtractionOperations --> autoExtractionParser
    autoExtractionOperations --> axisTickFitter
    autoExtractionOperations --> ReviewSession
    ReviewSession --> editLogDiff
    HistoryManager --> ReviewSession : capture/undo/redo イベント
```

- 純粋関数(`autoExtractionParser.ts`、`editLogDiff.ts` は `src/application/utils/`、`axisTickFitter.ts` は `src/domain/services/`)は
  DOM に触れず Jest で網羅する。
- `ReviewSession`(`src/application/services/reviewSession/`)は状態だけを持つ。`applicationServiceInstances.ts` で `HistoryManager` と
  同じく直接生成し、`historyManager.subscribe()` で操作を受ける。
- `autoExtractionOperations.ts` は `projectFileOperations.ts` と同じく、シングルトンのリポジトリ・`canvasHandler` を使って状態を
  組み立てる層。アプリのメニュー、URL パラメータ、postMessage、ライブラリ API がすべてここを通る。
- 画面: `StarryDigitizer.vue` の左サイドバーに `ReviewSessionPanel.vue` を足す(レビュー中だけ表示)。出自(extractor/run)、
  軸校正の残差、差分の要約(moved/deleted/added…)を常に表示し、「Export Edit Log」ボタンを置く。ライブラリに埋め込んだ場合も出る。
- プロジェクト保存: `ProjectDTO.reviewSession?`(初期状態・source・取り込み時刻・イベント)。読み込み時にあれば復元、無ければレビュー終了。
- 新しい画像を開いたとき(`ImageSettings`)はレビューを終了する(履歴を消すのと同じ理由)。

## 後続機能への拡張点(今回は実装しない)

- **2. 信頼度の表示**: `Point.score` を取り込み時に入れてあるので、`CanvasPoint` の色をスコアで変える・低スコア順に巡回する UI を足すだけ。
  しきい値でまとめて消す操作は `capture('point.delete-below-score')` を通せば、編集ログは差分で自動的に数える。
- **3. 系列の統合・分割・重複点の統合**: 点を別の `Dataset` へ移すとき `origin` / `score` ごと移せば、編集ログの split/merged/reassigned
  がそのまま正しく出る。重複点の統合は「1 点を残して他を削除」と数えられる(必要ならイベント名で区別)。
- **5. 画素座標と図の情報の書き出し**: 編集ログの `final` が画素座標・値・軸目盛を既に含む。描画領域・凡例の矩形、マーカーの形は
  取り込み形式 v1 に任意フィールドとして足す(未知フィールドは無視する約束なので v1 のまま拡張できる)。
- **6. 差分の重ね表示**: `ReviewSession` が初期状態を持っているので、それを半透明で描く層を足せばよい。

## 対象外

- 取り込み時の `points_value` と `points_px` の照合
- 軸が画像の縦横に平行でない場合の目盛の 2 次元指定(v1 は 1 次元の `px` のみ)
- 複数の軸セット(取り込みは軸セット 1 つ)
