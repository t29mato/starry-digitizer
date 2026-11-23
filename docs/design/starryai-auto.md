# starry-digitizer に wpd-auto の自動機能を入れ、starryai に置く（設計書の下書き）

- 版: **0.0.7**（2026-11-23。合意までは 0.x.y で上げる）
- 書いた人: Claude Code（間藤の依頼）。材料に wpd-auto のセッションの下書き
  `~/research/drafts/starryai-hosting-from-wpd-auto-session.md` を使った。
- 置き場所: starry-digitizer の `docs/design/starryai-auto.md`（ブランチ `feat/starryai-hosting`、`origin/v4` から分けた）。
  0.0.1 は `~/research/drafts/starry-digitizer-auto-design.md` に置いた。
- 2026-11-23、間藤が 0.0.1 を見て「これで進めて」とした。§10 の問いは、推した案を採り、推していない問いは §10 の「仮決め」にした。

## 0. この文書の読み方

### 0.1 確かめ方の区別

- この版で書いたことは、**すべてソースと文書を読んだだけ**である。どれも動かしていない（ビルド・テスト・API 呼び出し・ブラウザでの確認はしていない）。
- 読んだ内容に推測を足した所には「（推測）」、読んでも分からなかった所には「（未確認）」を付ける。

### 0.2 読んだ版

| リポジトリ | ref | 中身 |
|---|---|---|
| wpd-auto | `origin/main` = `main` = b43231e（2026-11-20、PR #75、VERSION 0.3.0） | `git fetch` は認証がなく失敗した。手元の origin/main が最新とは限らない（未確認）。`mac/main`（985021f、2026-10-20）はこれより 19 コミット古い |
| wpd-auto | `feature/paper-pdf-intake` = 67f5185（2026-10-23） | ローカルと `mac/` にだけある（`origin/` にはない）。分岐元は古い 985021f |
| starry-digitizer | `main` = ccd2de9（package.json 1.14.0、Vuetify あり） | 公開中のもの |
| starry-digitizer | `origin/feat/auto-digitize` = 78ebbf0（2026-10-18、package.json 2.0.0） | main より 100 コミット先（0 コミット後ろ）。`origin/v4`（1300af2）はこれに docs の PR #316 を足しただけ |

**依頼文との違い（確かめた）**

- starry-digitizer の公開先は GitHub Pages ではなく **Vercel**（`.github/workflows/vercel-{preview-development,develop-deployment,production-deployment}.yaml`）。
- starry-digitizer の自動機能は、main にはまだない。`feat/auto-digitize`（= v4 系）には、`AutoService`・Auto-place・MarkerNet/LineFormer の抽出・Auto digitize・研究用イベントのフックと、設計書 `docs/design/auto-service.md` がおおむね揃っている。
  そこでこの文書は **`feat/auto-digitize` と `auto-service.md` からの差分** として書く。

### 0.3 ライセンスの線引き（auto-service.md から引き継ぐ）

- wpd-auto の画面（`frontend/`）は WebPlotDigitizer のフォークで **AGPL-3.0**。starry-digitizer は **MIT**。
- そのため、wpd-auto の画面のコードは starry-digitizer に**持ち込まない**。
- 仕様の出どころにしてよいのは次の 3 つだけ。
  - HTTP と JSON の形
  - backend（MIT）の README・文書
  - 画面の挙動（何をするか）
- この文書の §2 で wpd-auto の画面の挙動を書いたのは、挙動を揃えるための参照である。実装は starry-digitizer の層の作りに合わせて書き直す。

## 1. 目的と、決まっていること

### 1.1 目的

starry-digitizer でも wpd-auto と同じ自動機能（軸の自動校正・自動抽出・凡例の読み取り など）を使えるようにする。

- 2 つの画面の使われ方を、同じバックエンドと同じ管理画面で比べられるようにする。
- 研究用の記録を、1 か所に集める。

### 1.2 決まっていること（2026-11-23、間藤が決めた）

1. starry-digitizer に wpd-auto の **auto の部分の機能を全部** 入れる。
2. starry-digitizer も **wpd-auto と同じ形で starryai に置く**。GitHub Pages や Vercel から NIMS のサーバーを呼ぶ形にはしない。
3. **バックエンドは wpd-auto のものを共通で使う。** 管理画面（`/api/v1/admin`）もバックエンドの中に置いたまま分けない。
   2 つの画面（wpd-auto と starry-digitizer）が同じバックエンドを呼ぶ。
4. 記録（collect）に、どちらの画面から来たかを表す値 **`client: wpd-auto | starry-digitizer`** を持たせる。管理画面ではこれで絞り込めるようにする。
5. 重みはサーバー側だけに置き、画面に入れて配らない。
   - MarkerNet: NC
   - BarNet・BarRulerNet: CC BY-NC-SA 4.0
   - LineFormer: 公開されたライセンスがない

### 1.3 そこから出てくる前提

- **同じオリジンに置く**
  - starryai の nginx が両方の画面と API を配る。だから CORS は要らない。
  - starry-digitizer の `auto-service.md` §7 にある D7（v4 backend が https の中継口を作る案）は、v4 に埋め込む場合の話として残す。starryai 版では使わない。
- **Vercel の公開版はそのまま残す**
  - これまでどおり `VITE_AUTO_SERVICE_URL` を設定しない。
  - よって公開版には自動機能が出ない（`App.vue:339-342` を読んで確かめた）。
- **ライブラリとしての starry-digitizer**（`<StarryDigitizer>`・core）は、これまでどおり自分からはどこにも送らない。
  - 記録を送るのは、starryai 版のアプリ（`App.vue` を入口にするスタンドアロンのビルド）が、ホストとして受けたフックだけ。

## 2. 機能の一覧と、starry-digitizer での置き場所

### 2.1 wpd-auto の auto の機能 → starry-digitizer

表の「SD 今」は、`feat/auto-digitize` にあるかどうか（ソースを読んで確かめた）。
starry-digitizer での置き場所は、`application/services/autoService/*`（操作は `*Operations.ts`）、`presentation/components/Auto/*`、`Review/*` を基本にする。

