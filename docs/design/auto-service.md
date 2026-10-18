# 設計: サーバー側の自動機能（Auto-place・Server Extraction）と出し分け

Starrydata2 v4 の進捗ボードの P1（軸の Auto-place）、P2（Server Extraction）、P3（Extract 1 回 = 1 手順）、
P5（全自動機能の出し分け）。目標は「自動校正・自動抽出の backend（wpd-auto backend、starryai 上）に
接続できる環境の人は、wpd-auto と同じ機能を starry-digitizer で使える」こと。

**仕様の出どころ**: wpd-auto の文書と backend（MIT）の API（`backend/README.md` の「API」節）だけ。
WebPlotDigitizer / wpd-auto の frontend（AGPL-3.0）のコードは読んでいないし、持ち込んでいない。
starry-digitizer と wpd-auto をつなぐのは HTTP と JSON の形だけ。

## 1. 境界: `AutoService`

```ts
interface AutoService {
  capabilities(): Promise<readonly string[]>          // 出してよい機能
  calibrate(image: Blob): Promise<unknown>             // POST /calibrate の応答本文そのまま
  extract(image: Blob, req: ExtractionRequest): Promise<unknown> // POST /extract の応答本文そのまま
}
```

- `calibrate` / `extract` は **wpd-auto backend の応答本文をそのまま**返す（wire 形式）。検査と座標の変換は
  starry-digitizer 側（`autoServiceWire.ts`）でやる。だからホストが自前の経路（v4 backend の非同期ジョブなど）で
  中継するときも、本文を素通しするだけで実装できる。
- 既定の実装は `createHttpAutoService({ baseUrl, ... })`（`httpAutoService.ts`）。
  - `POST {baseUrl}/calibrate`、`POST {baseUrl}/extract?method=…&area=x0,y0,x1,y1&threshold=…`（wpd-auto の `/api/v1/…` と同じ形）。
    本文は画像のバイト列そのもの（multipart にしない。backend がそう決めている）。
  - `GET {capabilitiesUrl}`（既定 `{baseUrl}/capabilities`）→ `{ "features": [...] }`。
  - `features` を渡すと capabilities を問い合わせない（ホストがすでに答えを持っているとき）。
  - `headers`（CSRF トークンなど）、`credentials`（既定 `same-origin`）、タイムアウト（capabilities 3 秒、推論 120 秒）。
- **接続先は starry-digitizer にハードコードしない。** ホストが `<StarryDigitizer :auto-service="…">` で渡すか、
  パネルを自分で並べるホストは `configureAutoService(ctx, …)` を呼ぶ。スタンドアロンのアプリは
  ビルド時の `VITE_AUTO_SERVICE_URL` があるときだけ使う（公開ビルドは何も設定しない = 機能なし）。

### 機能の名前

`auto_axis`（軸の Auto-place）、`markernet`、`lineformer`。v4 の設計メモ
（Starrydata2 `docs/starrydata3/auto-features-gating.md` §3.1）の `{"features": [...]}` と同じ名前。知らない名前は無視する。

## 2. 出し分け（P5）

- **判定はサーバー側。** starry-digitizer は capabilities の答えに載った機能だけを出す。IP・ホスト名・
  `window.location` で判定することはしない。
- 既定は「出さない」。サービスが未設定、届かない、401 / 403 / 404 / 5xx、タイムアウト、形が違う答え——
  どれも **機能を出さない。エラーも出さない**（`refreshAutoFeatures()` は reject しない）。
  外部の利用者には最初から無い機能として見える。
- https のページから http のサービスは呼べない（mixed content）。そのときは問い合わせ自体をせず、
  コンソールに一度だけ警告して機能を隠す。
- 例外: 利用者が**ボタンを押した**操作（Auto-place、Extract）の失敗は、`error` イベントとパネルの文で知らせる
  （コード `AUTO_SERVICE_FAILED`）。夜間に LineFormer が止まっているときの 503 などがこれに当たる。
- capabilities は「UI に出すか」のためだけのもの。**推論の要求そのものも backend 側で同じ判定をすること**
  （UI を通らずに直接叩かれるため）。

## 3. 軸の Auto-place（P1）

1. `requestAutoCalibration(ctx)` → `calibrate(画像)` → 応答を**提案**として持つ（`ctx.autoFeatures.proposal`）。
   この時点では軸は変わらない。キャンバスに目盛り候補（枠の点線、各目盛りの位置と値）を重ねて描く。
