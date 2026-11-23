<template>
  <div class="app starry-digitizer">
    <div v-if="deviceIsSmartphone" class="c__unsupported-device-screen">
      This application is not supported on smartphones. <br />Please access here
      on a PC.
    </div>
    <header
      v-if="!deviceIsSmartphone"
      class="c__app-bar"
      :class="{ 'c__app-bar--dev': !isProd }"
    >
      <img
        :src="logo"
        alt="StarryDigitizer"
        width="18"
        height="18"
        class="ml-3 mr-2"
      />
      <span class="text-white font-weight-bold mr-4">StarryDigitizer</span>
      <sd-menu v-for="menu in menus" :key="menu.title" :items="menu.items">
        <template #activator="{ props }">
          <button
            type="button"
            class="c__menu-btn"
            :data-cy="`menu-${menu.title.toLowerCase()}`"
            v-bind="props"
          >
            {{ menu.title }}
          </button>
        </template>
      </sd-menu>
    </header>
    <main v-if="!deviceIsSmartphone" class="c__main">
      <starry-digitizer
        ref="digitizer"
        :context="appContext"
        :image="imageSource"
        :features="{
          imageUpload: true,
          zipExportImport: true,
          csvExport: true,
          starrydataRef: starryaiBuild,
        }"
        :confirm-image-replace="true"
        :asset-base-url="ocrAssetBaseUrl"
        @update:project="onProjectUpdate"
        @error="onDigitizerError"
        @image-replaced="onImageReplaced"
      >
        <!-- INFO: the starryai build's research notice, next to where an
             image is loaded (docs/design/starryai-auto.md §5.2) -->
        <template v-if="collect.on" #aside-top>
          <p class="c__collect-inline">
            <collect-notice
              :user-name="collect.userName"
              :has-names="collect.hasNames"
              inline
            />
          </p>
        </template>
        <!-- INFO: the version/build caption is app-only (it reads
        package.json and import.meta.env), so it is injected through the
        component's slot instead of living inside the library. -->
        <template #right-sidebar-footer>
          <p class="text-caption text-right">{{ appVerAndBuildInfo }}</p>
        </template>
      </starry-digitizer>
    </main>
    <footer class="c__footer" :class="{ 'c__footer--dev': !isProd }">
      {{ new Date().getFullYear() }} — <strong>StarryDigitizer</strong
      ><span class="ml-2">{{ isProd ? version : '' }}</span>
      <template v-if="collect.on">
        <br />
        <collect-notice
          :user-name="collect.userName"
          :has-names="collect.hasNames"
          @change-name="collect.choosing = true"
        />
      </template>
      <template v-if="collect.login.on">
        <br />
        <auth-status
          :user-name="collect.login.userName"
          :busy="collect.signingOut"
          @sign-out="onSignOut"
          @sign-in="collect.choosing = true"
        />
      </template>
    </footer>
    <collect-user-dialog
      v-if="collect.on && collect.hasNames"
      :model-value="collect.needsUser || collect.choosing"
      :users="collect.users"
      :guest-allowed="collect.guestAllowed"
      @choose="onChooseUser"
    />
    <!-- INFO: the password login (src/hosting/collect/auth.ts), when the
         server uses passwords; docs/design/starryai-auto.md §11 -->
    <login-dialog
      v-if="collect.login.on"
      :model-value="collect.login.needed || collect.choosing"
      :users="collect.login.users"
      :guest-allowed="collect.login.guestAllowed"
      :reason="collect.login.reason"
      :last-user="collect.login.lastUser"
      :closable="!collect.login.needed"
      :sign-in="signIn"
      @signed-in="collect.choosing = false"
      @guest="onChooseUser(null)"
      @close="collect.choosing = false"
    />
    <sd-snackbar v-model="showError" color="error" :timeout="4000">
      <span data-cy="error-snackbar">{{ errorMessage }}</span>
    </sd-snackbar>
    <sd-snackbar v-model="showInfo" :timeout="6000">
      <span data-cy="info-snackbar">{{ infoMessage }}</span>
    </sd-snackbar>
    <keyboard-shortcuts-dialog v-model="showKeyboardShortcuts" />
    <about-dialog v-model="showAbout" :page="pageVersion" />
    <pwa-update-prompt />
    <!-- INFO: the starryai build's "new version" bar (F17). That build has
         no Service Worker, so the prompt above never shows there. -->
    <version-notice
      v-if="newVersionShown"
      :busy="reloading"
      @reload="onReloadForNewVersion"
      @dismiss="dismissedVersion = newVersionKey"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import StarryDigitizer from '@/presentation/components/StarryDigitizer.vue'