| # | wpd-auto の機能（画面の挙動） | 呼ぶ API | SD 今 | starry-digitizer での置き場所・やること |
|---|---|---|---|---|
| F1 | Auto-place（X-Y の軸）。X1/X2/Y1/Y2 を置き、確度の低い軸は警告する | `POST /calibrate` | ある（`autoCalibrationOperations.ts`、提案 → Apply、Undo 1 段 `axis.auto-place`） | そのまま。記録 `calibration.auto` を足す（§3） |
| F2 | Auto-place（Bar 軸、BarRulerNet）。値の軸 P1/P2 と Bar0, Bar1… のラベル | `POST /calibrate?plot=bar` | ない | `autoServiceWire.ts` に `plot` を足す。starry-digitizer の `AxisSet` には Bar 軸の型がない。だから 2 つの案がある: X を項目番号（0,1,2…）にした X-Y 軸で表すか、`domain/models/axisSet` に種類を足すか（§10 Q7） |
| F3 | Server Extraction: MarkerNet・LineFormer | `POST /extract?method=…&area=…&<引数>` | ある（`serverExtractionOperations.ts`、系列ごとに下書きのデータセット、Undo 1 段 `extract.server`） | そのまま |
| F4 | Server Extraction: BarNet（縦棒、オプトイン） | `POST /extract?method=barnet` | ない | method を足す。答えは `series[].points`（画素の点）と同じ形（backend README で確かめた範囲）。Bar 軸（F2）と組で出す |
| F5 | 方法の一覧と稼働状況。使えない方法は理由付きで出す。引数の既定値と範囲もここから取る | `GET /extract/methods` | 使っていない（引数は画面にハードコード、方法は capabilities で出し分け） | 使う。`available:false` は理由を添えて選べなくする。`license`・`attribution` をそのまま注意書きに出す（今は `ServerExtractionPanel.vue:143-146` に固定の文） |
| F6 | Auto digitize（ボタン 1 つ）。Lines / Markers / Bars を選ぶ → 校正 → 抽出。Start over の確認あり。Undo 1 段 | calibrate → extract/methods → extract | Lines・Markers だけ（`autoDigitizeOperations.ts`、`auto.digitize`） | Bars を足す（Bar のとき X も数値で 4 点揃えば X-Y、だめなら Bar 軸。wpd-auto と同じ判定）。結果の後で「別の方法でやり直す」（wpd-auto の Use lines/markers instead）を足す |
| F7 | 自動機能のサポート時間（9:00–17:00 JST）。時間外も断らず、失敗したときに案内を足す。時間外に Lines を選ぶと MarkerNet で走る | `GET /auto/status`（`/extract/methods` と `/healthz` の `auto` も同じ値） | ない | `autoService` に状態を持たせる。読み込み時、5 分ごと、`next_change` のすぐ後、タブに戻ったときに読む。ブラウザの時計は使わない。フッターに常に文を出す（§5） |
| F8 | 再起動中のやり直し。502/503/504 と接続失敗は、合わせて約 30 秒、間隔を倍にしてやり直す。`busy` は Retry-After を見る | — | ない（失敗は `AUTO_SERVICE_FAILED` を出すだけ） | `httpAutoService.ts` に足す |
| F9 | 凡例の読み取り（VLM）。各実行の後に自動で呼ぶ。確度 0.5 以上で名前を付け「auto」の印を出す。0.3–0.5 は「?」付きの候補。並び順を凡例に合わせる | `POST /legend`（JSON、画像は base64） | ない | 抽出の後、下書きのデータセット名の候補として出す。`application/services/autoService` に `legend()` を足す。名前の確定は Undo 1 段 |
| F10 | 候補の見直し。抽出結果を「候補」として描き、チェックして足すか捨てる。軸の枠の外の小さな系列は最初からチェックを外す | なし | 別の方式（下書きのデータセット + Review Points + reviewSession） | **方式を揃えるかが未決**（§10 Q6）。揃えない場合も、記録の型は対応が付くようにする（§3.4） |
| F11 | 点の確度の見直し。`point_scores` の低い点を順に回る。K で残す、X で消す、N/P で移る | なし | ある（`confidenceReview`、既定のしきい値 0.5。wpd-auto は 0.6） | そのまま。しきい値の既定を揃えるか（§10 Q10） |
| F12 | Start over。この画像の軸・データ・候補をまとめて消す（Undo 1 段） | なし | 未確認（それらしい操作は見つけていない） | なければ足す |
| F13 | Set up series（色ごとにデータセットを作る）・Trace Curve・Resample | なし（ブラウザの中だけ） | Trace Curve と Resample はある（`curveTrace`・#312）。Set up series はない（推測） | 自動「サーバー」機能ではない。今回の範囲に入れるかを決める（§10 Q11） |
| F14 | 部品の版の表示（About の折りたたみ） | `GET /components` | ない | About（またはヘルプ）に小さく出す。保存はしない |
| F15 | 研究用の記録（画像・校正・抽出・候補・エクスポートの事実・操作ログ・project） | `/collect/*` | 送らない（ホストへのフック `researchEvents` だけ） | **送る**。§3 |
| F16 | 名前の選択（`X-WPD-User`、ログインではない）と My work / My SIDs（自分の作業を開き直す） | `/collect/users`・`/collect/works*` | ない | §10 Q5。名前の選択は記録に効くので、F15 と一緒に決める |
| F17 | 新しい版が出たら Reload を勧める。その前に作業をサーバーに保存する | 静的な `VERSION.txt` | ない（PWA の更新はある） | §4.4 の PWA の扱いと一緒に決める |
| F18 | SID / Fig. の欄（Starrydata の論文 ID と図の番号） | 記録の `starrydata.ref` | 未確認 | F15 と同じ時期に入れる |
| F19 | 論文の PDF から図を選ぶ | `/papers/*`（`feature/paper-pdf-intake`、`WPD_AUTO_PAPERS=1` のときだけ） | ない | 範囲の外にする（推す）。wpd-auto 側でも画面がまだない（`paperIntake.js` の見出しに「No screen calls this yet」） |
| F20 | 多パネルの校正（`frames[]` からパネルを選ぶ） | `/calibrate` の `frames[]` | ない（`frames[0]` だけ使う） | wpd-auto でも main には入っていない（`feature/multi-panel-calibration`）。範囲の外にする |

### 2.2 移す順番（提案）

starryai に置く版を starry-digitizer 側で **`starryai-0.1.0`** のように分けて数えるかは、§10 Q9 で決める。
下の 0.x は、その版の数え方での順番の案である。

| 段 | 中身 | 理由 |
|---|---|---|
| 0.1 | §4 の starryai への置き方（ステージングだけ）＋ F1・F3・F6（今あるもの）＋ F5・F7・F8 | 今ある機能がそのまま動くことを先に確かめる。capabilities の問題（§3.3）もここで片付ける |
| 0.2 | **backend の `client`**（§3.2）＋ F15（記録）＋ F16 の名前の選択（決めた場合）＋ 知らせの文（§5） | 記録は、本番に出す前に必要（本番で使う分の記録が欠ける） |
| 0.3 | 本番に出す。F9（凡例）・F12（Start over）・F14（components）・F17 | |
| 0.4 | F2・F4（Bar 軸と BarNet）、F6 に Bars を足す | 軸のモデルに手を入れるので最後にする |
| 0.5 | F10（候補の方式を揃えるなら）・F16 の My work・F18 | Q5・Q6 の決め方しだい |
| 外 | F19（論文 PDF）・F20（多パネル） | wpd-auto 側で main に入ってから |

### 2.3 進み具合（0.0.3 の時点）

ブランチ `feat/starryai-hosting`（ローカルだけ。push していない）。