2. パネルに軸ごとの状態（ok / failed と理由）、線形 / log、目盛りの値、信頼度（0.5 未満は警告）を出す。
3. 人が **Apply** を押すと `applyAutoCalibration(ctx)`:
   - 使える軸（`ok`・scale あり・値が 2 種類以上・log なら全部正）だけ、最小二乗の直線
     （`axisTickFitter.fitAxisTicks`、取り込み形式と同じ）の上で、最小と最大の目盛りの値の位置に x1/x2（y1/y2）を置く。
     x の点は枠の下辺（x 軸の線）、y の点は枠の左辺（`y_side: right` なら右辺）の上。
   - 4 点モードにする。軸セットに描画領域（plot area）がまだ無ければ枠を入れる（Server Extraction の範囲になる）。
   - **1 回の Apply が 1 手順**（`axis.auto-place`）。Undo で Apply の前に戻る。
   - 置いた点は普通の軸の点なので、ドラッグ・矢印キー・値の入力で直せる。値は校正から出るので、直せば全点の値が変わる。
4. **Discard** で提案を捨てる。新しい画像を開いたときも捨てる。

`partial`（片方の軸だけ）は、使える軸だけ置く。もう片方は人が置く。

## 4. Server Extraction（P2）

- `runServerExtraction(ctx, { method, params })` → `extract(画像, { method, area, params })`。
  `area` は軸セットの plot area（Auto-place が入れる）、無ければ画像全体。
- **返るのは画素座標だけ**。値は starry-digitizer の軸の校正で出す（軸を後で直せば値も変わる。校正前に抽出してもよい）。
- 系列ごとに**下書きのデータセット**を 1 つ作る。名前は凡例が読めた系列はその文字列、無ければ method のラベル、
  どちらも `(markernet)` のように方法を付ける。今のデータセットが空なら最初の系列はそこに入れる。
- MarkerNet の点ごとのスコア（`point_scores`）は点の `score` に入る。**Review Points**（信頼度のレビュー、
  `N` / `Shift+N` でスコアの低い順に 1 点ずつ、しきい値でまとめて外す・戻す）がそのまま効く。
  LineFormer にはスコアが無いので、レビューの対象にならない。
- 方法ごとの引数: MarkerNet は `threshold`（既定 0.4）、LineFormer は `threshold`（0.3）と `interval`（px、10）。
  backend の既定と同じ値を UI の初期値にしている。
  さらに MarkerNet の `series_threshold`（系列に分ける距離、0.05–5、既定 0.5）と `legend`（凡例から系列名、既定 1）、
  LineFormer の `loops`（線を曲線に沿って追い、ヒステリシスの両枝を取る、既定 0）を画面に出す。この 3 つは
  **backend の既定と違うときだけ**送る（触らなければ以前と同じ要求になる）。意味と型は backend（MIT）の
  `extract/markernet.py`・`extract/lineformer.py` の `Param` から。
- **再抽出は下書きを置き換える。** 同じ方法・同じ軸セットで作られ、作られてから誰も触っていない下書きは、
  次の Extract で中身が入れ替わる（順に再利用し、系列が減ったら余りは消す）。点を動かした・足した・消した、
  名前を変えた、低スコアをまとめて外した下書きは残し、新しい下書きは `… (markernet) 2` のように番号を付ける。
  「触っていない」は操作の数ではなく**中身の比較**で決める（Extract が作った状態を覚えておき、今と同じか）。
  だから Undo / Redo で戻った下書きも、また置き換えの対象になる。覚えはコンテキストごとの表示状態で、
  保存しない。ファイルから開いた下書きは「触った」扱いで残る（安全側）。置き換えも含めて Extract 1 回 = 1 手順。
- **画像が替わったら応答を捨てる。** Extract / Auto-place の実行中に画像が差し替わると、パネルが
  `AbortController` で要求を中断し（`calibrate(image, { signal })` / `extract(image, req, { signal })`）、
  遅れて来た応答は新しい画像に適用しない（中断を無視するホストの実装でも、操作の側で画像を比べて捨てる）。
  エラーイベントは出さず、パネルに「Cancelled: the image changed.」とだけ出す。
- ライセンスの表示: LineFormer を選ぶと backend README が求める一文、MarkerNet を選ぶと重みが非商用である旨を出す。

## 5. Undo/Redo（P3）