import PwaUpdatePrompt from '@/presentation/components/Generals/PWAUpdatePrompt.vue'
import KeyboardShortcutsDialog from '@/presentation/components/Generals/KeyboardShortcutsDialog.vue'
import AboutDialog, {
  type PageVersionInfo,
} from '@/presentation/components/Generals/AboutDialog.vue'
import { provideDigitizerContext } from '@/presentation/digitizerContextProvider'
import logo from '@/assets/logo-mark-white.svg'
import { SdMenu, SdSnackbar, type SdMenuItem } from '@/presentation/ui'
import { appContext } from '@/appContext'
import type { DigitizerErrorPayload } from '@/application/errors'
import {
  saveProjectAndDownload,
  triggerLoadProjectDialog,
} from '@/presentation/utils/projectFileDialog'
import { copyActiveDatasetToClipboard } from '@/application/utils/dataExport'
import { recordExport } from '@/application/utils/researchEventOperations'
import { toggleInterpolation } from '@/presentation/utils/interpolationToggle'
import { createAppPersistence } from '@/appPersistence'
import type { ProjectDTO } from '@/application/dto/projectDTO'
import {
  dataUrlToBlob,
  type ImageSource,
} from '@/application/utils/imageLoader'
import {
  buildDataDocument,
  buildEditLog,
} from '@/application/utils/autoExtractionOperations'
import {
  hasAutoExtractionUrlParam,
  installAutoExtractionMessageBridge,
  loadAutoExtractionFile,
  loadAutoExtractionFromUrlParam,
  type AutoExtractionOperationResult,
} from '@/application/utils/autoExtractionBridge'
import { downloadJson, timestamp } from '@/presentation/utils/jsonDownload'
import {
  configureAutoService,
  watchAutoStatus,
} from '@/application/utils/autoFeatureOperations'

import CollectNotice from '@/hosting/collect/CollectNotice.vue'
import CollectUserDialog from '@/hosting/collect/CollectUserDialog.vue'
import LoginDialog from '@/hosting/collect/LoginDialog.vue'
import AuthStatus from '@/hosting/collect/AuthStatus.vue'
import type { LoginResult } from '@/hosting/collect/auth'
import {
  startCollect,
  type CollectHandle,
  type LoginView,
} from '@/hosting/collect/collectApp'
import type { CollectUser } from '@/hosting/collect/collectClient'
import VersionNotice from '@/hosting/version/VersionNotice.vue'
import {
  reloadAfterFlush,
  runningVersion,
  versionCheckEnabled,
  watchVersion,
} from '@/hosting/version/versionCheck'

import { version } from '../package.json'

type Menu = {
  title: string
  items: SdMenuItem[]
}

// INFO: the part of <StarryDigitizer>'s defineExpose() this app uses. $refs is
// untyped in the Options API, so the shape is declared here rather than cast
// away at every call site.
type DigitizerRef = {
  loadProject: (project?: ProjectDTO, image?: ImageSource) => Promise<void>
}

const DEFAULT_IMAGE = `${import.meta.env.BASE_URL}sample_graph_curve.png`
// INFO: set by a build that serves the OCR assets itself (vite.config.js)
const OCR_ASSET_BASE_URL = import.meta.env.VITE_OCR_ASSET_DIR
  ? `${import.meta.env.BASE_URL}${import.meta.env.VITE_OCR_ASSET_DIR}`
  : undefined

// INFO: standalone-app-only auto-save (see src/appPersistence.ts). The library
// persists nothing by itself; this app has no backend, so it keeps the work in
// IndexedDB and restores it on the next load. Created at module scope because
// there is exactly one App instance and it is not reactive state.
const persistence = createAppPersistence()