| 段 | 中身 | 状態 | 確かめ方 |
|---|---|---|---|
| 0.1 | F8 再試行 | 済み（b475e82） | Jest（モックの fetch） |
| 0.1 | F5・F7 `/extract/methods`・`/auto/status`、時間外の案内、読み直し（`watchAutoStatus`） | 済み（2c50932） | Jest（部品の表示も）。本物の backend には未接続 |
| 0.1 | starryai 向けのビルド（§4.3・§4.4） | 済み（e731f6f） | ビルドして中身を見た（base・API の URL・tesseract の資産・SW と Google tag がないこと） |
| 0.1 | `deploy/deploy.sh`・nginx のひな形（§4.2、案 D2） | 済み（fde3156） | この VM の一時ディレクトリに staging → production @staging → 古いリリースの削除まで流した。nginx は通していない |
| 0.1 | capabilities（C1、wpd-auto 側） | 済み。wpd-auto のローカルのブランチ `feat/client-capabilities`（f37c630・393f5f5・e6cc862、push していない） | 下の「つないで確かめたこと」 |
| 0.2 | `client`（wpd-auto 側：`X-WPD-App` → 記録の `client`、管理画面の `?client=`）と nginx の `include` | 済み（同じブランチ） | 同上（nginx は未確認） |
| 0.2 | starryai 版が `X-WPD-App: starry-digitizer` を付ける | 済み（2c54247） | 同上 |
| 0.1 | starryai に実際に置く | まだ | starryai に入れるのは間藤の確認の後 |
| 0.2 | 記録を送る（§3.4）・知らせ（§5.2）・名前の選択 | 未着手 | — |
| 0.3 | F9 凡例の読み取り | 済み。ブランチ `feat/legend-reader`（ローカルだけ。push していない） | Jest。本物の backend（下の「F9 凡例の読み取り」） |

**つないで確かめたこと（2026-11-23、この VM の中）**

wpd-auto の `feat/client-capabilities` の backend を、この VM の中で `127.0.0.1:24860` で動かした。
- 設定: 時間 09:00-17:00 Asia/Tokyo、収集は一時ディレクトリ、重みなし、LineFormer なし。
- starryai 版のビルド（2c54247）は、小さな中継で同じオリジンにして `127.0.0.1:24001/starry-digitizer/` で配った。中継は nginx の代わりで、`/wpd-auto/api/` を backend に渡す。
- 呼び出しは curl で行った。**ブラウザでの確認はまだ**。

| 確かめたこと | 結果 |
|---|---|
| `GET /capabilities` | `{"features":["auto_axis"]}`（重みがないので MarkerNet は載らない。LineFormer は not_configured） |
| `GET /extract/methods` | markernet `weights_missing`、lineformer `not_configured`、`auto.available:false`（17 時台で時間外） |
| `POST /calibrate`（`sample_graph_curve.png`、時間外） | 200、約 2.3 秒。x・y とも ok（目盛り 5・6） |
| `X-WPD-App: other` | 400 `invalid_params` |
| 記録 `server.calibrate` の `client` | ヘッダー `starry-digitizer` → `starry-digitizer`、ヘッダーなし → `wpd-auto` |
| 管理画面 `?since=all`／`&client=starry-digitizer`／`&client=wpd-auto`／`&client=x` | Sessions 4／3／1、`x` は 400 |

wpd-auto のセッションの報告（読んだだけ）:
- backend の単体テストは 898 通り、1 つ落ちる。落ちるのは `test_no_tracked_file_names_the_host` で、main でも落ちる。
- 画面の node テストで落ちる 20 件は、変更前と同じ。
- capabilities は calibrate のエンジンと各方法の check() から作る。LineFormer の確認は 5 秒キャッシュ、最長 1 秒。
- 収集が無効のとき、wpd-auto の画面はヘッダーを付けない（「なし = wpd-auto」に頼る）。

**残り・決めること**
- Bar の Auto-place（BarRulerNet）の capabilities の名前は、まだ入れていない。0.4 の段（Bar 軸）で決める。仮の名前は `auto_axis_bar`。
- P1（project を ProjectDTO で受ける）について、wpd-auto のセッションの見立て（推測を含む）:
  - 無理はない。
  - ただし、wpd.json の形を前提にした所が 3 つある。`collect.work_summary`、`admin_stats._work_counts`・`_points_table`、`admin_points.index`。
  - ProjectDTO から axes・datasets・points を数える summary が別に要る。
  - 下書きと凡例を同じ数字で比べるなら、ProjectDTO の側に同じ意味の印（どの抽出から来たか、人が触ったか）が要る。
  - works に `format` を持たせ、My work の一覧は wpd のものだけにするのが安全。
- starryai の実際の `WPD_AUTO_AUTO_TIMEZONE` は、まだ分からない。所内から `/wpd-auto/healthz` の `auto.timezone` を見れば分かる。

作業中に決めたこと（間藤が変えられる）:

- **starryai 版のビルドは Google tag を読まない**（`STARRY_DIGITIZER_ANALYTICS=off`）。所内の研究用の道具から Google に何も送らないため。
  Sentry は `main.ts` が `production` のときに `process.env.VUE_APP_SENTRY_DSN` で初期化する。starryai 版では DSN を渡さないので送らない（推測。動かして確かめていない）。
- OCR の言語データは、CDN の既定と同じもの（`@tesseract.js-data/eng` 1.0.0 の `4.0.0_best_int`、MIT）を devDependency に足して配る。
  リポジトリの直下の `eng.traineddata` は由来が分からないので使わない。
- nginx は、wpd-auto の server ブロックに `include` する location のひな形にした。**wpd-auto 側のひな形に `include` の 1 行を足す必要がある**（wpd-auto のセッションに伝える）。
- リリースのディレクトリ名は `<commit>-<build>`（同じコミットを作り直しても前のものを壊さない）。

**F9 凡例の読み取り（2026-11-23、ブランチ `feat/legend-reader`）**

backend の形は wpd-auto `feat/client-capabilities` の `backend/README.md`・`app.py`・`legend_pass.py`・取り込んだ `legend_reader.py`（MIT）から読んだ。wpd-auto の frontend は読んでいない。

- 境界: `AutoService` に省略できる `legend?(body, options)` を足した。ホストが実装したサービスはそのまま動く。無ければ凡例は読まない。
  - `httpAutoService` は `POST {baseUrl}/legend` に JSON を送る。20 秒で諦める（`legendTimeoutMs`）。やり直しはしない。
- 送るもの: `{"image": base64, "series": [{id: "s0"…, kind, shape?, points}]}`。
  - `kind` は MarkerNet なら `marker`、LineFormer なら `line`。
  - `shape` は MarkerNet の `label`（`circle` など）が短い英字の語のときだけ付ける。`line 1` のような値を送ると、要求全体が 400 になる（本物の backend で確かめた）。
  - 点は `toBackendPx`（0.5px 引く）で送る。
  - 上限（系列 100、1 系列 2 万点、全体 20 万点）を超える分は、系列を切り、点を等間隔に間引く。断られないため。
- 答えの使い方（backend の規則と同じ）:
  - `legend.source` が `vlm` で確度 0.5 以上: 下書きの名前を `<凡例の文字> (<method>)` にし、「auto」の印を出す。
  - 0.3〜0.5: 名前は変えない。結果の欄に「"<今の名前>": <文字>?」と「Use this name」を出す。押すと名前を付ける（Undo 1 段 `extract.legend.accept`）。
  - それ未満、または `vlm` 以外: 何もしない。
  - 下書きを `draft_order` の順に並べ直す。動かすのはこの抽出の下書きだけで、今いる場所の中で入れ替える。