- Extract 1 回 = 1 手順（`extract.server`）。系列がいくつあっても、Undo 1 回で下書きが全部消えて元に戻る。
- 既存の Run（`extract.auto`）・Apply（`axis.auto-place`）・信頼度のまとめて外す / 戻すも、それぞれ 1 手順。
- `HistoryManager.capture(action)` に名前を付けられるようにした（`HistoryChange.action`）。
  名前は自動抽出レビューの編集ログ（`events`）にも出る。省略時は `'edit'`。

## 6. 座標の約束

starry-digitizer は「左上の画素の左上の角が原点、画素 (i, j) の中心は (i + 0.5, j + 0.5)」。
wpd-auto backend は配列の添字（画素の中心が整数）で、upscale の写像 `元 = (拡大後 + 0.5) / s − 0.5` もその約束で書かれている。
そこで `autoServiceWire.ts` で、**受け取る座標に +0.5、送る area に −0.5** する（`BACKEND_PIXEL_OFFSET`）。
backend の座標の約束はコードの式から読み取ったもので、backend の文書には明記されていない（**要確認**）。
違っていれば定数 1 つを 0 にすればよい。

## 7. v4（Starrydata2）側でやること

### 接続先の渡し方

v4 の SPA は `<StarryDigitizer>` に `autoService` を渡す。starryai は http で NIMS 内からしか届かないので、
https の v4 から直接は呼べない。

**決定（2026-10-17、ボード D7）: v4 backend が中継する。** v4 の API に NIMS 内限定の中継口を作り、そこから
http の starryai を呼ぶ。starry-digitizer にはその中継口（同一オリジンの https）を `baseUrl` として渡し、
capabilities も中継口経由（既定の `{baseUrl}/capabilities`）で取る。starry-digitizer 側の追加の変更は要らない:

```ts
// (b) 同期に見える中継（v4 backend が starryai に転送して本文を返す）
<StarryDigitizer :auto-service="{ baseUrl: '/api/v4/digitizer-auto', headers: () => ({ 'X-CSRFToken': csrf() }) }" />
```

中継が**非同期ジョブ**（202 + 進捗ポーリング。v4 の `api_v1/services/jobs.py`）になる場合は、
`AutoService` をホストで実装して渡す。応答本文を素通しするだけでよい:

```ts
const service: AutoService = {
  capabilities: () => api.get('/api/v4/capabilities').then((r) => r.features),
  calibrate: (image) => runJob('calibrate', image),            // 結果の本文をそのまま resolve
  extract: (image, req) => runJob('extract', image, req),       // req.method / req.area / req.params をクエリに
}
<StarryDigitizer :auto-service="service" />
```

(a) starryai を https 化して直接呼ぶなら `baseUrl: 'https://starryai…/wpd-auto/api/v1'`、
`capabilitiesUrl: '/api/v4/capabilities'`（判定は v4 backend）にする。starryai 側に CORS が要る。

どの案でも starry-digitizer 側の変更は要らない（渡すものが変わるだけ）。

### `/capabilities` の置き場

- D7 の決定により、中継口の `{baseUrl}/capabilities` に置くのが既定（`capabilitiesUrl` を省略できる）。
  v4 の設計メモの `GET /api/v4/capabilities` に置く場合は `capabilitiesUrl` で渡す。接続元が NIMS 内なら
  `{"features": ["auto_axis", "markernet", "lineformer"]}`、それ以外は `{"features": []}`（常に 200）。
- starry-digitizer にはその URL を `capabilitiesUrl` で渡すか、v4 の SPA が自分で問い合わせて
  `features: [...]` で渡す（どちらでもよい。後者なら starry-digitizer は capabilities を取りに行かない）。
- wpd-auto backend 側にも `/capabilities` を足す案（ボード P6）がある。中継を使わず backend を直接見る構成ならそれを
  `capabilitiesUrl` にする。
- 推論の中継（またはwpd-auto backend）でも同じ判定をもう一度すること。

## 8. 揃っていないもの（wpd-auto と比べて）

- 研究用の記録（作業のサーバー保存、`/api/v1/collect/…`）: starry-digitizer は保存も送信もしない。
  代わりに**既定オフのフック**として編集のイベントをホストに渡す（§9、ボード P4）。保存するかはホストが決める。
