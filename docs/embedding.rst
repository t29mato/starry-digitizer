他のWebアプリケーションへの組み込みガイド
##########################################

StarryDigitizer は単体のWebアプリとしてだけでなく、**npm パッケージ ``starry-digitizer``** として
他のWebアプリケーション(以下「ホスト」)に部品として組み込めます。
このページは、どのホストにも共通する組み込みの考え方をまとめたものです。
props / events / メソッドの一覧など API の詳細は、リポジトリの
`README (Using as a library) <https://github.com/t29mato/starry-digitizer#using-as-a-library-vue-3-component>`_
を参照してください。

.. contents:: 目次
   :depth: 2
   :local:


1. 何が提供されるか
========================================

- ``<StarryDigitizer>`` : Vue 3 コンポーネント。画像とプロジェクト(作業状態)を受け取って描画し、
  変更をイベントで通知します。
- ``ProjectDTO`` : 軸の校正情報・データセット・点(ピクセル座標)などの **作業状態を表す JSON** 。
  ホストはこれをそのまま保存・復元します。中身を解釈する必要はありません。
- ``DatasetValues`` : 軸校正を適用した **物理量(x, y)** に変換済みのデータセット。
  ホストが最終的なデータとして取り込むのはこちらです。
- ``migrateProject()`` / ``PROJECT_DTO_VERSION`` : 古い ``ProjectDTO`` を最新形式へ変換するためのユーティリティ。

画像は ``ProjectDTO`` に **含まれません** 。ホストが画像と ``ProjectDTO`` を別々に保存し、
復元時に両方を渡します。


2. 前提(ホスト側で用意するもの)
========================================

peerDependency は ``vue``\ (^3.3)と ``@vue/reactivity``\ (^3.3)の 2 つです。
このうち必須なのは ``@vue/reactivity`` だけで(エンジンの変更通知がこれです)、
``vue`` は ``peerDependenciesMeta`` で optional にしてあります。
``<StarryDigitizer>`` やパネルを使うなら ``vue`` が要り、``starry-digitizer/core``
だけを使うなら不要、という切り分けです(10.9 を参照)。Vue のホストが追加でインストール
するものはありません。``vue`` パッケージが ``@vue/reactivity`` に依存し同じ関数を
再エクスポートしているため、通常のインストールでは両方とも 1 つの実体に解決されます。

.. warning::

   ``@vue/reactivity`` が **2 つ** に解決されると、コンポーネントは無言で壊れます。
   エンジンの状態は ``@vue/reactivity`` の ``reactive()`` で包まれ、コンポーネントは
   ``vue`` に同梱された方の実装で依存を追跡するため、実体が 2 つあると依存グラフが
   分かれます。クリックは状態に届く(``getProject()`` には軸も点も入っている)のに
   **再描画だけが起きない** ——軸マーカーも点も出ず、モードも切り替わりません。
   例外もログも出ないので、原因に辿り着きにくい種類の不具合です。

   レジストリや tarball からの普通のインストールでは起きません。起きるのは
   ``file:`` / ``link:`` 依存や pnpm の入れ子配置など、ライブラリ側の bare import が
   **ライブラリ自身の** ``node_modules`` に解決される構成です
   (本リポジトリの ``examples/host-app`` がまさにそれで、明示的に dedupe しています)。

   .. code-block:: js

      // vite.config.ts
      export default defineConfig({
        resolve: { dedupe: ['vue', '@vue/reactivity'] },
      })

   確認は、ホスト側で ``import { reactive } from 'vue'`` と
   ``import { reactive as coreReactive } from '@vue/reactivity'`` が同一関数か
   比較するのが確実です。

UI フレームワーク(Vuetify 等)やアイコンフォントは **不要** で、コンポーネントは自前の
最小 UI(素の Vue + scoped CSS、インライン SVG アイコン)を持ちます。
ホストが React や素の JavaScript でも、Vue ランタイム 1 つを足すだけで動きます。

パッケージは npm レジストリには公開していません。リポジトリを clone して ``npm pack`` で
tarball を作り、パス指定でインストールします(``prepack`` が必ずライブラリをビルドします)。

.. code-block:: bash

   # ライブラリ側(1回)
   git clone https://github.com/t29mato/starry-digitizer && cd starry-digitizer
   yarn install && npm pack

   # ホストアプリ側
   npm install /path/to/starry-digitizer-<version>.tgz vue

tarball をホスト側リポジトリにコミットしておくと、``package-lock.json`` に integrity ハッシュが
記録され、ネットワークのない Docker ビルドでも同じ成果物が再現します。
``git+ssh://github.com/t29mato/starry-digitizer#<sha>`` 形式の依存も使えます(``prepare``
スクリプトが install 時にビルドします)。

ライブラリの CSS は ``import 'starry-digitizer/styles'`` で 1 回だけ読み込みます。
ルールはすべて ``.starry-digitizer``\ (ホストが書くラッパ)か ``.sd-panel``\ (ライブラリが
各パネルのルート要素に自分で付けるクラス)の配下にスコープされ、ホストのグローバル CSS と
衝突しません(例外はテーマトークンの既定値だけで、これは ``:where(:root)`` に置かれます。
10.7 を参照)。配色は CSS カスタムプロパティで上書きできます。