- 呼ぶ時: Server Extraction と Auto digitize の後に、待たずに呼ぶ。抽出の結果はすぐ出る。
  - 1 度に 1 つ。新しい抽出が始まると、前の問い合わせは取り消す。画像が替わったら答えを捨てる。
  - MarkerNet で「Name series from the legend」を外したときは呼ばない。
- Undo: 名前・凡例の記録・並び順をまとめて 1 段（`extract.legend`）。抽出（`extract.server`／`auto.digitize`）とは別の段。
  - なので Auto digitize の後で凡例が名前を付けると、実行前に戻すには Undo が 2 回要る。結果の欄にそう書く。
- 人が変えた名前は上書きしない。問い合わせたときの名前と、答えが来たときの名前が違えば、その下書きは残す（「Kept N names you changed.」）。
- 凡例が名付けた下書きは、まだ「触っていない下書き」として扱う。次の Extract で置き換わる。置き換わると凡例の記録も消える。
- 失敗は静かにする: `busy`・`vlm_unavailable`・`timeout`・届かない・形が違う、のどれも、結果の欄に小さな 1 行を出すだけ。`error` イベントは出さない。
- 記録: データセットに `legend {label, confidence, source, status}` を足した（`status` は `auto`／`suggestion`／`accepted`）。
  - `DatasetDTO.legend` は省略できる欄。書くのは値があるときだけ。版は上げない（`marker` と同じ扱い）。形が違う値は読み込みで捨てる。
  - §2.3 の「下書きと凡例を同じ数字で比べるなら、ProjectDTO の側に同じ意味の印が要る」の一部になる（推測。wpd-auto の記録の形と突き合わせていない）。
- ついでに直したこと: `nextDatasetId` を「最後のデータセットの id + 1」から「最大の id + 1」にした。並べ替えた後に同じ id を配らないため。

つないで確かめたこと（この VM の中、backend を `127.0.0.1:24862` で動かした。読むだけで、wpd-auto には何も書いていない）:

| 確かめたこと | 結果 |
|---|---|
| Ollama なし（既定の `127.0.0.1:11434` に何もない） | 200 `status: vlm_unavailable`、`legend: null`。下書きは変わらず、「Legend not read: the legend reader is not running.」 |
| `shape: "line 1"` を送る（curl） | 400 `invalid_params`（`series shape: a short word or null`）。だから `shape` を選んで送る |
| 偽の Ollama（scratch の `fake_ollama.py`、`127.0.0.1:24939`。VLM の答えだけを固定で返す）と、自作の図（赤い丸と青い四角、凡例 2 項目） | 200 `ok`、`source: vlm`。backend の照合（Tesseract で凡例を置き、色と形で結ぶ）が s1→Sample A、s0→Sample B を確度 1.0 で返した。下書きは「Sample A (markernet)」「Sample B (markernet)」になり、凡例の順に並び替わった |

- VLM そのもの（qwen3.5:9b）の読みは確かめていない。偽の Ollama は答えを固定で返すだけ。
- 呼び出しは Jest の中から本物の `fetch` で行った。**ブラウザでの確認はまだ**。

### 2.4 軸の値の自動入力：starry-digitizer の OCR と wpd-auto の比較（2026-11-23）

間藤の依頼で 2 つを比べた。
- **SD-OCR**: starry-digitizer の「Auto-fill values (OCR)」。人が x1/x2/y1/y2 を置き、そこに一番近い数値をブラウザの tesseract.js で読む。
- **wpd-auto**: wpd-auto の Auto-place（`/calibrate`、PlotRuler v4、重みなし・CPU）。位置も値も自動で出す。

結果の数字は、この VM で**動かして確かめた**もの。

**やり方**
- 図: real-chart-bench の `data/verified_pairs`。人の校正（`tick_calibration.json`、各軸 2 目盛の画素と値）がある 94 図のうち、画像が手元にある **91 図**。
- 物差し: real-chart-bench の `axis_agreement` と同じ。人の 2 目盛で、自動の値と図に書かれた値の差を、目盛の幅（log 軸は桁）で割る。0.5% 以内なら、その軸は合格。
- SD-OCR は、人がクリックする点を次のように作った。
  - x1/x2 は人の x 目盛の画素、y1/y2 は y 目盛の画素に置く。
  - 直交する座標（x 軸の線の行・y 軸の線の列）は正解に無いので、目盛の間で暗い画素が一番多い行・列で推した（推測を含む作り方）。
  - OCR は Node で動かした。tesseract.js 6 とデータ best_int で、ブラウザの既定と同じ。matcher は starry-digitizer のコードそのもの。
- wpd-auto は、`feat/client-capabilities`（e6cc862。校正は main と同じ）の backend をこの VM で動かし、HTTP で画像を送った。
  - Tesseract 5.3.4、既定の設定、同時に 4 件。
- スクリプトと図ごとの点数は `~/research/drafts/axis-autofill-eval/` にある（リポジトリには入れていない）。

**結果（91 図）**

| 方式 | 両軸とも合格 | x 軸 合格／誤り／空 | y 軸 合格／誤り／空 |
|---|---|---|---|
| SD-OCR | **23** | 61／25／5 | 29／54／8 |
| wpd-auto Auto-place | **76** | 84／0／7 | 79／4／8 |
| サーバーの校正で、人が置いた点の値を出す（下の実装） | **79** | — | — |

- 許容を 1%・2% にしても数は同じ。
- wpd-auto が「ok」と言いながら 0.5% を超えて外れた軸は 4 本。答えない軸は空になるので、黙って誤る数が少ない。
- 図ごとの内訳: 両方合格 21、wpd-auto だけ合格 55、SD-OCR だけ合格 2、どちらも不合格 13。
- SD-OCR の値の誤り（364 値のうち）:
  - 小数点やマイナスが落ちる 34（"1.4"→14、"-40"→40）
  - もう一方の軸のラベルを拾う 36（原点の近く）
  - そのほかの誤り 41
  - 空 14
- 1 図あたりの時間の中央値: SD-OCR 0.4 秒（Node）、wpd-auto 0.8 秒（同時 4 件）。

**実装（0.0.5）**
- auto service に `auto_axis` があるとき、「Auto-fill values」は wpd-auto の校正を使う。
  - サーバーの目盛に当てはめた直線で、人が置いた点の値を出し、目盛の刻み（線形は目盛の間隔、log は桁）の 1/4 以内なら刻みに合わせる。
  - サーバーが読めなかった軸の点だけ、ブラウザの OCR で埋める。
  - 全部を 1 回の Undo にまとめる。
  - どの値がサーバーで、どれが OCR かを画面に出す。
  - サーバーの答えは Auto-place の提案としては残さない。
- 上と同じ 91 図で、この形は **79 図**が合格だった（`hybrid.py`。サーバーが読めなかった軸だけ OCR に回した）。
- auto service が無いとき（Vercel の公開版）は今までどおり「Auto-fill values (OCR)」。