- 利用者の名前の選択・サーバー上の過去の作業の一覧: 対象外（v4 は自前のログインとプロジェクトを持つ）。
- サポート時間（`auto.available` / `next_change`）の案内: 未実装。時間外の失敗は backend のエラー文をそのまま出す。
- `GET /extract/methods` による方法ごとの稼働状況（LineFormer が止まっている等）: 使っていない。
  出し分けは capabilities だけで、止まっているときは Extract の失敗として知らせる。
- 拡大の記録（`upscale`）・エンジンの版の表示: 出していない。

## 9. 研究用の記録: ホストへのフック（P4）

wpd-auto の「作業をサーバーに保存する」（`/api/v1/collect/…`）に当たるもの。ただし **starry-digitizer は
どこにも送らない**。ホストがコールバックを渡したときだけ、編集のイベントをそのコールバックに渡す。
渡さなければイベントは作られもしない（既定オフ）。保存するか、どこに置くか、利用者の同意をどう取るかはホストが決める。

### 渡し方

```ts
// <StarryDigitizer> の prop（`@research-event="…"` とも書ける）
<StarryDigitizer :on-research-event="(e) => queue.push(e)" />

// パネルを自分で並べるホスト（core）
import { configureResearchEvents } from 'starry-digitizer/core'
configureResearchEvents(ctx, (e) => queue.push(e))   // null で止める
```

- コールバックは操作の直後に**同期で**呼ばれる。中で digitizer の状態を変えないこと（記録して戻る。送信はホスト側の
  非同期処理で）。コールバックが例外を投げても `console.error` に出すだけで、編集は止めない。
- 渡されるのは凍結した複製（`Object.freeze`）。後から中身が変わることはない。
- `<StarryDigitizer>` は、prop を渡していたときだけ、アンマウント時にコールバックを外す。prop を渡さなければ
  共有の context（`context` prop）にホストが自分で付けたコールバックには触らない（`autoService` と同じ約束）。

### イベントの形（`ResearchEvent`、`src/application/services/researchEvents/researchEvents.ts`）

全イベント共通:

| フィールド | 型 | 意味 |
|---|---|---|
| `format` | `'starry-digitizer/research-event'` | |
| `version` | `1` | 形を変えたら上げる |
| `seq` | number | 1, 2, 3, …（digitizer のインスタンスごと） |
| `at` | string | ISO 8601（UTC） |
| `review_t_ms` | number \| null | 自動抽出のレビュー開始（取り込み）からの ms。編集ログの `events[].t_ms` と同じ時計。レビュー外は null |
| `type` | 下表 | |

| `type` | 追加のフィールド | いつ |
|---|---|---|
| `edit` | `action: string` | 取り消せる編集 1 回（`HistoryManager.capture(action)` 1 回）。`point.add` / `point.move` / `point.delete` / `axis.move` / `axis.auto-place`（Apply）/ `extract.server` / `extract.auto` / `points.remove-below-score` / `points.restore-score-removed` / `dataset.*` など。名前が無ければ `edit` |
| `undo` / `redo` | なし | Undo / Redo |
| `review.start` | `series`, `points`, `warnings`（すべて個数） | 自動抽出の結果を取り込んでレビューを始めた |
| `review.step` | `direction: 1 \| -1`, `found: boolean`, `score: number \| null`, `threshold: number` | Review Points で次 / 前の低信頼度の点へ移った（`N` / `Shift+N`） |
| `review.export` | `elapsed_ms`, `summary`（編集ログの `summary` そのまま） | 編集ログを作った（書き出した） |
| `review.end` | なし | レビューを終えた |

`edit` の流れは自動抽出の編集ログ（`events`）と同じ `HistoryManager` の通知から作っている。違いは、編集ログは
レビュー中だけ記録するのに対し、こちらはレビューの外の手作業の編集も流すこと。

### 載せないもの

**画像（データ・URL）、点や軸の座標と値、データセット名・系列名（利用者が打った試料名でありうる）、取り込んだ
文書の `source`、利用者やホストの識別子は載せない。** 載るのは操作の名前・個数・スコア・時刻だけ。
`review.export` も `summary`（個数）だけで、座標を含む `details` と `final` は載せない。

- 新しいイベントで何かを足すときは `researchEvents.ts` の型を変えることになる。その変更のレビューで線を守る。
- テスト（`researchEventOperations.test.ts`）で、試料名・`source`・データ URL・座標を含む文書を取り込んで
  編集しても、それらがイベントに一つも出ないことを確かめている。
- 時刻と操作の並びそのものは利用者の作業の記録である。保存するなら、利用者への説明と同意はホスト側の責任。