// INFO: the starryai build's research collection (src/hosting/collect),
// started only when the build names an auto service. Module scope like
// `persistence`: one App, and nothing a view renders (the view gets the
// `collect` data below).
let collectHandle: CollectHandle | null = null

export default defineComponent({
  name: 'App',

  components: {
    StarryDigitizer,
    PwaUpdatePrompt,
    KeyboardShortcutsDialog,
    AboutDialog,
    SdMenu,
    SdSnackbar,
    CollectNotice,
    CollectUserDialog,
    LoginDialog,
    AuthStatus,
    VersionNotice,
  },

  // INFO: the same context <StarryDigitizer> is given, provided here too so
  // the app's own dialogs (Help > About, its Components list) can read it
  setup() {
    provideDigitizerContext(appContext)
    return {}
  },

  // INFO: appContext is a reactive() object, so spreading its members into
  // data() keeps the computed menu items reactive exactly like the old
  // singletons did.
  data: () => ({
    points: [],
    version,
    logo,
    appContext,
    canvasHandler: appContext.canvasHandler,
    historyManager: appContext.historyManager,
    interpolator: appContext.interpolator,
    axisSetRepository: appContext.axisSetRepository,
    datasetRepository: appContext.datasetRepository,
    githubRunNumber: import.meta.env.VITE_APP_GITHUB_RUN_NUMBER,
    isProd: import.meta.env.MODE === 'production',
    ocrAssetBaseUrl: OCR_ASSET_BASE_URL,
    // INFO: a build that names an auto service is the starryai one; it
    // shows the SID / Fig. fields (F18)
    starryaiBuild: Boolean(import.meta.env.VITE_AUTO_SERVICE_URL),
    showError: false,
    errorMessage: '',
    showKeyboardShortcuts: false,
    showAbout: false,
    showInfo: false,
    infoMessage: '',
    reviewSession: appContext.reviewSession,
    removeMessageBridge: null as null | (() => void),
    stopAutoStatus: null as null | (() => void),
    stopVersionWatch: null as null | (() => void),
    // INFO: F17: the newest deploy seen on the server (`<commit>#<build>`),
    // the one the person closed the bar for, and the Reload in progress
    newVersionKey: null as string | null,
    dismissedVersion: null as string | null,
    reloading: false,
    // INFO: left undefined until mounted() has looked for auto-saved work, so
    // a restored image is not preceded by a pointless fetch/decode of the
    // sample figure (and its flash on screen).
    imageSource: undefined as ImageSource | undefined,
    // INFO: nothing is written before the restore has finished — otherwise the
    // empty startup state would overwrite the very work we are about to read.
    autoSaveReady: false,
    lastSavedImageUrl: '',
    // INFO: the research collection, as the view needs it (collectApp.ts)
    collect: {
      on: false,
      hasNames: false,
      needsUser: false,
      choosing: false,
      userName: null as string | null,
      users: [] as CollectUser[],
      guestAllowed: true,
      signingOut: false,
      login: {
        on: false,
        userName: null,
        needed: false,
        guestAllowed: true,
        users: [],
        reason: null,
        lastUser: null,
      } as LoginView,
    },
  }),
  computed: {
    newVersionShown(): boolean {
      return (
        this.newVersionKey !== null &&
        this.newVersionKey !== this.dismissedVersion
      )
    },
    // INFO: "v<version>#<GitHub Actions build number>"; used to be rendered
    // inside StarryDigitizer.vue.
    appVerAndBuildInfo(): string {
      const appVer = this.isProd ? `v${this.version}` : ''
      const buildNumber = this.githubRunNumber ? `#${this.githubRunNumber}` : ''

      return appVer + buildNumber
    },
    // INFO: Help > About. The starryai build is given its commit and build
    // number by deploy/deploy.sh (the same values as its VERSION.txt); the
    // Vercel builds have the GitHub Actions run number only.
    pageVersion(): PageVersionInfo {
      return {
        version: this.version,
        build:
          import.meta.env.VITE_APP_BUILD || this.githubRunNumber || undefined,
        commit: import.meta.env.VITE_APP_COMMIT || undefined,
        environment: import.meta.env.MODE,
      }
    },
    deviceIsSmartphone() {
      const ua = navigator.userAgent.toLowerCase()

      return /(iphone|android).*mobile/.test(ua)
    },
    // INFO: A native-app-style menu bar (File/Edit/View/Help), per issue
    // #148 — Undo/Redo and zoom used to be buttons above the canvas; they
    // now live here (plus their existing keyboard shortcuts) so the canvas
    // gets that screen space back.
    menus(): Menu[] {
      return [
        {
          title: 'File',
          items: [
            {
              text: 'Save Project',
              shortcut: '⌘S',
              action: this.handleSaveProject,
            },
            {
              text: 'Load Project',
              shortcut: '⌘O',
              action: this.handleLoadProject,
            },
            { text: 'divider', divider: true },
            {
              text: 'Copy Data to Clipboard',
              action: this.handleCopyData,
            },
            { text: 'divider', divider: true },
            // INFO: the auto-extraction review (docs/design/
            // auto-extraction-review-design.md)
            {
              text: 'Import Auto-Extraction (JSON)…',
              action: this.handleImportAutoExtraction,
            },
            {
              text: 'Export Data (JSON)',
              action: this.handleExportDataJson,
            },
            {
              text: 'Export Edit Log (JSON)',
              disabled: !this.reviewSession.isActive,
              action: this.handleExportEditLog,
            },
            { text: 'divider', divider: true },
            // INFO: the counterpart of the silent restore — the work comes
            // back on its own, so there has to be a deliberate way to drop it
            // and start from a blank figure again.
            {
              text: 'Start Over',
              action: this.handleStartOver,
            },
          ],
        },
        {
          title: 'Edit',
          items: [
            {
              text: 'Undo',
              shortcut: '⌘Z',
              disabled: !this.historyManager.canUndo,
              action: () => this.historyManager.undo(),
            },
            {
              text: 'Redo',
              shortcut: '⌘⇧Z',
              disabled: !this.historyManager.canRedo,
              action: () => this.historyManager.redo(),
            },
          ],
        },
        {
          title: 'View',
          items: [
            { text: 'Zoom In', shortcut: '+', action: this.handleZoomIn },
            {
              text: 'Zoom Out',
              shortcut: '-',
              disabled: !this.canvasHandler.canScaleDown,
              action: this.handleZoomOut,
            },
            {
              text: 'Reset to 100%',
              shortcut: '0',
              action: this.handleResetZoom,
            },
            { text: 'Fit', shortcut: 'F', action: this.handleFit },
            { text: 'divider', divider: true },
            {
              text: 'Show Axes Marker',
              checked: this.axisSetRepository.activeAxisSet.isVisible,
              action: this.handleToggleAxesMarker,
            },
            {
              text: 'Interpolation',
              checked: this.interpolator.isActive,
              disabled: this.datasetRepository.isViewAllMode,
              action: this.handleToggleInterpolation,
            },
          ],
        },
        {
          title: 'Help',
          items: [
            {
              text: 'Document',
              href: 'https://starrydigitizer.readthedocs.io/',
            },
            {
              text: 'Release Note',
              href: 'https://github.com/t29mato/starry-digitizer/releases',
            },
            { text: 'divider', divider: true },
            {
              text: 'Keyboard Shortcuts',
              action: () => {
                this.showKeyboardShortcuts = true
              },
            },
            {
              text: 'About',
              action: () => {
                this.showAbout = true
              },
            },
          ],
        },
      ]
    },
  },
  async mounted() {
    // INFO: with ?extraction=, the document replaces whatever is restored,
    // so the sample figure is not loaded only to be thrown away
    const extractionRequested = hasAutoExtractionUrlParam()
    await this.restoreAutoSavedWork(extractionRequested)
    // INFO: every image path (upload, drag&drop, paste, ZIP import, restore)
    // ends in canvasHandler.setUploadImageUrl(), so watching that one value
    // covers all of them — and it changes only when the image really changes,
    // which is what keeps the blob out of the per-point project saves.
    this.$watch(
      () => this.canvasHandler.uploadImageUrl,
      (url: string) => this.persistImage(url),
    )
    // INFO: watched rather than saved from the menu handler, because the
    // interpolation switch inside ExtractorSettings toggles the same flag from
    // within the library — saving only on the menu path would miss the common
    // one.
    this.$watch(
      () => this.interpolator.isActive,
      () => this.persistSettings(),
    )
    // INFO: after the watchers above, so an imported document (and its
    // image) is auto-saved like any other edit
    this.removeMessageBridge = installAutoExtractionMessageBridge(
      this.appContext,
      window,
      this.handleAutoExtractionResult,
    )
    if (extractionRequested) {
      const result = await loadAutoExtractionFromUrlParam(this.appContext)
      if (result) this.handleAutoExtractionResult(result)
    }
    // INFO: the standalone app talks to an auto service only when its build
    // names one (e.g. a NIMS-internal deployment). The public build sets
    // nothing, so the features stay absent there — and even with a URL they
    // are shown only if the service's capabilities answer allows them.
    const autoServiceUrl = import.meta.env.VITE_AUTO_SERVICE_URL
    if (autoServiceUrl) {
      // INFO: every request carries `X-WPD-App: starry-digitizer` (the
      // wpd-auto backend's records' `client`, the admin report's ?client=;
      // a missing header counts as wpd-auto), and — once the research notice
      // is on screen — the ids that join the server's records to the page's.
      // docs/design/starryai-auto.md §3.2, §3.4
      collectHandle = startCollect(this.appContext, autoServiceUrl, {
        commit: import.meta.env.VITE_APP_COMMIT,
        build: import.meta.env.VITE_APP_BUILD,
        version,
        onChange: (view) => Object.assign(this.collect, view),
        // INFO: after the notice has been rendered — nothing is sent before
        // the person could see it
        afterRender: () => this.$nextTick(),
      })
      configureAutoService(this.appContext, collectHandle.service)
      // INFO: such a page stays open all day; the server's supported hours
      // (and LineFormer, off outside them) change under it
      this.stopAutoStatus = watchAutoStatus(this.appContext)
    }
    // INFO: F17 — only the starryai build (an auto service, no Service
    // Worker, a commit/build from deploy.sh); a new version is announced,
    // never loaded by itself
    const running = runningVersion(
      import.meta.env.VITE_APP_COMMIT,
      import.meta.env.VITE_APP_BUILD,
    )
    if (
      versionCheckEnabled({
        autoServiceUrl,
        pwaOff: import.meta.env.VITE_PWA_OFF === '1',
        running,
      })
    ) {
      this.stopVersionWatch = watchVersion({
        url: `${import.meta.env.BASE_URL}VERSION.txt`,
        running,
        onNewVersion: (served) => {
          this.newVersionKey = `${served.commit}#${served.build}`
        },
      })
    }
  },
  beforeUnmount() {
    this.removeMessageBridge?.()
    this.removeMessageBridge = null
    this.stopAutoStatus?.()
    this.stopAutoStatus = null
    this.stopVersionWatch?.()
    this.stopVersionWatch = null
    collectHandle?.stop()
    collectHandle = null
  },
  methods: {
    importPoints(points: any) {
      this.points = points
    },
    digitizerRef(): DigitizerRef | undefined {
      return this.$refs.digitizer as DigitizerRef | undefined
    },
    // INFO: restore is silent by design: work in progress is what the user
    // expects to find, so asking "restore?" only adds a click to the common
    // case. loadProject() is the library's one restore path (it migrates the
    // DTO and clears the undo history), so the app goes through it too.
    async restoreAutoSavedWork(skipDefaultImage = false) {
      const saved = await persistence.load()
      if (saved?.project) {
        // INFO: an older session that only ever used the sample figure has no
        // image of its own; fall back to the same default a fresh visit gets.
        await this.digitizerRef()?.loadProject(
          saved.project,
          saved.image ?? DEFAULT_IMAGE,
        )
      } else if (!skipDefaultImage) {
        // INFO: assigning the prop lets the component load the default image
        // through its own `image` watcher.
        this.imageSource = DEFAULT_IMAGE
      }
      // INFO: outside the branch above — a remembered setting is restored even
      // when there is no saved project, e.g. the user flipped a switch and
      // reloaded before digitizing anything.
      if (saved?.settings) {
        // INFO: setIsActive(), not toggleInterpolation() — the latter also
        // re-materializes points and redraws the preview, which is what a user
        // CLICK should do, not what restoring a remembered flag should. This
        // matches what the library's removed initialize() used to do.
        this.interpolator.setIsActive(saved.settings.isInterpolatorActive)
      }
      await this.markAutoSaveBaseline()
    },
    // INFO: adopt whatever is on the canvas now as "already saved", then let
    // the pending watcher callbacks run against it before re-enabling writes,
    // so a restore never writes back what it has just read.
    async markAutoSaveBaseline() {
      this.autoSaveReady = false
      this.lastSavedImageUrl = this.canvasHandler.uploadImageUrl
      await this.$nextTick()
      this.autoSaveReady = true
    },
    persistSettings() {
      if (!this.autoSaveReady) return
      persistence.saveSettings({
        isInterpolatorActive: this.interpolator.isActive,
      })
    },
    onProjectUpdate(project: ProjectDTO) {
      if (!this.autoSaveReady) return
      // INFO: already debounced by the component (updateDebounceMs).
      persistence.saveProject(project)
    },
    persistImage(url: string) {
      if (!this.autoSaveReady) return
      // INFO: the image is written only when it actually changed, so plotting
      // points never rewrites the (much larger) blob.
      if (url === this.lastSavedImageUrl) return
      this.lastSavedImageUrl = url
      if (url === '') {
        persistence.saveImage(null)
        return
      }
      dataUrlToBlob(url)
        .then((blob) => persistence.saveImage(blob))
        .catch((error) => {
          console.warn(
            '[starry-digitizer] could not auto-save the image',
            error,
          )
        })
    },
    async handleStartOver() {
      // INFO: window.confirm on purpose, unlike the library components, which
      // ask through `options.confirm` so an embedding host can substitute its
      // own dialog. This is the standalone app's own menu bar: it *is* the
      // top-level app, there is no host whose UI a native dialog could clash
      // with, and it has no dialog component of its own to use instead.
      const confirmed = window.confirm(
        'Start over? The image, the axes and all points of this session are discarded, including the auto-saved copy.',
      )
      if (!confirmed) return
      this.autoSaveReady = false
      await persistence.clear()
      // INFO: an empty project plus the default figure — the same state a
      // first-ever visit shows.
      await this.digitizerRef()?.loadProject(undefined, DEFAULT_IMAGE)
      await this.markAutoSaveBaseline()
    },
    async onReloadForNewVersion() {
      if (this.reloading) return
      this.reloading = true
      // INFO: what the person did so far goes to the research store first
      // (at most a few seconds); the work itself is in the auto-save
      const handle = collectHandle
      await reloadAfterFlush(
        handle ? () => handle.flushBeforeReload() : null,
        () => window.location.reload(),
      )
    },
    onImageReplaced(payload: { blob: Blob }) {
      collectHandle?.noteFile(payload.blob)
    },
    onChooseUser(user: string | null) {
      this.collect.choosing = false
      collectHandle?.chooseUser(user)
    },
    signIn(user: string, password: string): Promise<LoginResult> {
      if (!collectHandle)
        return Promise.resolve({ ok: false, error: 'network' } as LoginResult)
      return collectHandle.signIn(user, password)
    },
    async onSignOut() {
      if (!collectHandle || this.collect.signingOut) return
      this.collect.signingOut = true
      try {
        await collectHandle.signOut()
      } finally {
        this.collect.signingOut = false
      }
    },
    onDigitizerError(payload: DigitizerErrorPayload) {
      this.showErrorSnackbar(payload.message, 'digitizer', payload.code)
    },
    async handleSaveProject() {
      const result = await saveProjectAndDownload(this.appContext)
      if (!result.success) {
        this.showErrorSnackbar(result.errorMessage, 'menu.save_project')
      }
    },
    async handleLoadProject() {
      const result = await triggerLoadProjectDialog(this.appContext)
      if (!result.success && result.errorMessage) {
        this.showErrorSnackbar(result.errorMessage, 'menu.load_project')
      }
    },
    async handleCopyData() {
      const result = await copyActiveDatasetToClipboard(this.appContext)
      if (!result.success) {
        this.showErrorSnackbar(result.errorMessage, 'menu.copy_data')
      }
    },
    handleZoomIn() {
      this.canvasHandler.scaleUp()
      this.interpolator.resizeCanvas()
    },
    handleZoomOut() {
      this.canvasHandler.scaleDown()
      this.interpolator.resizeCanvas()
    },
    handleResetZoom() {
      this.canvasHandler.drawOriginalSizeImage()
      this.interpolator.resizeCanvas()
    },
    handleFit() {
      this.canvasHandler.drawFitSizeImage()
      this.interpolator.resizeCanvas()
    },
    handleToggleAxesMarker() {
      this.axisSetRepository.activeAxisSet.isVisible =
        !this.axisSetRepository.activeAxisSet.isVisible
    },
    handleToggleInterpolation() {
      toggleInterpolation(this.appContext, !this.interpolator.isActive)
    },
    handleImportAutoExtraction() {
      // INFO: same hidden-file-input approach as triggerLoadProjectDialog()
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,application/json'
      input.style.display = 'none'
      input.addEventListener('change', async () => {
        const file = input.files?.[0]
        document.body.removeChild(input)
        if (!file) return
        this.handleAutoExtractionResult(
          await loadAutoExtractionFile(this.appContext, file),
        )
      })
      input.addEventListener('cancel', () => document.body.removeChild(input))
      document.body.appendChild(input)
      input.click()
    },
    handleExportDataJson() {
      downloadJson(
        buildDataDocument(this.appContext),
        `data-${timestamp()}.json`,
      )
      recordExport(
        this.appContext,
        'json',
        'all',
        this.datasetRepository.datasets,
      )
    },
    handleExportEditLog() {
      const editLog = buildEditLog(this.appContext)
      if (!editLog) return
      // INFO: no recordExport here: buildEditLog() already reports
      // `review.export`
      downloadJson(editLog, `edit-log-${timestamp()}.json`)
    },
    handleAutoExtractionResult(result: AutoExtractionOperationResult) {
      if (!result.success) {
        if (result.errorMessage)
          this.showErrorSnackbar(result.errorMessage, 'auto_extraction.import')
        return
      }
      if (!result.result) return
      const { series, points, warnings } = result.result
      this.showInfoSnackbar(
        `Imported ${series} series / ${points} points.` +
          (warnings.length ? ` Warnings: ${warnings.join('; ')}` : ''),
        'auto_extraction.import',
      )
    },
    // INFO: every message the app shows goes through these two, so the
    // starryai build records each one (`ui.error` / `ui.message`); `where`
    // is a fixed id of the place, `code` the DigitizerError code if any
    showErrorSnackbar(
      message: string | undefined,
      where: string,
      code: string | null = null,
    ) {
      this.errorMessage = message ?? 'An error occurred'
      this.showError = true
      collectHandle?.noteError(where, code, this.errorMessage)
    },
    showInfoSnackbar(message: string, where: string) {
      this.infoMessage = message
      this.showInfo = true
      collectHandle?.noteMessage(where, message)
    },
  },
})
</script>
<style lang="scss" scoped>
// INFO: the standalone app chrome (bar, footer, menus). The digitizer itself
// carries its own scoped styles; nothing here leaks into the library build.
$bar-prod: #1e88e5;
$bar-dev: #fb8c00;

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.c {
  &__app-bar {
    display: flex;
    align-items: center;
    height: 32px;
    background: $bar-prod;
    color: #fff;
    &--dev {
      background: $bar-dev;
    }
  }

  &__menu-btn {
    height: 28px;
    padding: 0 8px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: #fff;
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }

  &__main {
    flex: 1;
  }

  &__collect-inline {
    margin: 0 0 6px;
    padding: 4px 6px;
    border-radius: 4px;
    background: #e3f2fd;
    color: #0d47a1;
  }

  &__footer {
    padding: 6px 0;
    text-align: center;
    background: $bar-prod;
    color: #fff;
    &--dev {
      background: $bar-dev;
    }
  }

  &__unsupported-device-screen {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: #eeeeee;
    display: flex;
    align-items: center;
    padding: 20px;
    color: gray;
    z-index: 1000;
    width: 100vw;
    max-height: 100vh;
    font-weight: bold;
    overflow: hidden;
  }
}
</style>