**残ること**
- 公開版（Vercel）は backend が無いので、ブラウザの OCR のまま。
- PlotRuler v4 は MIT で重みが無いので、ライセンスの面では公開の場所にも置ける。
  - しかし 2026-11-23 に間藤が決めた: **Vercel の公開版からは starryai に届かせない。公開版は今のまま**（§10 Q16）。

## 3. 呼ぶ API と送る記録

### 3.1 呼ぶ API（すべて wpd-auto backend `origin/main` の `app.py`・`collect.py` から）

接続先はビルド時の `VITE_AUTO_SERVICE_URL`。値は相対パスで、本番は `/wpd-auto/api/v1`、ステージングは `/wpd-auto-staging/api/v1`。

| 経路 | 使う機能 | 要点 |
|---|---|---|
| `POST /calibrate[?plot=bar]` | F1・F2・F6 | 本文は画像のバイト列（multipart ではない）。10 MiB・2500 万画素まで |
| `GET /extract/methods` | F5・F6・F7 | `methods[{id,label,description,available,unavailable_reason,license,attribution,params[]}]` と `auto` |
| `POST /extract?method&area&…` | F3・F4・F6 | 座標は画素。503 `method_unavailable`／`busy`（Retry-After 5） |
| `POST /legend` | F9 | 必ず 200 で `{status,reason,legend\|null}` を返す |
| `GET /auto/status` | F7 | `{auto:{available,hours,timezone,next_change}}` |
| `GET /components` | F14 | |
| `GET /collect/status`・`POST /collect/events`・`POST /collect/project`・`GET/PUT /collect/images/{sha}` | F15 | §3.4 |
| `GET /collect/users`・`/collect/works*` | F16 | 決めた場合だけ |
| `/healthz` | デプロイの確認 | |

- 記録用のヘッダー `X-WPD-Client-Id`・`X-WPD-Session-Id`・`X-WPD-Request-Id`・`X-WPD-User` を、calibrate・extract・legend・collect の全部に付ける。
  - サーバーは calibrate・extract・legend の要求と答えを `server.*` の記録として自分で残す（`CallRecorder`）。そのとき、どの画面から来たかはヘッダーからしか分からない。
- 座標の 0.5px の補正（`BACKEND_PIXEL_OFFSET`、`autoServiceWire.ts:17`）は、`auto-service.md` で「要確認」のままである。
  - 0.1 の段で、wpd-auto の画面と同じ画像を使い、置かれた位置を比べて確かめる（未確認）。

### 3.2 backend 側の変更（wpd-auto リポジトリ）

**(a) `client` を受け取って記録に入れる**

- 新しいヘッダー **`X-WPD-App: wpd-auto | starry-digitizer`** を作る。
  - 名前の候補として `X-WPD-Client` も考えたが、すでにある `X-WPD-Client-Id`（ブラウザごとの乱数 ID）とまぎらわしいので App にした（§10 Q3）。
  - 記録の欄の名前は、決まったとおり **`client`**。
- **ヘッダーで受ける理由（推測）**: calibrate・extract・legend の `server.*` の記録は、ヘッダーからしか ID を取らない（`collect.py` の `ids_from_headers`・`record_call`）。本文に欄を足すだけでは、ここが抜ける。
- `collect.py` で直す所:
  1. 許す値を `CLIENTS = {"wpd-auto", "starry-digitizer"}` とする。知らない値は 400 `invalid_params`。ヘッダーがなければ `wpd-auto`（今の画面・古い画面と互換を保つ）。
  2. `ids_from_headers`（:778 付近）、`record_call`（:734）、`put_image` の `server.image`（:1110）、events（:1020）、project の記録（:1076）と `put_work`（:1062）に `client` を入れる。
  3. 古い記録（`client` のない行）は、読むときに `wpd-auto` とみなす。行の `v` は 1 のまま（欄を足すだけなので）。
- CORS の `allow_headers`（`app.py:341-346`）にも足す。同じオリジンなら効かないが、開発で別のオリジンから呼ぶときに要る。
- wpd-auto の画面も `X-WPD-App: wpd-auto` を付けるようにする（`collect.js` のヘッダーを作る所、`:651` 付近）。付けなくても既定で `wpd-auto` になるが、はっきりさせておく。

**(b) 管理画面で絞り込む**

- `GET /api/v1/admin?since=…&client=wpd-auto|starry-digitizer`。`client` がなければ全部を出す。
- 直す所:
  - `app.py:296-316`（クエリの検査）
  - `admin_report.Reports.key()`（:197）と `page()`（:203）、`_run`・`_work` のキャッシュの鍵。今は `since` ごとなので、`(since, client)` の組にする。
  - `admin_stats.stats()`（:268）で、records と works を絞る。`without_e2e`（:246）の隣に `by_client` を足すのが自然（推測）。
  - `_header()`（:1150-1172）の期間のリンクとフォームで、`client` を保つ。
- 表の各節に client の内訳の列を出すか（§10 Q4）。
- 操作の一覧 `frontend/app/wpd-auto/features.json` は wpd-auto の操作 ID である。starry-digitizer の `ops` は別の一覧になる。
  - 管理画面の「機能の使われ方」の節は、client ごとに一覧を切り替える必要がある（推測）。

**(c) starry-digitizer の作業（project）を受ける**

- 今の `POST /collect/project` は `wpd_json`（WPD の project の文字列）が必須である。
  - 管理画面の点の数え方（`admin_points` など）も、wpd.json を読む前提で作ってある（推測）。
- starry-digitizer の `project.json`（`PROJECT_DTO_VERSION 2.0.0`）を受ける案は 3 つある（§10 Q8）。
  - **案 P1**: 本文に `format: "wpd" | "starry-digitizer/project"` を足し、`project_json` を同じ口で受ける。管理画面の読み手は、format ごとに分ける。
  - **案 P2**: starry-digitizer の画面で、WPD の形に変換して送る。backend は変えない。ただし変換に落ちるものがある（推測）。
  - **案 P3**: 0.x では project を送らない。events と画像だけにする。管理画面の「点」の数字は starry-digitizer の分が欠ける。

**(d) 文書とテスト**

- `backend/COLLECT.md` に `client` の欄と starry-digitizer の記録の型を書く。`docs/admin-dashboard.md` に絞り込みを書く。
- テストは `tests/test_collect.py`・`test_admin_stats.py`・`test_admin_report.py` に足す。
- 版は wpd-auto の CHANGELOG で 0.3.x か 0.4.0 にする（wpd-auto 側で決める）。

**(e) capabilities**（次の §3.3）

### 3.3 capabilities（出し分け）

starry-digitizer は `GET {baseUrl}/capabilities` → `{features:[…]}` を前提にしている（`httpAutoService.ts:155-177`、3 秒で打ち切る）。
しかし、wpd-auto backend にはこの経路が**ない**。だから今のままでは、starryai に置いても機能が出ない（推測。ソースからはそう読める）。

- **案 C1（推す）**: backend に `GET /api/v1/capabilities` を足す。中身は `/extract/methods` の `available` と、calibrate のエンジンの状態から作る。
  - 小さな変更で済む。v4 の中継（D7）も同じ形で素通しできる。
