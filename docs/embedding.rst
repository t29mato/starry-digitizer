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

peerDependency は ``vue``\ (^3.3)だけです。UI フレームワーク(Vuetify 等)やアイコンフォントは
**不要** で、コンポーネントは自前の最小 UI(素の Vue + scoped CSS、インライン SVG アイコン)を持ちます。
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
全ルールは ``.starry-digitizer`` 配下にスコープされ、ホストのグローバル CSS と衝突しません。
配色は CSS カスタムプロパティで上書きできます。

.. code-block:: css

   .starry-digitizer { --sd-primary: #1e3a5f; }


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
     provideDigitizerOptions, DEFAULT_OPTIONS,
     CanvasHeader, CanvasMain, CanvasFooter,
     AxisSetManager, AxisSetSettings, ExtractorSettings, MagnifierMain,
     loadProject, getDatasetValues,
   } from 'starry-digitizer'

   const ctx = createDigitizerContext()
   provideDigitizerContext(ctx)
   provideDigitizerOptions({ ...DEFAULT_OPTIONS, datasetNameCandidates: sampleNames })

公開しているパネル: ``CanvasHeader`` / ``CanvasMain`` / ``CanvasFooter`` /
``AxisSetManager`` / ``AxisSetSettings`` / ``DatasetManager`` / ``DataTable`` /
``ExtractorSettings`` / ``ImageSettings`` / ``MaskSettings`` / ``ColorSettings`` /
``MagnifierMain`` / ``ConfirmerBar``。

同じ context を共有するので、どこに置いても状態は同期します。``CanvasMain`` は
canvas 要素の持ち主なので、1 つの context につき 1 つだけ配置してください。

既製レイアウトのまま差し込み口だけ増やしたい場合は、名前付きスロット
``aside-top`` / ``aside-bottom`` / ``right-sidebar-footer`` / ``footer`` が使えます。

10.6 高さをホストに合わせる(1画面レイアウト)
--------------------------------------------------

寸法はすべて ``.starry-digitizer`` 上の CSS カスタムプロパティです。内部クラス名を
``:deep()`` で上書きする必要はありません。

.. code-block:: css

   .digitize-pane { height: 100dvh; display: flex; min-height: 0; }
   .digitize-pane .starry-digitizer { --sd-height: 100%; }

``--sd-height: 100%`` を渡すと、コンポーネントは与えられた高さに収まり、余った高さは
キャンバスが使い、各サイドバーは内側でスクロールします。ページに縦スクロールは出ません。

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


11. 制約
========================================

- 同一ページに複数の ``<StarryDigitizer>`` を置くこと自体は可能になりました。
  canvas 要素はコンポーネントから明示的に engine へ渡されるようになったため、
  各インスタンスは自分の canvas に描画し、データセットも拡大鏡も独立しています
  (``cypress/e2e/host-app/spec.multi-instance.cy.ts`` で検証)。
  ただし **``document`` レベルのイベントは共有** されます。
  キーボードショートカット(undo/redo・ズーム・矢印キー・Delete)は
  マウント済みの **すべての** インスタンスが処理し、画像のペーストは
  ``features.imageUpload`` が有効なすべてのインスタンスに読み込まれます。
  これらのショートカットが重要な用途では、インスタンスは 1 つに留めてください。
  また canvas の ``id``(``#imageCanvas`` など)は固定のままで DOM 上は重複します。
  ライブラリ内部は id 解決をしなくなりましたが、ホスト側のセレクタでも
  id に依存しないでください。
- UMD ビルドは提供していません(ESM / CommonJS のみ)。
- 未校正の軸を持つデータセットの ``getDatasetValues()`` は ``NaN``(JSON では ``null``)を返します。


12. 動作を確認できる最小構成
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
