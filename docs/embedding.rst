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

``vue`` と ``vuetify`` は peerDependencies です。ホストが1つの Vuetify インスタンスを用意し、
標準のコンポーネント・ディレクティブと ``mdi`` アイコンセットを登録してください。
アイコンフォント(``@mdi/font``)もホストが読み込みます。ライブラリの CSS は
``import 'starry-digitizer/styles'`` で1回だけ読み込みます。

.. code-block:: bash

   npm install starry-digitizer vue vuetify @mdi/font

.. code-block:: ts

   import { createVuetify } from 'vuetify'
   import * as components from 'vuetify/components'
   import * as directives from 'vuetify/directives'
   import { aliases, mdi } from 'vuetify/iconsets/mdi'
   import 'vuetify/styles'
   import '@mdi/font/css/materialdesignicons.css'
   import 'starry-digitizer/styles'

   export const vuetify = createVuetify({
     components,
     directives,
     icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
   })


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

.. code-block:: ts

   import { createApp, h, ref } from 'vue'
   import { StarryDigitizer, type ProjectDTO } from 'starry-digitizer'
   import { vuetify } from './vuetify'   // 2. で作ったインスタンス

   export function mountDigitizer(el: HTMLElement, opts: {
     image?: Blob
     project?: ProjectDTO
     onChange: (p: ProjectDTO) => void
     onError: (e: { code: string; message: string }) => void
   }) {
     const digitizer = ref<InstanceType<typeof StarryDigitizer>>()
     const app = createApp({
       render: () =>
         h(StarryDigitizer, {
           ref: digitizer,
           image: opts.image,
           project: opts.project,
           features: { imageUpload: false, zipExportImport: false },
           'onUpdate:project': opts.onChange,
           onError: opts.onError,
         }),
     })
     app.use(vuetify).mount(el)
     return {
       getDatasetValues: () => digitizer.value!.getDatasetValues(),
       getProject: () => digitizer.value!.getProject(),
       loadProject: (p: ProjectDTO, image?: Blob) => digitizer.value!.loadProject(p, image),
       unmount: () => app.unmount(),
     }
   }

React であれば ``useEffect`` 内でこの関数を呼び、クリーンアップで ``unmount()`` を呼びます。
iframe で埋め込むより、状態と物理量を直接やり取りできる点で優れています。


11. 制約
========================================

- 同一ページに **同時に複数の** ``<StarryDigitizer>`` を置くことはできません
  (canvas 要素の id が固定のため)。順番にマウントし直すことは可能で、
  前の状態は残りません。
- UMD ビルドは提供していません(ESM / CommonJS のみ)。
- 未校正の軸を持つデータセットの ``getDatasetValues()`` は ``NaN``(JSON では ``null``)を返します。


12. 動作を確認できる最小構成
========================================

リポジトリの ``examples/host-app`` に、Vue 3 + Vuetify の最小ホストがあります。
props / events / メソッドが一通り動くことを Cypress で検証しており、組み込みの雛形として
そのまま流用できます。