- **案 C2**: starry-digitizer の側で、`/extract/methods` と `/healthz` から組み立てる。`HttpAutoServiceOptions` の `capabilitiesUrl` を使わない経路を足す。backend は変えない。

### 3.4 starry-digitizer が送る記録

**仕組み**

- starryai 版の `App.vue` が、ホストとして `onResearchEvent`（今あるフック）を受ける。
- それを新しいモジュールで束ねて `POST /collect/events` に送る（例: `src/hosting/collectSink.ts`。ライブラリには入れない）。
- 欄は wpd-auto と同じ形にする: `client_id`（localStorage の UUID）、`session_id`（開くごと）、`app_commit`・`app_version`（SemVer。そうでないと 400）、`app_build`、`events[{type,t,seq,data}]`。
- 画像は、sha256 で `GET /collect/images/{sha}` を確かめ、なければ `PUT` する（wpd-auto と同じ。元のファイルのバイト列）。

**記録の型**

- wpd-auto と意味が同じものは**同じ型名**にする。そうすると管理画面で並べて比べられる。
- starry-digitizer にだけある操作は、今の `starry-digitizer/research-event` の型を使う。`client` で分かるので、前に `sd.` を付けるかどうかは §10 Q3 で決める。

| wpd-auto の型 | starry-digitizer で出す所 | 今の SD |
|---|---|---|
| `session.start`（UA・言語・TZ・窓の大きさ・path） | アプリの起動 | ない |
| `image` | 画像の読み込み | ない |
| `calibration.auto`（提案・置いた結果・components） | Auto-place の Apply | ない |
| `calibration.final`（点・値・軸の種類） | 軸の確定（手でも自動でも） | ない（`edit{action}` はある） |
| `extraction.result`（要求・生の series・作った下書き） | Server Extraction | ない |
| `auto_digitize.result`・`.switch` | Auto digitize | ない |
| `candidates.*` | F10 を揃えるなら同じ型を使う。揃えないなら、下書きの採否を対応する型で出す | ない |
| `export`（何をどこへ、点の数だけ。値は送らない） | CSV／コピー／ZIP の保存 | `review.export` はある |
| `ops`（`{f,dt,n,ms}`、操作の ID だけ） | 操作のたび | ない（`edit{action}`・`undo`・`redo` が近い） |
| `ui.error`・`ui.message` | エラーのトースト | ない |
| — | `review.start/step/export/end`、`undo`・`redo`、`edit` | ある（そのまま送る） |

**載せないもの**

- 今の `researchEvents.ts:9-15` は、座標・値・名前を載せない線を引いている。
- 一方で wpd-auto の記録は、校正の点や抽出の結果そのものを載せている（研究の目的がそこにある）。
- starryai 版はどちらに合わせるかを決める（§10 Q2）。
  - **推す案**: wpd-auto に合わせ、作業の内容まで送る。
  - その場合も、ライブラリとしての既定（どこにも送らない、フックにも座標を載せない）は変えない。
  - starryai 版のホストが、`DigitizerContext` から別に状態を読んで送る。

## 4. starryai での置き方

### 4.1 形（wpd-auto の `deploy/` と同じ）

```
starryai（nginx :80）
├─ /wpd-auto/                    wpd-auto の画面（今のまま）
├─ /wpd-auto/api/                → 127.0.0.1:7870  wpd-auto backend（本番、共通）
├─ /starry-digitizer/            starry-digitizer の画面（静的）  ← 新しく足す
├─ /starry-digitizer/source/     （任意）配った版のソース tarball
├─ /wpd-auto-staging/            （今のまま）
├─ /wpd-auto-staging/api/        → 127.0.0.1:7871  backend（ステージング、共通）
└─ /starry-digitizer-staging/    ← 新しく足す。/wpd-auto-staging/api/ を呼ぶ
```

- **ポート**
  - starry-digitizer は静的ファイルだけなので、新しいポートは要らない。backend の 7870・7871 と、LineFormer の 7880・7881 をそのまま使う。
- **URL**
  - 案は `http://<starryai>/starry-digitizer/` と `/starry-digitizer-staging/`。
  - 短い名前（`/sd/`）にするかは §10 Q9。
  - starryai に届く範囲（NIMS の中だけか）は、wpd-auto の文書には書かれていなかった（未確認）。
- **本番とステージング**
  - wpd-auto と同じ分け方にする。同じホスト・同じオリジンで、パス・データの場所・帯の表示（STAGING）を分ける。
  - ステージングの画面は、ステージングの backend を呼ぶ。だから記録も `<DATA_DIR>/staging` に入り、本番と混ざらない。

### 4.2 release・systemd・nginx

| もの | wpd-auto のやり方（読んだ） | starry-digitizer でやること（案） |
|---|---|---|
| release | `deploy.sh` が `git archive <commit>` からビルドし、`<WEB_DIR>/releases/<commit>` に置く。`www` のリンクを一度に切り替え、今と 1 つ前だけ残す。`deploy-history.log` に 1 行足す | 同じ形。置き場所は `STARRY_DIGITIZER_WEB_DIR`（例 `/srv/starry-digitizer`）と `…_STAGING_WEB_DIR`。中に `www → releases/<commit>/` を置く |
| ビルド | `build.sh --deploy` で `config.js` を作る（`backendUrl: "."`） | `VITE_AUTO_SERVICE_URL=/wpd-auto/api/v1 vite build --base=/starry-digitizer/`（ステージングは両方を staging に）。`VERSION.txt`（commit・build 番号・環境）を書く |
| systemd | backend・LineFormer・時間のタイマー・バックアップ | **足さない**（静的だけ）。backend のユニットは wpd-auto のものをそのまま使う |
| nginx | `deploy/nginx/wpd-auto.conf` は :80 の server ブロックを丸ごと持つ（`default_server`） | 同じ server ブロックに `location /starry-digitizer/`（`alias …/www/`、`expires -1`）とステージングの分を足す。そのため、**wpd-auto のひな形を変えることになる**（§10 Q12） |
| site.env | `~/.config/wpd-auto/site.env`（データとして読み、知らないキーは止まる） | 新しいキー `STARRY_DIGITIZER_WEB_DIR`・`…_STAGING_WEB_DIR` を足すか、別のファイルにするか（Q12） |
| 昇格 | `staging <commit>` → 確かめる → `production @staging` | 同じ |
| ソースの配布 | AGPL §13 のため、リポジトリ全体の tarball を `/wpd-auto/source/` で配る | starry-digitizer は MIT なので、義務はない。揃えるかは任意 |
| ライセンスの表示 | `/extract/methods` の `license`・`attribution` | 同じ（F5） |

**デプロイのスクリプトの置き場所（§10 Q12）**

- **案 D1**: wpd-auto の `deploy.sh` に `starry-digitizer` という対象を足す。starry-digitizer のチェックアウトの場所を site.env で指す。nginx のひな形とロックを共有できる。
- **案 D2（推す）**: starry-digitizer のリポジトリに `deploy/deploy.sh`（静的ファイルだけの小さなもの）を置く。nginx の location のひな形だけを wpd-auto 側に足す。リポジトリの責任がきれいに分かれる。