.. code-block:: css

   .starry-digitizer { --sd-primary: #1e3a5f; }

書体・文字サイズ・行送りは既定でホストのものを **継承** します(``--sd-font`` /
``--sd-font-size`` / ``--sd-line-height`` の既定値が ``inherit``)。ライブラリ独自の
書体には切り替わりません。理由と上書き方法は 10.8 を参照してください。


3. 基本的な流れ
========================================

組み込みは、次の4つの責務をホストが持つことで成り立ちます。

1. **初期化** : 画像(``Blob`` 推奨)と、保存してあれば ``ProjectDTO`` を props で渡す。
2. **保存** : ``update:project`` イベントで受け取った ``ProjectDTO`` を、自分の API に保存する。
   イベントはコンポーネント側で 300ms デバウンスされますが、通信頻度を抑えるためホスト側でも
   さらにデバウンスすることを推奨します。
3. **確定** : 「保存」「登録」などユーザーの明示的な操作のタイミングで
   ``getDatasetValues()`` を呼び、物理量をホストのデータとして取り込む。
4. **エラー表示** : ``error`` イベントを受けて、ホストの流儀(スナックバー等)で表示する。
   ライブラリは ``throw`` や ``alert()`` をしません。

.. code-block:: vue

   <script setup lang="ts">
   import { ref } from 'vue'
   import { StarryDigitizer, type ProjectDTO } from 'starry-digitizer'

   const digitizer = ref<InstanceType<typeof StarryDigitizer>>()
   const image = ref<Blob>()
   const project = ref<ProjectDTO>()

   async function load(figureId: string) {
     // 画像は署名付きURL等をホストが fetch して Blob で渡す
     image.value = await api.fetchImageBlob(figureId)
     project.value = (await api.fetchProject(figureId)) ?? undefined
   }

   const save = debounce((p: ProjectDTO) => api.saveProject(figureId, p), 2000)

   async function commit() {
     const values = digitizer.value!.getDatasetValues()
     await api.saveCurves(figureId, values)
   }
   </script>

   <template>
     <StarryDigitizer
       ref="digitizer"
       :image="image"
       v-model:project="project"
       :features="{ imageUpload: false, zipExportImport: false }"
       @update:project="save"
       @error="(e) => showToast(e.message)"
     />
   </template>

5 つ目の責務として、\ **確認ダイアログ** をホストの流儀に寄せることもできます。
データセットの削除、軸セットの削除、作業済み画像の差し替えなど「本当によいですか」を
訊く箇所はすべて 1 つの関数を通ります。既定は ``window.confirm`` を呼ぶ ``DEFAULT_CONFIRM``
で、``confirm`` prop に自前のダイアログを渡すとホスト自身のモーダルで訊けます。
ネイティブダイアログは、埋め込まれた別アプリの存在を一瞬で露呈させる典型なので、
自前のモーダルを持つホストは渡しておくとよいです。

.. code-block:: vue

   <StarryDigitizer :confirm="(message) => myModal.confirm(message)" />

型は ``ConfirmDialog``\ 、すなわち ``(message: string) => boolean | Promise<boolean>``
です。``message`` はマークアップを含まない平文で、``true`` に解決したときだけ処理が
進みます。パネルを自前配置するホストは ``provideDigitizerOptions({ confirm })`` で渡し、
自分の確認も ``options.confirm`` を直接呼ぶのではなく ``requestConfirmation(options, message)``
経由で呼んでください。ホストのダイアログが例外を投げたり reject したりしたときに、
黙って処理を握りつぶす(``false`` 扱い)ことも、誰も同意していない破壊的操作を走らせる
(``true`` 扱い)こともせず、警告を出して ``window.confirm`` に落とすためです。


4. 画像の渡し方
========================================

``image`` prop には ``Blob`` / ``File`` / data URL / ``http(s)`` URL のいずれも渡せます。
ただし次の理由から **ホストが取得した Blob を渡す** ことを推奨します。

- 認証付き・短寿命の URL でもホスト側の認証状態で取得できる。
- 他オリジンの画像を ``<img>`` で直接参照すると canvas が汚染(tainted)され、
  ピクセル読み出し(自動抽出・色抽出)ができなくなる。
- URL を渡した場合、ライブラリは ``fetch(url, { credentials: 'include' })`` で取得します。
  CORS ヘッダはホスト側で用意してください。

``features.imageUpload`` を ``false`` にすると、画像のファイル選択・ドラッグ&ドロップ・
ペーストが無効になります。画像の差し替えはホストが ``image`` prop の更新で行ってください。


5. 図の切り替えと再利用
========================================

``image`` と ``project`` は監視されており、新しい値を代入すると同じコンポーネントが再初期化されます。
図を切り替えるたびにコンポーネントを作り直す必要はありません。

``image`` だけを変えた場合、現在の ``project`` がそのまま新しい画像に適用されます
(画像の差し替え = 同じ作業状態を保つ、という扱いです)。別の図に切り替えるときは、
``image`` と ``project`` を **同じタイミングで** 更新してください。保存済みの作業状態が無い図なら
``project`` に ``undefined`` を代入すると空の状態から始まります。

``v-model:project`` で受け取った ``ProjectDTO`` をそのまま ``project`` に書き戻しても、
内容が同一であれば再読み込みは行われません(ループしません)。

読み込みが完了すると ``ready`` イベントが発火します。読み込み中に ``getProject()`` などを呼ぶ
必要がある場合は ``ready`` を待ってください。


6. 閲覧専用モード
========================================

``readonly`` を ``true`` にすると、点の追加・編集・削除、軸の変更、データセット操作、
自動抽出、Undo/Redo が無効になり、拡大鏡やデータテーブルの閲覧だけが可能になります。
レビュー画面や、権限のないユーザーへの表示に使います。


7. データセットとホスト側レコードの紐付け
==============================================

``DatasetDTO.externalId`` は、ホストが自分のレコードID(例: サンプルID)を保持するための
任意の文字列です。ライブラリはこの値を解釈せず、保存・復元と ``getDatasetValues()`` の
結果にそのまま載せるだけです。データセット名は自由に変更されうるため、紐付けには
``externalId`` を使ってください。

``datasetNameCandidates`` に名前の候補(例: 論文中のサンプル名一覧)を渡すと、
データセット名の入力欄が候補から選べるコンボボックスになります(自由入力も可)。


8. ProjectDTO の保存とバージョン
========================================

- ホストは ``ProjectDTO`` を **そのまま JSON として保存** します。スキーマを解釈したり
  正規化したりしないでください。
- ``ProjectDTO.version`` は semver で、メジャー番号がスキーマ世代です。互換性のない変更は
  必ずメジャーを上げ、``migrateProject()`` で旧形式を読めるようにします。
- ``project`` prop や ``loadProject()`` に渡した DTO は内部で ``migrateProject()`` を通るため、
  ホストが変換を意識する必要はありません。ライブラリより新しいバージョンの DTO は
  ``error`` イベント(``DTO_VERSION_UNSUPPORTED``)になります。
- ``getProject()`` が返す DTO は常に最新バージョンです。保存時に置き換えれば、
  古い形式のデータは自然に更新されていきます。
- 従来の ZIP 形式(スタンドアロン版の「Save Project」)も同じ復元コードを通るため、
  ZIP の ``project.json`` を取り出して ``loadProject(dto, imageBlob)`` に渡せば読み込めます。


9. 重いアセットとセキュリティポリシー
========================================

軸の値を OCR で読む機能は tesseract.js を **使うときに初めて** 動的に読み込みます。
既定では tesseract.js 自身の配信元(CDN)からワーカー・wasm・言語データを取得するため、
Content-Security-Policy で外部オリジンを制限しているホストは、これらのファイルを自分の
オリジンに配置し ``assetBaseUrl`` で場所を指定してください。

OCR 自体が不要なら ``features`` の ``axisOcr`` を ``false`` にしてください。
「Auto-fill values (OCR)」ボタンとその周辺表示が消え、tesseract.js を動的 import する
経路が無くなるため、ワーカー・wasm・言語データ(合計約 11MB)がホストの配信物から
まるごと落ちます。``assetBaseUrl``\ (配信元)と ``axisOcr``\ (機能の有無)は別の軸で、
CSP を絞っていないホストは ``axisOcr`` を ``true`` のまま CDN 既定値で使えます。
逆に ``assetBaseUrl`` を渡さないだけではボタンは残るので、CSP で外部オリジンを禁じている
ホストでは「押せるのに必ず失敗するボタン」になります。

.. code-block:: vue

   <StarryDigitizer :features="{ axisOcr: false }" />

``axisOcr`` を ``false`` にしたのに成果物が軽くならない場合は、学習データの置き場所を
確認してください。Vite は ``public/`` 以下を **参照の有無に関係なく** 成果物へ複製するため、
``public/eng.traineddata.gz`` のように置いていると OCR を無効にしても 2.9MB が付いてきます。
自前配信する場合は ``public/`` の外(ビルドプラグインやコピータスクの管理下)に置き、
``assetBaseUrl`` が指す先へ明示的に配置してください。

ライブラリのビルド成果物には Sentry・PWA・アナリティクスなどの外部通信は含まれません
(CI の ``yarn lib-check`` で検査しています)。


10. Vue 以外のホストから使う
========================================

コンポーネントは Vue 3 製ですが、ホスト全体が Vue である必要はありません。
React や素の JavaScript からは、コンテナ要素に小さな Vue アプリをマウントする
薄いラッパーを書くことで利用できます。

そのまま使えるラッパーの実装が ``examples/vanilla-host/src/mountDigitizer.ts`` にあります。
Vue を import しているのはこのファイルだけで、ホスト側のコードは素の
TypeScript です。自分のプロジェクトへコピーして使ってください。

.. code-block:: ts

   // examples/vanilla-host/src/mountDigitizer.ts (抜粋)
   const props = reactive({ ...options })          // update() 用にリアクティブに保持
   const app = createApp({
     render: () =>
       h(StarryDigitizer, {
         ref: digitizer,
         image: props.image,
         project: props.project,
         readonly: props.readonly ?? false,
         features: props.features,
         'onUpdate:project': (p: ProjectDTO) => props.onProjectChange?.(p),
         onError: (e: DigitizerErrorPayload) => props.onError?.(e),
       }),
   })
   app.mount(el)

返り値のハンドルは ``getProject()`` / ``getDatasetValues()`` / ``loadProject()`` /
``reset()`` / ``exportZip()`` / ``update()`` / ``unmount()`` を持ちます。
``update()`` は ``reactive()`` な props を書き換えるだけなので、``readonly`` や
``features`` を再マウントなしで切り替えられます(打点済みの状態は失われません)。

React であれば ``useEffect`` 内でこの関数を呼び、クリーンアップで ``unmount()`` を呼びます。
iframe で埋め込むより、状態と物理量を直接やり取りできる点で優れています。
React 用のコード例と、``file:`` 依存に固有の Vite 設定(``resolve.dedupe``)については
``examples/vanilla-host/README.md`` を参照してください。


10.5 レイアウトを自分で組む
--------------------------------------------------

``<StarryDigitizer>`` は 3 カラムの既製レイアウトです。ホストが独自の配置(1画面完結の
エディタなど)を組みたい場合は、\ **個々のパネルを直接配置**\ できます。

.. code-block:: ts

   import {
     createDigitizerContext, provideDigitizerContext,
     provideDigitizerOptions,
     CanvasHeader, CanvasMain, CanvasFooter,
     AxisSetManager, AxisSetSettings, ExtractorSettings, MagnifierMain,
     loadProject, getDatasetValues,
   } from 'starry-digitizer'

   const ctx = createDigitizerContext()
   provideDigitizerContext(ctx)
   provideDigitizerOptions({ datasetNameCandidates: sampleNames })

公開しているパネル: ``CanvasHeader`` / ``CanvasMain`` / ``CanvasFooter`` /
``AxisSetManager`` / ``AxisSetSettings`` / ``DatasetManager`` / ``DataTable`` /
``ExtractorSettings`` / ``ImageSettings`` / ``MaskSettings`` / ``ColorSettings`` /
``MagnifierMain`` / ``ConfirmerBar``。

同じ context を共有するので、どこに置いても状態は同期します。``CanvasMain`` は
canvas 要素の持ち主なので、1 つの context につき 1 つだけ配置してください。

パネルを自前配置するホストは、``<StarryDigitizer>`` を経由しない以上、options を
``provideDigitizerOptions()`` に自分で渡すしかありません。ここには
**変えたい項目だけ** を渡します。``features`` も部分指定でよく、書かなかった項目は
既定値のまま残ります。

.. code-block:: ts

   provideDigitizerOptions({ features: { magnifier: false } })

``DEFAULT_OPTIONS`` を spread して options を組むのはやめてください。``features``
は入れ子なので、``{ ...DEFAULT_OPTIONS, features: { magnifier: false } }`` は
feature セット全体を置き換えてしまい、残り 9 個のフラグ(軸パネル・データセット
パネル・データ表など)が黙って消えます。``DEFAULT_OPTIONS`` は既定値を読むための
ものであって、options を組み立てるためのものではありません。

完全な ``DigitizerOptions`` をホスト自身が手元に持ちたいとき(保存する、他所へ渡す、
比較する)は ``createDigitizerOptions(partial)`` が同じ既定値の埋め方をして完全な
オブジェクトを返します。パネルに渡すだけなら不要です。

setup 後に変わる options(権限確認で決まる ``readonly``\ 、fetch で届く候補名)は、
``ref`` / ``computed`` / ``reactive()`` オブジェクト / getter のいずれでも渡せます。
どれで渡しても、パネル側は ``.value`` なしの ``options.readonly`` を読み、書かれ
なかった項目は既定値で埋まった状態で見えます。``reactive()`` で渡したオブジェクトは
コピーされないので、あとから単一フィールドを代入するとそのままパネルに伝わります。

既製レイアウトのまま差し込み口だけ増やしたい場合は、名前付きスロット
``aside-top`` / ``aside-bottom`` / ``right-sidebar-footer`` / ``footer`` が使えます。

自前配置でもパネルを ``.starry-digitizer`` クラスの要素で包む必要はありません
(各パネルが ``.sd-panel`` を自分で持っています)。ホストの UI をパネルの間に挟んでも
構いません。ラッパを置く意味が残るケースは 10.7 を参照してください。

10.6 高さをホストに合わせる(1画面レイアウト)
--------------------------------------------------

寸法はすべて ``.starry-digitizer`` 上の CSS カスタムプロパティです。内部クラス名を
``:deep()`` で上書きする必要はありません。

.. code-block:: css

   .digitize-pane { height: 100dvh; display: flex; min-height: 0; }
   .digitize-pane .starry-digitizer { --sd-height: 100%; }

``--sd-height: 100%`` を渡すと、コンポーネントは与えられた高さに収まり、余った高さは
キャンバスが使い、各サイドバーは内側でスクロールします。ページに縦スクロールは出ません。

どのプロパティが効くかは、埋め込み方によって変わります。

.. list-table::
   :header-rows: 1

   * - プロパティ
     - 効く範囲
   * - ``--sd-height`` / ``--sd-left-sidebar-*`` / ``--sd-right-sidebar-*`` / ``--sd-main-area-margin``
     - **ルートのレイアウト専用**。``<StarryDigitizer>`` の3カラムを整えるためのもので、
       パネルを自前配置するホストは自分のコンテナを直接指定します
   * - ``--sd-canvas-height`` / ``--sd-canvas-min-height``
     - ``CanvasMain``。どこに置いても効きます
   * - ``--sd-magnifier-size``
     - ``MagnifierMain``。同上
   * - ``--sd-table-max-height`` / ``--sd-axis-list-*`` / ``--sd-dataset-list-*``
     - データテーブル / 軸セット一覧 / データセット一覧の各パネル。同上
   * - テーマトークン(``--sd-primary`` / ``--sd-text`` など)
     - 両方の埋め込み方で効きます

同様に、スロット(``aside-top`` / ``aside-bottom`` / ``right-sidebar-footer`` / ``footer``)と
``features`` のパネル表示フラグ5種(``axisPanel`` / ``datasetPanel`` / ``extractionPanel`` /
``magnifier`` / ``dataTable``)も**ルート専用**です。パネルを自前配置するなら「置かない」で済みます。
ただし「既定レイアウトは使いつつ一部のパネルだけ隠したい」という中間形では引き続き有用です。
``imageUpload`` / ``zipExportImport`` / ``csvExport`` / ``axisOcr`` / ``keyboard*`` は
個々のパネルの挙動を切り替えるフラグなので、どちらの埋め込み方でも効きます。

主なプロパティ: ``--sd-height`` / ``--sd-left-sidebar-width`` / ``--sd-right-sidebar-width``
(および各 ``-min-width`` / ``-max-width``) / ``--sd-main-area-margin`` /
``--sd-canvas-height`` / ``--sd-canvas-min-height`` / ``--sd-table-max-height`` /
``--sd-magnifier-size`` / ``--sd-axis-list-min-height`` / ``--sd-axis-list-max-height`` /
``--sd-dataset-list-min-height`` / ``--sd-dataset-list-max-height``。

各カラムの ``min-width`` の既定値は幅と同じなので、既定のレイアウトは縮みません。
狭いカラムを許すには ``-min-width`` も下げてください。拡大鏡は既定で右カラムの幅に
追従する(``min(100%, 300px)``)ため、右カラムを狭めれば拡大鏡も一緒に狭くなります。

.. code-block:: css

   .starry-digitizer {
     --sd-right-sidebar-width: 200px;  --sd-right-sidebar-min-width: 200px;
     --sd-left-sidebar-width: 210px;   --sd-left-sidebar-min-width: 210px;
     --sd-dataset-list-min-height: 0;  --sd-axis-list-min-height: 0;
   }

``aside-top`` / ``aside-bottom`` / ``right-sidebar-footer`` の各スロットには、
実測したサイドバー幅が ``width`` スロット props として渡されます。

``--sd-canvas-height`` には長さを指定してください(``auto`` は不可)。フィット表示の倍率は
キャンバス枠の実測高さから計算するため、内容依存の高さにすると循環します。

不要なパネルは ``features`` で個別に消せます(``axisPanel`` / ``datasetPanel`` /
``extractionPanel`` / ``magnifier`` / ``dataTable``)。ホスト側に同じ役割の UI がある場合、
二重に見せないために使います。

10.7 ラッパは要らない ── ``.starry-digitizer`` を置くかどうか
------------------------------------------------------------------

配布 CSS のスコープは 2 つあります。

- ``.starry-digitizer`` ── **ホストが自分で書くラッパ**\ 。従来どおり、その配下すべてに
  ライブラリの基準フォント・\ ``box-sizing``\ ・ユーティリティクラス・\ ``h4`` / ``h5``
  の既定が効きます。
- ``.sd-panel`` ── **ライブラリが各パネルのルート要素に自分で付けるクラス**\ 。
  ``starry-digitizer/vue`` からエクスポートされるパネル 13 枚すべてに付いています。

したがって **パネルはラッパが無くても自分でスタイルが当たります**\ 。10.5 のように
パネルを自前配置するとき、\ ``.starry-digitizer`` の要素を書く必要はもうありません。
以前は「領域ごとにラッパを開き閉じし、ホストの UI はその外に出す」というレイアウトの
制約がありましたが、これは無くなりました。\ **ライブラリのパネルとホストの UI を交互に
積んで構いません**\ 。

置き方は実質 3 通りです。

.. code-block:: html

   <!-- A: ラッパはライブラリのパネルだけを包み、ホストの UI はその外 -->
   <div class="host-toolbar">ホストの UI</div>
   <div class="starry-digitizer"><!-- AxisSetManager / CanvasMain / ... --></div>

   <!-- B: ラッパを置かない(パネルとホストの UI を交互に積める) -->
   <div class="host-toolbar">ホストの UI</div>
   <!-- AxisSetManager -->
   <div class="host-unit-selector">ホストの UI</div>
   <!-- CanvasMain / ... -->

   <!-- C: ホストの UI までラッパの中に入れる -->
   <div class="starry-digitizer">
     <div class="host-toolbar">ホストの UI</div>
     <!-- AxisSetManager / CanvasMain / ... -->
   </div>

実測値(Chromium 実機、ヘッドレス。ビューポート 1400x1200 で ``AxisSetManager`` /
``ExtractorSettings`` / ``DatasetManager`` の 3 枚を幅 320px の列に実際にマウントし、
``getComputedStyle`` を読んだ値。ホスト側の地の文は ``font-family: system-ui`` /
``font-size: 16px``\ 、``line-height`` は未指定。ホスト側には ``.d-flex { display: block }``
という同名クラスを詳細度 (0,1,0) で置いてあります)。

.. list-table::
   :header-rows: 1
   :widths: 26 25 25 24

   * - 測った項目
     - A
     - B
     - C
   * - ``--sd-primary`` の解決値
     - ``#1e88e5``
     - ``#1e88e5``
     - ``#1e88e5``
   * - ホストが ``:root`` で色を上書き
     - 効く
     - 効く
     - 効く
   * - ホストが ``.starry-digitizer`` で色を上書き
     - 効く
     - **効かない**\ (付ける要素が無い)
     - 効く
   * - パネルの基準フォント(トークン未指定)
     - 16px / system-ui(ホストの地の文)
     - 16px / system-ui(同じ)
     - 16px / system-ui(同じ)
   * - パネルの ``color`` / ``box-sizing``
     - ``rgba(0, 0, 0, 0.87)`` / ``border-box``
     - ``rgba(0, 0, 0, 0.87)`` / ``border-box``\ (同じ)
     - ``rgba(0, 0, 0, 0.87)`` / ``border-box``\ (同じ)
   * - パネルの ``<h4>``\ (トークン未指定)
     - ``17.6px`` / 600 / margin ``10px 0 4px``
     - 同じ
     - 同じ
   * - パネル内の ``.d-flex``
     - ``flex``
     - ``flex``\ (同じ)
     - ``flex``\ (同じ)
   * - パネル 3 枚の合計高さ(トークン未指定)
     - 630.0px (121.0 / 304.0 / 205.0)
     - **630.0px(A と完全一致)**
     - 630.0px(同じ)
   * - ``--sd-font-size`` などの反映先
     - パネルだけ
     - **``.starry-digitizer`` に書いた分は当たらない**\ (書く要素が無い)
     - パネル + 中に入れたホスト UI
   * - パネル 3 枚の合計高さ(``.starry-digitizer`` に 14px / Roboto を指定)
     - 636.1px
     - 630.0px(変わらず)
     - 636.1px
   * - 同上、\ **ホスト自身の要素**\ に 14px / Roboto を指定
     - 636.1px
     - **636.1px(A と一致)**
     - 636.1px
   * - ホスト領域のフォント(14px / Roboto を指定)
     - 16px / system-ui のまま
     - 16px / system-ui のまま
     - **14px / Roboto に化ける**
   * - ホスト領域の ``<h4>``
     - ブラウザ既定のまま(``16px`` / 700 / ``21.28px 0``)
     - ブラウザ既定のまま
     - **ライブラリの値に化ける**\ (``17.6px`` / 600 / ``10px 0 4px``)
   * - ホスト領域の ``.d-flex``\ (ホスト自身が ``block`` と定義)
     - ``block`` のまま
     - ``block`` のまま
     - **``flex`` に化ける**

**A と B は同じものを描きます。** パネルの ``color`` / ``box-sizing`` / ``h4`` /
ユーティリティ、そして 3 枚の合計高さまで 1px も違いません。差は 1 点だけで、
``.starry-digitizer { --sd-primary: … }`` のような **テーマ上書きを書く要素があるかどうか**
です。B ではその宣言だけが黙って無視されます(``:root`` に書いた上書きは効くので、
「テーマ上書きが効かないときがある」という形で表面化します)。

**どちらを選ぶか。** 上書きを書く場所が要るなら A、要らないなら B です。B のままでも、
カスタムプロパティは継承するので **ホスト自身の要素に書けば同じことができます**\ 。
上の実測でも、B のホスト側コンテナに 14px / Roboto を書けば A と同じ 636.1px になりました。

.. code-block:: css

   /* B でテーマとタイポグラフィを指定する。要素はホスト自身のもので構わない */
   .my-digitize-pane {
     --sd-primary: #1e3a5f;
     --sd-font: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
     --sd-font-size: 14px;
     --sd-line-height: 1.4;
   }

ただし 10.6 のレイアウト変数(``--sd-height`` / ``--sd-*-sidebar-*`` など)は
``<StarryDigitizer>`` の 3 列レイアウトを寸法するものなので、自前配置ではそもそも
使いません。パネル自身が読む ``--sd-canvas-*`` / ``--sd-magnifier-size`` /
``--sd-table-max-height`` などは、そのパネルの祖先ならどこに書いても効きます。

**C の落とし穴**\ (これは変わっていません): ラッパの中に入れたホストの UI にも、
ライブラリの ``h4`` / ``h5`` 既定とユーティリティが当たります。上の実測では、
トークンを何も指定していなくても、ホスト側の ``<h4>`` の margin が ``21.28px 0`` から
``10px 0 4px`` に(``font-size`` も 16px から 17.6px に)、ホスト側が ``block`` と定義した
``.d-flex`` が ``flex`` に変わりました。さらに
``.starry-digitizer { --sd-font-size: 14px }`` のようにタイポグラフィを指定すると、
その宣言はラッパ配下すべてに効くので、C ではホストの UI も一緒にそのサイズになります
(実測では 16px / system-ui から 14px / Roboto に化けました)。
**ホストの UI をライブラリのパネルと混ぜたいなら、C ではなく B を選んでください**\ 。
B なら混ぜてもライブラリの CSS はパネルの中(``.sd-panel`` 配下)から出ません。

この線引きは意図的です。色や書体のようなテーマトークンはページ全体で 1 組あればよいので
``:where(:root)`` に置き(``:where()`` で詳細度が 0 になるため、ホストの ``:root`` でも
``.starry-digitizer`` でも必ずホスト側が勝ちます)、パネルを複数の領域に分けて配置しても
同じ 16 個を重複定義せずに済みます。一方、ユーティリティクラスと ``h4`` / ``h5`` の既定は
グローバルに撒くとホストの CSS と衝突するため、\ ``.starry-digitizer`` / ``.sd-panel``
配下のままにしてあります。\ ``.sd-panel`` はそれをホストに書かせず、ライブラリが自分の
ルート要素にだけ付けることで、\ **崩れる範囲をパネルの中に閉じた**\ ものです。

10.8 書体はホストから継承する
--------------------------------------------------

タイポグラフィのトークンは 3 つあり、\ **既定値はいずれも** ``inherit`` **です**\ 。

.. list-table::
   :header-rows: 1
   :widths: 30 16 54

   * - トークン
     - 既定値
     - ``.starry-digitizer`` での適用先
   * - ``--sd-font``
     - ``inherit``
     - ``font-family``
   * - ``--sd-font-size``
     - ``inherit``
     - ``font-size``
   * - ``--sd-line-height``
     - ``inherit``
     - ``line-height``

つまり何も指定しなければ、ライブラリはホストのページが既に使っている書体・文字サイズ・
行送りをそのまま使います。ライブラリ独自の書体は持ち込みません。

**なぜそうしたか**\ : ライブラリは他のアプリの中に埋め込まれます。ある領域だけ書体が
変わっていると、読むより先に「ここだけ別のアプリが貼り付けてある」と見た目で分かって
しまいます。継承にすればその継ぎ目が消えます。配色にはこの問題がない(ホストが選ぶのが
当然)ため、``inherit`` 既定にしたのはこの 3 つだけです。

特定の見た目にしたいホストは、他のトークンと同じように指定します。

.. code-block:: css

   .starry-digitizer {
     --sd-font: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
     --sd-font-size: 14px;
     --sd-line-height: 1.4;
   }

スタンドアロンアプリ自身がこれをしています(``src/app-style.css``)。従来どおりの
Roboto / 14px / 1.4 の見た目は、こうして固定した結果です。

付随する性質が 2 つあります。

- **ライブラリ内部のサイズはすべて相対値です。** 相対的な文字サイズはすべて ``em`` で
  書かれており、``rem`` はビルド後の ``style.css`` に 1 つも残っていません。``rem`` は
  ホストページの ``<html>`` に対して解決されてしまうため、継承した基準サイズと噛み合わない
  からです。``em`` なのでシート全体が基準サイズに合わせて一体で拡縮します。
- **ダイアログとスナックバーは** ``<body>`` **の書体を継ぎます。** ``SdDialog`` と
  ``SdSnackbar`` は ``<body>`` 直下へ teleport されます。teleport 先のルート要素も
  ``.starry-digitizer`` クラスを持つのでトークンとユーティリティは効きますが、
  ``--sd-font-size`` が ``inherit`` である以上、継ぐのは **パネルを置いたコンテナでは
  なく** ``<body>`` の書体です。``body { font-size: 18px }`` のホストでは、ダイアログの
  タイトル(``1.25em``)は 22.5px になります。タイポグラフィを ``body`` や ``:root``
  ではなく自分のラッパ要素だけに設定しているホストでは、\ **ダイアログだけが** ``body``
  **のサイズに落ちます**\ 。teleport 先が ``body`` である以上避けにくいので、回避策は
  ``body`` / ``:root`` 側に設定するか、``--sd-font-size`` を明示的に指定するかです。

10.9 ``starry-digitizer/core`` — Vue に依存しないエンジン
------------------------------------------------------------

この章の冒頭で示した薄いラッパーは、「Vue アプリを 1 つマウントして既製の UI をそのまま
使う」方法でした。UI もホスト側で描きたい場合は、``starry-digitizer/core`` を直接使います。
状態・操作・DTO だけが入っており、\ **Vue のレンダラには依存しません**\ 。

これは規約ではなく機械的に検査されています。``scripts/lib-check.mjs`` がビルド後の
``core.js`` / ``core.cjs`` とそこから辿れる全モジュールを走査し、``vue`` / ``vue/*`` /
``@vue/runtime-*`` の import が 1 つでもあればビルドを失敗させます
(``npm run lib-build`` が毎回 ``lib-check`` を実行します)。

- **変更通知は** ``@vue/reactivity`` **です。** core から ``effect`` / ``computed`` /
  ``ref`` / ``stop`` / ``reactive`` / ``readonly`` / ``effectScope`` と各種ガード
  (``isReactive`` / ``isRef`` / ``unref`` / ``toRaw`` / ``markRaw``)を再エクスポート
  しているので、ホストが直接 import する必要はありません。``watch`` は再エクスポート
  していません(``@vue/reactivity`` に入ったのは Vue 3.5 からで、対応 peer 範囲は 3.3
  からのため)。
- **ブラウザ必須です。** DOM ツリーは要りません(canvas はホストが渡します)が、
  2D canvas コンテキストと画像デコーダが要るため、Node パッケージではありません。
- **``attachCanvases()`` は ``applyImage()`` より先に、かつラッパにサイズを与えてください。**
  フィット表示の倍率はラッパの実測サイズから決まるため、ラッパがまだ 0px の状態
  (flex に高さを任せている場合の最初の 1 フレーム。組み込み時にはむしろ普通に起きます)
  で画像を渡すと、その時点ではフィットできません。\ **しかもエラーになりません**\ ——
  Promise は解決し、``originalWidth`` / ``originalHeight`` も正しく、canvas だけが
  真っ白になります。この後始末はエンジン側で行います。``attachCanvases()`` に渡された
  ラッパを監視し、レイアウトが決まった時点でフィットをやり直すので、\ **ホストが
  ``ResizeObserver`` を用意する必要はありません**\ 。倍率がまだ確定していないことは
  ``canvasHandler.hasPendingFitSize`` で分かります(自前でオーバーレイを描くホスト用)。
  監視は ``detachCanvases(['wrapper'])`` で解除されます。
- **フィットは枠に追従し、ユーザーが選んだ拡大率は追従しません。** 同じ observer が、
  フィット成功後に **枠だけ** が変わった場合(左右分割表示に切り替える、ウィンドウを
  1920px → 1440px に縮める)にもフィットをやり直します。古い倍率のまま右側が切れる
  ことはありません。現在の倍率がフィットによるものかどうかは
  ``canvasHandler.isFittedToFrame`` で分かります(拡大率表示を「Fit」にするなど)。
  ユーザーが選んだ拡大率(``scaleUp`` / ``scaleDown`` / ``drawOriginalSizeImage``)は
  フィットモードを抜けるので、以降レイアウト変化で上書きされることはありません。
  ``drawFitSizeImage()`` を呼べばフィットモードに戻ります。
- **縮小は 10% で静かに止まります。** 下限に達した ``scaleDown()`` は例外を投げず
  何もしません(ボタンに直結できます)。ボタンを無効化したい場合は
  ``canvasHandler.canScaleDown`` を ``:disabled`` に繋いでください。
- **パネルは Vue 専用です。** ``ExtractorSettings`` / ``AxisSetManager`` などは
  ``starry-digitizer/vue`` にしか入っておらず、React 版・Svelte 版はありません。
  React のホストは core と自前の canvas / UI を組み合わせます。
- モードは再エクスポートされた定数で指定してください(``MANUAL_MODE`` / ``MASK_MODE`` /
  ``POINT_MODE``)。``STYLE`` は組み込みの canvas レイヤが使うマーカーの寸法・不透明度で、
  自前でオーバーレイを描くときに見た目を合わせるために使えます。

``effect`` は「その関数が読んだものだけ」を追跡する
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

ここが一番の落とし穴です。``effect(fn)`` は ``fn`` を即座に 1 回実行し、\ **その実行中に
実際に読まれた** リアクティブなプロパティを記録して、それらが変わったときだけ ``fn`` を
再実行します。「context のどこかが変われば通知」ではありません。コールバックが読んで
いないプロパティは、購読していないプロパティです。

.. code-block:: ts

   // 点や軸が変われば再実行される(getDatasetValues() がそれらを読むため)
   const runner = effect(() => render(getDatasetValues(ctx)))

   // 何が起きても再実行されない(読み取りが effect の外で済んでいる)
   const values = getDatasetValues(ctx)
   effect(() => render(values))

反応させたい値は必ず effect の **中で** 読んでください。初回実行で ``false`` だった
``if`` の内側での読み取りも購読されません。逆に effect は狭く保つほど、無関係な状態変化
で再実行されなくなります。

依存関係は実行のたびに **作り直されます**\ 。``ctx.datasetRepository.activeDataset``
を読むエフェクトはアクティブなデータセットを追従し、切り替えると次の実行で新しい方を
購読して古い方は外れます。

購読の解除は ``stop(runner)`` です。``effect()`` が返す runner は「呼ぶと再実行する」
ものなので、``runner()`` では解除になりません。ホストのアンマウント時に必ず停止するか、
``effectScope()`` でまとめて停止してください。

エフェクトは同期的に、変更 1 回につき 1 回走ります。重い処理はエフェクトの中で
デバウンスしてください(コンポーネントの ``update:project`` を 300ms デバウンス
しているのも同じ理由です)。2 つの状態を変える操作ではエフェクトが 2 回走ります——
途中状態が壊れているわけではありませんが、毎回保存するホストは 2 回書きに行きます。

React へのつなぎ込み(``useSyncExternalStore``)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

``effect`` は ``useSyncExternalStore`` が要求する 2 つ、すなわち「解除関数を返す
subscribe」と「スナップショットの getter」に素直に対応します。``effect()`` の初回実行は
``subscribe`` の中で同期的に起きるので、その 1 回は読み飛ばします。解除は
``stop(runner)`` です(``effect()`` が返すのは呼ぶと再実行される runner なので、
``runner()`` は解除になりません)。

.. code-block:: ts

   import { useCallback, useMemo, useSyncExternalStore } from 'react'
   import {
     effect, stop, getDatasetValues,
     type DigitizerContext, type DatasetValues,
   } from 'starry-digitizer/core'

   function useDatasetValues(ctx: DigitizerContext): DatasetValues[] {
     const read = useCallback(
       () =>
         getDatasetValues(ctx),
       [ctx],
     )

     const subscribe = useCallback(
       (onStoreChange: () => void) => {
         let first = true
         // read() を effect の中で呼ぶ。この読み取りが購読になる。
         const runner = effect(() => {
           read()
           if (first) { first = false; return }
           onStoreChange()
         })
         return () => stop(runner)
       },
       [read],
     )

     // getSnapshot は変化が無い間は同じ値を返す必要があるので、
     // 上の effect が動いたときだけ差し替える。
     const cache = useMemo(() => ({ value: read() }), [read])
     return useSyncExternalStore(
       (onStoreChange) =>
         subscribe(() => { cache.value = read(); onStoreChange() }),
       () => cache.value,
     )
   }

同じ形が単一の値(``ctx.historyManager.canUndo`` / ``ctx.canvasHandler.scale`` /
``ctx.datasetRepository.activeDataset.id`` など)にもそのまま使えます。ただし
「いま capture が起きた」は値ではなくイベントなので、そちらは
``ctx.historyManager.subscribe()`` を使ってください(12. を参照)。


11. キーボードショートカットの範囲
========================================

**リスナーは document ではなくインスタンスの canvas 枠に付いています**\ 。
``CanvasMain`` が自分の canvas 枠(``[data-cy=canvas-wrapper]``)に ``keydown`` を
バインドするため、キーは 1 つのデジタイザにだけ届きます。効くのは次の 2 つの場合です。

- **枠にフォーカスがあるとき。** 枠は ``tabindex="0"`` を持つのでタブ順に入り、
  マウス無しでも到達できます。canvas をクリックしてもフォーカスは入ります。
  フォーカスリングは ``:focus-visible`` のときだけ描かれます。クリックのたびに画像の
  周りにリングが出るのはノイズですが、Tab で来たときは「キーがデジタイザに行くように
  なった」ことを示す唯一の手がかりだからです。
- **または、ポインタが枠の上にあるとき。** フォーカスだけを条件にすると、開いた直後の
  ページで ``+`` / ``-`` / ``0`` が効かなくなり、スタンドアロンアプリの退行になります。
  そこでポインタが枠の内側にある **あいだだけ** ``document`` にもう 1 つリスナーを
  張っています。これはマウスが既に従っている「他ではなくこのインスタンス」と同じ規則
  です。ポインタを外せばホストのページにキーが戻ります。フォーカスとホバーが同時でも
  処理は 1 回だけです。

.. list-table::
   :header-rows: 1
   :widths: 32 34 34

   * - キー
     - 動作
     - 条件
   * - ``⌘Z`` / ``Ctrl+Z``、``⇧⌘Z`` / ``Ctrl+Shift+Z``
     - Undo / Redo
     - ``features.keyboardHistory``\ 。``readonly`` では無効
   * - ``⌘S`` / ``⌘O``\ (``Ctrl`` も可)
     - プロジェクト ZIP の保存 / 読み込み
     - ``features.keyboardFile`` と ``features.zipExportImport``\ 。``⌘S`` は
       ``readonly`` でも使えますが、状態を上書きする ``⌘O`` は無効
   * - ``+`` / ``=``、``-``、``0``、``f``
     - 拡大 / 縮小 / 等倍 / フィット
     - ``features.keyboardEditing``\ (修飾キー無し。``⌘+`` 等はブラウザの
       ページズームで上書きできないため)
   * - ``a`` / ``e`` / ``d``
     - 手動モード(追加 / 編集 / 削除)
     - ``features.keyboardEditing``\ 。``readonly`` と View All では無効
   * - ``⌘A`` / ``Ctrl+A``
     - アクティブなデータセットの全点を選択
     - ``features.keyboardEditing``\ 。``readonly`` と View All では無効
   * - ``Escape``
     - 選択解除
     - ``features.keyboardEditing``\ 。``readonly`` と View All では無効
   * - ``Backspace`` / ``Delete``
     - 選択中の点を削除
     - ``features.keyboardEditing``\ 。``readonly`` と View All では無効
   * - ``↑`` ``↓`` ``←`` ``→``
     - 選択中の点を 1px 移動(``Shift`` で 10px)
     - ``features.keyboardEditing``\ 。``readonly`` と View All では無効

**入力欄の中では手を出しません。** イベントの対象が ``<input>`` / ``<textarea>`` /
``contentEditable`` の要素のときは、どのショートカットも動きません。そこでの ``⌘Z`` は
従来どおりブラウザ標準の文字単位の取り消しです。軸の値を打ち間違えたユーザーは、
点を失うのではなく文字が戻ります。

.. _keyboard-groups:

11.1 グループ単位で切る
--------------------------------------------------

``features`` の ``keyboardShortcuts`` を ``false`` にすると、リスナーは登録されず
``tabindex`` も付かなくなります(枠はタブ順から外れます)。デジタイザの中の何もキーを
拾わず ``preventDefault()`` も呼びません。

ただし、たいていのホストにはこれは切りすぎです。キーは
「\ **このキーの持ち主はページに 1 人しか居られないか**\ 」という 1 つの問いで
2 つに分かれます。

- ``⌘Z`` / ``⇧⌘Z``\ (``keyboardHistory``)と ``⌘S`` / ``⌘O``\ (``keyboardFile``)は
  ページ全体に意味を持つキーです。リスナーが 2 つあると 1 回の意図が 2 回効きます。
  デジタイザ側のリスナーが ``historyManager.undo()`` を直接呼び、ホスト側のリスナーも
  自分の印を pop して ``undo()`` を呼ぶからです。
- それ以外(``keyboardEditing``)は、\ **キャンバス枠にフォーカスかポインタがあるとき
  だけ** 効きます。ホストのキーとは初めから衝突しません。

そこで ``keyboardShortcuts`` は **3 つのグループの既定値** になりました。優先順位は
グループごとに次の通りです。

1. ``keyboardHistory`` / ``keyboardFile`` / ``keyboardEditing`` を明示していれば、それが勝つ
2. なければ ``keyboardShortcuts``
3. それもなければ ``true``

つまり ``{}`` なら全部有効、\ ``{ keyboardShortcuts: false }`` なら全部無効(従来どおり)、
そして次が **組み込み時の標準構成**\ ――\ ``⌘Z`` はホストが持ち、編集キーはライブラリに
任せる形です。

.. code-block:: vue

   <StarryDigitizer
     ref="digitizer"
     :features="{ keyboardShortcuts: false, keyboardEditing: true }"
     @history-change="onHistoryChange"
   />

``⌘Z`` / ``⌘S`` / ``⌘O`` はデジタイザを素通りします(拾わないし
``preventDefault()`` もしない)。見るのはホストのリスナーだけなので、1 回押せば 1 回
戻ります。一方で矢印キーの微調整・``Backspace`` / ``Delete``・``Escape``・``⌘A``・
ズーム・モード切替はライブラリ側に残ります。capture を置く位置(移動は「群の最初」、
削除は「変更の場所」)や ``KeyboardEvent.repeat`` による束ね(12. 参照)といった
難所を、ホストに写経させずに済みます。編集キーはフォーカス経由でも届くので、この構成でも
``tabindex`` は付いたままです。

``keyboardShortcuts: false`` を単独で使うのは、ホストが本当に **すべての操作** を自分で
駆動する場合だけにしてください。そのときは編集キーも自前で実装することになります。
``⌘Z`` の側の作り方は次節です。


12. Undo をホスト側で 1 本にまとめる
========================================

デジタイザの隣でホスト自身の入力欄(サンプル名・単位・コメントなど)も編集できる画面では、
**Undo のスタックが 2 本** あります。ホスト自身のものと、デジタイザのものです。どちらも
``⌘Z`` に反応するため、\ **直前にどこをクリックしたかで** ``⌘Z`` **の結果が変わります**\ 。
ある場所ではデジタイザの打点が取り消され、数センチ隣ではホストの編集が取り消される、
という状態です。ここでは 2 本を 1 本にまとめます。

**1. ⌘Z の所有者を 1 つにする。**

.. code-block:: vue

   <StarryDigitizer
     ref="digitizer"
     :features="{ keyboardShortcuts: false, keyboardEditing: true }"
     @history-change="onHistoryChange"
   />

効いているのは ``keyboardHistory``\ (``keyboardShortcuts: false`` を引き継いで off)
です。デジタイザは ``⌘Z`` を拾わず ``preventDefault()`` も呼ばないので、\ ``⌘Z`` を
見るのはホストのハンドラだけになります。``keyboardEditing: true`` は矢印キー・
``Delete``・ズーム・モード切替をライブラリ側に残すためのものです(:ref:`keyboard-groups`)。
ホストが編集キーまで自分で実装するつもりなら、``keyboardShortcuts: false`` だけでも
構いません。

**2. デジタイザ側の capture をホストのスタックに記録する。**

.. code-block:: ts

   type HostEntry = { kind: 'digitizer' } | { kind: 'host'; undo: () => void }

   const undoStack: HostEntry[] = []
   let redoStack: HostEntry[] = []

   function onHistoryChange(change: HistoryChange) {
     switch (change.type) {
       case 'capture':
         // ユーザーがデジタイザ側で取り消せる操作をした。印を積み、
         // ホスト自身の編集と同じように redo スタックを捨てる。
         undoStack.push({ kind: 'digitizer' })
         redoStack = []
         break
       case 'undo':
       case 'redo':
         // 自分が呼んだ結果が返ってきているだけ。ここで積むと、いま実行した
         // undo に対する項目が増えてしまい、永久に戻れなくなる。
         break
       case 'clear':
         // プロジェクト読み込みや reset()。デジタイザ側のスナップショットが
         // 消えたので、それを指す印も意味を失う。
         undoStack.length = 0
         redoStack = []
         break
     }
   }

**3. スタックの先頭が誰のものかで ⌘Z を振り分ける。**

.. code-block:: ts

   function onUndo() {
     const entry = undoStack.pop()
     if (!entry) return
     if (entry.kind === 'host') {
       entry.undo()
       redoStack.push(entry)
       return
     }
     // デジタイザ内部のスタックは 50 件が上限なので、印がスナップショットより
     // 長生きすることがある。その場合は印だけ捨てて終わる。ユーザーが指示して
     // いないホスト側の項目まで巻き込んで取り消してはいけない。
     if (!digitizer.value!.canUndo) return
     digitizer.value!.undo()
     redoStack.push(entry)
   }

外すとそのままバグになる点を、あらためて並べます。

- **積むのは** ``'capture'`` **だけです。** ``'undo'`` / ``'redo'`` は自分の呼び出しの
  こだまです。
- ``'clear'`` **ではホストのスタックも捨てます。** プロジェクト読み込みと ``reset()``
  で届き、しかも実際に履歴があったときにしか届きません(通知が来た = 状態が動いた)。
- **印が残っていても** ``canUndo`` **が** ``false`` **のことがあります。** 内部スタックの
  上限は 50 件で、古いものは黙って捨てられます。
- ``history-change`` **は同期で届きます。** スタックを動かした処理の内側から呼ばれるので、
  ハンドラの中でデジタイザの状態を書き換えないでください。マネージャに再入し、また通知が
  飛びます。記録だけして抜け、書き戻しは自分のイベントループの回で行ってください。
- リスナーが例外を投げても握りつぶされて ``console.error`` に出るだけで、ユーザーの
  Undo は壊れません。記録側のバグは記録側で止まります。

**パネルを自前配置しているホスト** にはイベントを出すコンポーネントがないので、マネージャを
直接使います。中身は同じイベントです。

.. code-block:: ts

   const unsubscribe = ctx.historyManager.subscribe((change) => { /* 上と同じ */ })
   // ctx.historyManager.undo() / .redo() / .canUndo / .canRedo

