# starryai 版のブラウザでの確かめ（e2e-starryai）

starryai に置く版（`docs/design/starryai-auto.md` §4）を、本物のブラウザ（ヘッドレスの Chromium）で動かして確かめる。
Jest では見えない所（画面の表示・クリック・本物の backend とのやり取り・記録の保存）を見るためのもの。
何度でも流せる。失敗があれば終了コードが 1 になる。

## 要るもの

- この VM（Lima の research）。ほかの場所では試していない。
- Chromium か、その headless shell。既定は
  `~/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux-arm64/chrome-headless-shell`。
  ほかのものは `CHROME_PATH` で指す。
- `node_modules`（devDependency の `puppeteer` 25.9.0 を使う。ブラウザはダウンロードしない）。
- wpd-auto の backend のチェックアウトと、その `.venv`。既定は `~/research/repos/wpd-auto/backend`。ほかは `WPD_AUTO_BACKEND` で指す。
  読むだけで、何も書かない（`PYTHONDONTWRITEBYTECODE=1`）。重み（MarkerNet・LineFormer・BarNet）と VLM はなくてよい。
- ポート `24866`（backend）と `24960`（同じオリジンの中継）が空いていること。どちらも `127.0.0.1` だけで待つ。

## 流し方

```sh
node scripts/e2e-starryai/run.mjs --out /tmp/…/e2e-run     # ビルドから
node scripts/e2e-starryai/run.mjs --out /tmp/…/e2e-run --no-build   # 前のビルド（<out>/www）を使う
```

`--out` を省くと OS の一時ディレクトリの下に作る。流れは次のとおり。

1. `deploy/deploy.sh` と同じ設定でビルドする（`--base=/sd/`、`VITE_AUTO_SERVICE_URL=/wpd-auto/api/v1`、PWA と Google tag は off、OCR の資産は同じオリジン）。出力は `<out>/www`。
2. `<out>/collect` を収集の場所にして（`users.json` に alice と bob）、backend を `127.0.0.1:24866` で動かす（staging、時間 09:00-17:00 Asia/Tokyo）。
3. `sameorigin.py` を `127.0.0.1:24960` で動かす。nginx の代わりで、`/sd/` にページ、`/wpd-auto/api/` を backend に渡す。
4. ヘッドレスの Chromium で下の手順を流す。各段の画面を `<out>/shots/` に撮る。
5. 動かしたサーバーをすべて止める。結果を `<out>/index.html` と `<out>/result.json` に書く。

結果のページを Mac で見るとき（この VM の決まりにより、ファイルを渡さず、ポートで見せる）:

```sh
python3 -m http.server --bind 127.0.0.1 --directory <out> 24961
```

Mac のブラウザで `http://localhost:24961/` を開く。画像は `<img>` で読み込む。

## 確かめること

本物の backend に対して:

| 段 | 中身 |
|---|---|
| 1 | 研究のための保存の知らせ（左の欄・名前の窓）。名前を選ぶ前は `/collect/events` を送らない |
| 2 | 名前（Alice Example）を選ぶ → フッターの「Name: …」・知らせ・サポート時間の文 |
| 3 | Axis Auto-place（本物の `/calibrate`）→ 提案 → Apply → 4 つの軸の値が目盛りの値で埋まる。Bar の選択肢は出ない（`auto_axis_bar` がない） |
| 4 | Clear XY Axes → 4 Points で手で印を置く（x 2・4、y 6・12 の目盛り）→ Auto-fill values（サービス）→ 値が 2, 4, 6, 12。「Read by the auto service: x1, x2, y1, y2.」 |
| 5 | Help > About → Components を開く → backend の部品の一覧（MarkerNet は weights_missing） |
| 6 | 点を 1 つ打つ → Start over (keep image) → 軸が戻る・画像は残る・前の文が残らない → Edit > Undo で軸が戻る |
| 10 | `<out>/collect/events/*.jsonl` の行がすべて `client: starry-digitizer`。`session.start`・`image`・`calibration.auto`・`calibration.final`・`edit`（`project.start-over` も）・`undo` がある。名前を選んだ回の行は `user: alice` |
| 全体 | 捕まえていないエラーと、console の error がないこと（下の許すものを除く） |

ブラウザの中で答えを差し替えて（backend に重み・VLM・`/auth/*` がないため）:

| 段 | 差し替えるもの | 中身 |
|---|---|---|
| 7 | `/capabilities` に `markernet` を足し、`/extract/methods` で markernet を available にする（starryai で重みがあるときの形） | Server Extraction が出る。LineFormer は「not available now (not_configured)」。時間の文。Extract は本物の backend に行き 503 になり、欄にエラー（失敗の文と時間の案内が 2 文に分かれる） |
| 7b | `/extract` の答え（見本の図の Blue と Red の印から手で作った 2 系列） | 下書きが 2 つ。`/legend` は本物（VLM なし）→「Legend not read: the legend reader is not running.」 |
| 7c | 加えて `/legend` の答え（VLM、s0 = Blue 0.92、s1 = Red 0.4） | 「Legend: auto Blue」、「…: Red? (0.40) Use this name」。押すと Red になる |
| 8 | 7 と同じ | Auto digitize: 校正は済み、抽出は失敗、時間外の案内、Undo の文 |
| 9 | `/auth/*` を wpd-auto の下書き（`docs/user-passwords.md` 0.0.2）どおりに答える | Sign in の窓だけが出る（名前の窓は出ない）。違うパスワード → 「The name or password is not correct.」、欄は空になる。正しいパスワード（Enter）→ フッター「Signed in as Alice Example · Sign out」。`/calibrate` と `/collect/events` に token が付き、`X-WPD-User` は付かない。Sign out → 窓がまた出る |

## console の error で許すもの（理由）

- `/auth/status` の 404: backend にまだ `/auth/*` がない。ページは名前の選び方のまま動く（設計 §11.2）。
- `/extract?…` の失敗（7・8 の段だけ）: 重みがないので、わざと失敗させている。
- `/auth/login` の 401（9 の段）: わざと違うパスワードを送っている。
- `[starry-digitizer] DigitizerError: The auto service failed (HTTP 503, method_unavailable: weights_missing)`（7・8 の段だけ）:
  `<StarryDigitizer>` は、ホストに渡すエラーを console にも書く（`StarryDigitizer.vue` の `onError`）。

## 確かめていないこと

- 重みのある MarkerNet・LineFormer・BarNet の本物の答えと、本物の VLM の凡例の読み。
- Bar の Auto-place（backend が `auto_axis_bar` を返さない）。
- 本物の `/auth/*`（wpd-auto にまだない）と、wpd-auto の画面との token の共有。
- starryai の nginx を通した形。PWA を切った版だけを見ている。
- Chromium 以外のブラウザ。