### 4.3 ビルドで直す所（`feat/auto-digitize` を読んで分かったこと）

- 絶対パスを、相対パスか `import.meta.env.BASE_URL` に直す。対象は次のとおり。
  - `vite.config.js:59-67` の PWA の `start_url: '/'` とアイコン
  - `App.vue:119` の `'/sample_graph_curve.png'`
  - `'/version.json'` を読む所（推測。grep の取りこぼしがありうる）
- **OCR**
  - `assetBaseUrl` がないと、tesseract.js は自分の CDN から worker・core・言語のデータを取る（`axisOcrReader.ts:24-55`）。
  - starryai からは外の CDN が NIMS の proxy を通る。あるいは届かない（未確認）。
  - そこで、`eng.traineddata`（リポジトリの直下にある）と worker・core を同じオリジンから配り、`assetBaseUrl` で指す。

### 4.4 PWA

- starry-digitizer は VitePWA で service worker を入れる。starryai 版では、次の 2 つの問題がある。
  - 古い版が残る。wpd-auto は `VERSION.txt` を見て Reload を勧める。
  - API への要求が service worker を通る。
- **推す案**: starryai 版のビルドでは PWA を切る。F17 の版の知らせは、wpd-auto と同じ方式（`VERSION.txt` を 5 分ごとに見る）にする（§10 Q13）。
- 残す場合は、次の 2 つを満たす。
  - scope を `/starry-digitizer/` に限る。
  - `/wpd-auto/api/` を precache と navigateFallback の対象から外す。

### 4.5 同じオリジンで気を付けること（推測）

- localStorage はオリジンごとに 1 つで、wpd-auto と共有になる。
  - キーの名前に `starry-digitizer.` と環境（production／staging）を付け、wpd-auto のキー（client_id など）と重ならないようにする。
  - **client_id は画面ごとに別にする**。同じ人でも `client` と `client_id` の組で区別できるようにするため。
- nginx の `client_max_body_size 10m` と backend の 10 MiB の上限を、画面でも先に確かめる。そうすれば、送ってから断られることがない。

### 4.6 開発のとき（この VM）

- vite の開発サーバーは今 8888 番である。Mac から見るには、帯の中の **24888** 番を `127.0.0.1` で待つ（この VM の決まり）。
- backend は wpd-auto の開発用の起動例（7860 番）を **24860** 番にずらし、`WPD_AUTO_ALLOWED_ORIGINS=http://localhost:24888` にする。
  - または、vite の proxy で `/wpd-auto/api` を backend に流し、同じオリジンにする（推す。本番と同じ形になる）。

## 5. 動く時間と、研究のための保存の知らせ

### 5.1 動く時間（9:00〜17:00 JST）

wpd-auto のしくみ（読んだ）は次のとおり。

- **時間外も、何も断らない。** 時間外になると、LineFormer（GPU）のサービスがタイマーで止まる。
- そのため LineFormer の抽出は 503 `method_unavailable`（`service_unavailable`）になる。校正・MarkerNet・BarNet は CPU で動くので、時間外も答える。
- 画面の動き:
  - `/auto/status` を見て、失敗したときだけ「時間外です」の旨をエラーに足す。
  - フッターには常に「Automatic features are supported 9:00–17:00 JST. Manual digitizing works at any time.」を出す。
- 時間帯は site.env の `WPD_AUTO_AUTO_HOURS`・`WPD_AUTO_AUTO_TIMEZONE` で決める。
  - backend の既定は `Asia/Tokyo`（`config.py:81`）。
  - ただし `deploy/site.env.example` の例は `UTC` になっている。starryai の実際の値は見ていない（未確認）。

**提案**: **wpd-auto に合わせる。**

- backend が共通なので、時間も共通になる。starry-digitizer 側で別の時間は持てない。
- 画面の文と、時間外に Lines を選んだときの扱い（MarkerNet にする）も揃える。

### 5.2 研究のための保存と、その知らせ

wpd-auto のしくみ（読んだ）は次のとおり。

- **同意を取る手順（opt-in・opt-out）はない。知らせるだけ。**
- 本文: 「Your work (images, axes, data points) is saved on the NIMS server for research.」
- 出す場所: フッター（tooltip に送る項目の一覧と「no name, no IP address」）、スタートのサイドバー、Load Image、Auto-place、About。
- About の詳しい説明: 画像、校正（Auto-place の提案も）、点、抽出結果、エクスポートの事実（中身は除く）、SID／Fig.、機能の使用（入力した文字は除く）、ブラウザ名と窓の大きさ、匿名の ID と選んだ名前を挙げ、「used for research, e.g. to improve automatic calibration and extraction」と書いている。
- 2026-10-14 以降、作業はブラウザに保存せず、サーバーだけに保存している。消すしくみは自動ではない（依頼があれば手で消す）。

**提案**: **wpd-auto に合わせる。**

- 同じ backend の同じ場所に保存するので、利用者への説明も同じでなければならない。
- 文は wpd-auto の文を元に、starry-digitizer の言い方に直す。
  - 英文に we/us を使わない（例: 「Your work … is saved on the NIMS server for research.」はそのまま使える）。
- starry-digitizer は今、作業をブラウザにも保存する（推測。ProjectDTO と Undo の仕組みからそう読める）。サーバーだけに寄せるかは F16 と一緒に決める（§10 Q5）。
- Vercel の公開版には何も出さない（送らないので）。
- 知らせを出す前に記録を送らない。0.2 の段で、記録と知らせを**同時に**入れる。

## 6. 試験の方針（案）

| 段 | 何を | どこで |
|---|---|---|
| 単体 | `autoServiceWire`（Bar・legend・methods の答えの検査）、記録の詰め替え、`client` のヘッダー | starry-digitizer の Jest |
| 単体 | `client` の検査・既定値・古い行、admin の絞り込み | wpd-auto の pytest |
| 結合 | モックの backend（wpd-auto の `frontend/wpd-auto/dev/` にあるものを使えるか、未確認）で、Auto digitize から記録まで | Cypress |
| 総合 | ステージングで、同じ画像を 2 つの画面で処理し、置いた軸と点、記録の `client` を比べる | starryai のステージング |
| 本番 | E2E は走らせない（wpd-auto と同じ） | |

## 7. 範囲の外（この版では）

- 論文の PDF（F19）、多パネル（F20）
- ログイン（wpd-auto と同じく、ネットワークの範囲に頼る）
- v4（Starrydata2）への埋め込みと D7 の中継（`auto-service.md` §7 のまま）
- Vercel の公開版に自動機能を出すこと

## 8. 進め方の約束

- 作業の土台は `origin/feat/auto-digitize`（または `origin/v4`）にする（§10 Q2）。main に入れていく順は、間藤が決める。
- 投稿はしない。issue・PR・コメント・push は、何をどこにかを見せて確かめてから行う。
  - starry-digitizer の AGENTS.md（`feat/auto-digitize`）は、main への直接の push を禁じ、develop への PR を求めている。
- 裏で Claude を動かさない。

## 9. 変更の履歴