``subscribe()`` は解除関数を返します。``<StarryDigitizer>`` が ``history-change`` を
emit するのに使っているのもこれです。``canUndo`` は状態ですが「いま capture が起きた」は
イベントである、というのがこの API がある理由です。capture が 2 回続いても ``canUndo``
は ``true`` のままで、リアクティブな watcher なら 2 回を 1 回にまとめてしまいます。
ホストのスタックは capture 1 回につき 1 項目を積む必要があります。

**何が 1 エントリになるか**

上のレシピは「ユーザーの 1 操作 = ``'capture'`` 1 回」に依存しています。以下の 2 つの表で
**全てです**。3 つ目の表はありません。ドメインモデルとリポジトリ(``Dataset`` /
``Axis`` / ``AxisSet`` / ``DatasetRepository`` / ``AxisSetRepository``)の
**状態を変えるメソッドとプロパティ代入を全件洗い出し**、``src/presentation/**`` と
``src/application/**`` の呼び出し元と突き合わせた結果です(目視の抜き取りではありません)。
「この操作は ⌘Z で戻るのか」をホスト側で調べ直す必要はありません。

2 つ目の表が 1 つ目と同じくらい重要な理由: capture しない破壊的操作は「戻せない」だけでは
済みません。\ **⌘Z は押せてしまい、その 1 つ前の操作を取り消します**\ 。しかも
**取り消された当人には、自分が何を失ったのか分かりません**\ 。そのため
「エクスポートされる値が変わるもの」は全て 1 つ目の表に入れてあります。2 つ目の表は
表示状態だけで、失うものがありません。

**capture する(Undo で戻る)**

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - ユーザーの操作
     - エントリ数
   * - プロットを打つ、軸座標を置く
     - それぞれ 1
   * - プロットを消す(DELETE モードのクリック / 選択中に Backspace・Delete)
     - それぞれ 1
   * - 矢印キーでプロットや軸マーカーを動かす
     - **打鍵 1 回につき 1**。押しっぱなしは、キーリピートの回数によらず 1
   * - 補間の確定(Confirm)
     - 1
   * - 補間を **OFF** にする(手動追加点を別 id で作り直すため)
     - 1
   * - 自動抽出(Run)
     - 1
   * - データセットの追加 / 削除 / 全削除 / 中身のクリア
     - それぞれ 1
   * - 軸セットの追加 / 削除
     - それぞれ 1。削除時の「他データセットの繋ぎ替え」も同じ 1 件に含まれる
   * - XY Axes リストの別の行をクリックする(\ **アクティブなデータセット**\ の
       ``axisSetId`` を書き換える)
     - 1
   * - "Clear XY Axes"(軸座標の破棄)
     - 1
   * - "Auto-fill values (OCR)"
     - 軸ごとではなく、**バッチ全体で 1**
   * - X / Y の log スケール切り替え
     - それぞれ 1
   * - "Consider graph tilt"
     - 1
   * - キャリブレーションモード(2 Points / 4 Points)の切り替え
     - 1

**意図的に capture しない**

.. list-table::
   :header-rows: 1
   :widths: 45 55

   * - ユーザーの操作
     - エントリを積まない理由
   * - プロットの選択・選択解除(クリック、⌘ クリック、範囲ドラッグ、Escape、⌘A)、
       軸マーカーのクリック
     - 選択はデータではないので、選択しただけでは積みません。(Undo はスナップショット
       時点の選択も\ *復元*\ するので、``⌘Z`` の直後も矢印キーで続けて微調整できます。)
   * - データセットの切り替え、View All
     - 同じく選択です。XY Axes リストと違い、データセット行のクリックは何も書き換えません。
   * - ズーム、モード(Add / Edit / Delete)、マスクツール、マスクの描画
     - 表示・ツールの状態で、``ProjectDTO`` に入りません。
   * - 補間を **ON** にする、補間の Interval の変更
     - 変わるのは ``tempPoints`` だけで、スナップショットは保持していません。ここで積むと
       「押しても何も起きない ⌘Z」を 1 回ぶん増やすだけになります。
   * - "Show axes marker"
     - 軸マーカーの描画の有無だけで、エクスポートされる値は変わりません。
   * - データセット名 / 軸セット名 / 軸の値(x1・x2・y1・y2)の入力
     - 1 文字ずつのテキスト入力です。1 打鍵ごとに capture すると文字数ぶんエントリが積まれます。
       入力欄にフォーカスがある間の ``⌘Z`` は\ **ブラウザ標準の文字取り消し**\ で、
       利用者の期待もそちらです。値自体は ``ProjectDTO`` に入っているので、後の Undo が
       そこを跨げば一緒に戻ります。
   * - 抽出設定(アルゴリズム・色・距離 %)、拡大鏡の設定、有効数字
     - ツールの設定であってプロジェクトデータではありません。
   * - プロジェクトの読み込み、画像の差し替え、``reset()``
     - capture ではなく ``clear()`` します(前の図のスナップショットは意味を失うため)。
       ``type: 'clear'`` として通知されます。

矢印キーの行について、報告が来たときのために 2 点だけ:

- 抑制の判定は ``KeyboardEvent.repeat`` です。スナップショットは**押し始め**で積まれ、
  キーリピートはその 1 件に乗ります。したがって ``history-change`` が届くのは
  **移動が始まった瞬間**で、キーを離した時ではありません。3 回叩けば 3 エントリのままです。
  一部の環境(Linux/X11 の一部構成、古いブラウザ)は ``repeat`` を立てないため、
  そこでは「1 打鍵 = 1 エントリ」に劣化します(この変更前と同じ挙動で、履歴は壊れません)。
- Undo はプロットと軸に加えて**選択状態も戻します**。``⌘Z`` の直後もそのまま矢印キーで
  同じ点を微調整できます。選択そのものは capture 点ではなく(上の 2 つ目の表)、
  スナップショットに相乗りしているだけです。


13. 制約
========================================

- 同一ページに複数の ``<StarryDigitizer>`` を置くこと自体は可能になりました。
  canvas 要素はコンポーネントから明示的に engine へ渡されるようになったため、
  各インスタンスは自分の canvas に描画し、データセットも拡大鏡も独立しています
  (``cypress/e2e/host-app/spec.multi-instance.cy.ts`` で検証)。キーボード
  ショートカットも canvas 枠にバインドされるようになったのでインスタンスごとです
  (11. を参照)。
  ただし **画像のペーストは今も** ``document`` **レベル** で、
  ``features.imageUpload`` が有効な **すべての** インスタンスに読み込まれます。
  ホストが画像を渡す構成では ``imageUpload`` の既定が ``false`` になるため、
  パネルごとリスナーも無くなります。
  また canvas の ``id``(``#imageCanvas`` など)は固定のままで DOM 上は重複します。
  ライブラリ内部は id 解決をしなくなりましたが、ホスト側のセレクタでも
  id に依存しないでください。
- UMD ビルドは提供していません(ESM / CommonJS のみ)。
- 未校正の軸を持つデータセットの ``getDatasetValues()`` は ``NaN``(JSON では ``null``)を返します。


14. 動作を確認できる最小構成
========================================

リポジトリの ``examples/host-app`` に、Vue 3 の最小ホストがあります。
props / events / メソッドが一通り動くことを Cypress で検証しており、組み込みの雛形として
そのまま流用できます。

``examples/vanilla-host`` は同じことをフレームワークなし(素の TypeScript + Vite)で
行う例で、10. のマウントラッパーの実装そのものです。こちらも Cypress で検証しています。

.. code-block:: sh

   # examples/host-app
   npm run dev &                      # http://localhost:5174
   CYPRESS_HOST_APP=1 npx cypress run

   # examples/vanilla-host
   npm run dev &                      # http://localhost:5175
   CYPRESS_VANILLA_HOST=1 npx cypress run