| 版 | 日 | 中身 |
|---|---|---|
| 0.0.1 | 2026-11-23 | 最初の下書き |
| 0.0.2 | 2026-11-23 | 間藤の「これで進めて」を受け、§10 に仮決めを書いた。置き場所を docs/design に移した |
| 0.0.3 | 2026-11-23 | §2.3 進み具合と、作業中に決めたことを足した |
| 0.0.4 | 2026-11-23 | wpd-auto 側の capabilities・client・管理画面の絞り込みとつないで確かめた結果を足した |
| 0.0.6 | 2026-11-23 | Q16: Vercel の公開版は今のまま（starryai に届かせない）と決まった |
| 0.0.7 | 2026-11-23 | §2.3 に F9 凡例の読み取りの実装と、backend とつないで確かめた結果を足した |
| 0.0.5 | 2026-11-23 | §2.4 軸の値の自動入力の比較（SD-OCR 23／wpd-auto 76／サーバーで人の点の値 79、91 図）と、Auto-fill values をサーバーの校正で埋める実装。Q16 |

## 10. 決めてほしいこと（間藤への質問）と、仮決め

2026-11-23 に間藤が「これで進めて」とした。そこで下の表のとおり仮に決めて進める。
「推した案」は 0.0.1 で推した案をそのまま採ったもの。「既定」は推す案を書いていなかったので、作業を止めないために選んだもので、**間藤がいつでも変えられる**。

| 問い | 仮決め | 種類 |
|---|---|---|
| Q1 置き場所 | `docs/design/starryai-auto.md`（auto-service.md の隣） | 既定 |
| Q2 土台・記録の深さ | 土台は `origin/v4`（= feat/auto-digitize + docs）。starryai 版は wpd-auto と同じく作業の中身まで送る。ライブラリの既定（どこにも送らない）は変えない | 推した案 |
| Q3 名前 | ヘッダー `X-WPD-App`、値 `wpd-auto`・`starry-digitizer`。starry-digitizer にだけある型には `sd.` を付けない（`client` で分かる） | 既定 |
| Q4 管理画面 | まず `?client=` の絞り込みだけ。内訳の列は後で | 既定 |
| Q5 名前の選択・My work | 名前の選択は 0.2 で入れる（記録を揃えるため）。My work とサーバーだけへの保存は 0.5 で決め直す。それまでブラウザへの保存は今のまま | 既定 |
| Q6 候補の方式 | 下書きのデータセットのまま。記録の型を対応させる（§3.4） | 既定 |
| Q7 Bar 軸 | 0.4 の段で決める。仮に「項目番号を X にした X-Y」 | 既定 |
| Q8 project の受け口 | 案 P1（`format` を足す）。0.2 の段で wpd-auto 側と詰める | 既定 |
| Q9 版と URL | アプリの版は package.json のまま（2.0.0 系）。この文書の段の番号（0.1〜0.5）は版ではなく段の名前として使う。パスは `/starry-digitizer/` | 既定 |
| Q10 しきい値 | starry-digitizer の 0.5 のまま | 既定 |
| Q11 範囲 | Start over（F12）は入れる。Set up series などサーバーを使わないものは後で | 既定 |
| Q12 デプロイ | 案 D2（starry-digitizer に小さな deploy.sh、nginx の location のひな形だけ wpd-auto に） | 推した案 |
| Q13 PWA | starryai 版のビルドでは切る | 推した案 |
| Q14 capabilities | 案 C1（backend に `/capabilities`） | 推した案 |
| Q15 wpd-auto 側の分担 | wpd-auto のセッション（w3:p1）に頼む（そのセッションが申し出ていた） | 既定 |
| Q16 公開版の軸の値 | **今のまま**（ブラウザの OCR）。Vercel の公開版からは starryai にアクセスさせない | 間藤が決めた（2026-11-23） |

以下は 0.0.1 の問いの本文（残しておく）。

1. **Q1 置き場所**: この設計書をどこに置くか。
   - starry-digitizer の `design_doc/`、`docs/design/`（`feat/auto-digitize` に auto-service.md がある所）、またはこのまま drafts。
2. **Q2 土台と記録の深さ**:
   - 作業の土台を `feat/auto-digitize`（v4）にしてよいか。
   - starryai 版は wpd-auto と同じく作業の中身（校正の点・抽出結果・画像）まで送るか。それとも今の `researchEvents` の線（座標・値・名前を載せない）を守るか。
3. **Q3 名前**:
   - ヘッダー名を `X-WPD-App` にしてよいか。
   - 値は `wpd-auto` と `starry-digitizer` でよいか。
   - starry-digitizer にだけある記録の型に `sd.` を付けるか。
4. **Q4 管理画面**:
   - 絞り込み（`?client=`）だけにするか。
   - 各表に client ごとの内訳の列も出すか。
5. **Q5 名前の選択と My work**:
   - starry-digitizer にも名前の選択（`X-WPD-User`）を出すか。
   - My work（サーバーから作業を開き直す）を出すか。
   - 作業の保存をサーバーだけに寄せるか。
6. **Q6 候補の方式**: 抽出結果の扱いを、wpd-auto の「候補（チェックして足す）」に揃えるか、starry-digitizer の「下書きのデータセット」のままにするか。
   - 管理画面で「足した候補の数」を 2 つの画面で比べられるかに効く。
7. **Q7 Bar 軸**: starry-digitizer の軸セットで、Bar 軸をどう表すか。
   - 項目番号を X にした X-Y で代用するか、軸の種類を足すか。
8. **Q8 project の受け口**: 案 P1（format を足す）／P2（WPD の形に変換）／P3（project は送らない）のどれにするか。
9. **Q9 版と URL**:
   - starryai に置く版の数え方。starry-digitizer の package.json は `feat/auto-digitize` で 2.0.0 になっている。starryai 版を別に 0.x で数えるか。
   - パスは `/starry-digitizer/` でよいか。
10. **Q10 しきい値**: 点の見直しの既定のしきい値を揃えるか（wpd-auto 0.6、starry-digitizer 0.5）。
11. **Q11 範囲**: 「auto の機能を全部」に、サーバーを使わない機能も含めるか。
    - 対象は Set up series・Start over・凡例の順の並べ替え・Reload の勧め など。
12. **Q12 デプロイ**:
    - 案 D1（wpd-auto の deploy.sh に相乗りする）か、案 D2（starry-digitizer に小さな deploy.sh を置き、nginx のひな形だけ wpd-auto に足す）か。
    - site.env のキーをどうするか。
13. **Q13 PWA**: starryai 版で PWA を切ってよいか。
14. **Q14 capabilities**: 案 C1（backend に `/capabilities` を足す）か、案 C2（画面で組み立てる）か。
15. **Q15 wpd-auto 側の作業の分担**: backend の変更（§3.2）は wpd-auto のセッションに頼むか、こちらでブランチを切るか。
16. **Q16 公開版の軸の値**: Vercel の公開版でも wpd-auto の校正（PlotRuler v4、重みなし・MIT）を使えるようにするか。
    - 使うなら、NIMS の外から届く場所に校正だけの口を置くことになる。
    - 置かないなら、公開版はブラウザの OCR のまま（91 図で 23 図）。
