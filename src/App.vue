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
        }"
        :confirm-image-replace="true"
        @update:project="onProjectUpdate"
        @error="onDigitizerError"
      >
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
    </footer>
    <sd-snackbar v-model="showError" color="error" :timeout="4000">
      <span data-cy="error-snackbar">{{ errorMessage }}</span>
    </sd-snackbar>
    <keyboard-shortcuts-dialog v-model="showKeyboardShortcuts" />
    <pwa-update-prompt />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import StarryDigitizer from '@/presentation/components/StarryDigitizer.vue'
import PwaUpdatePrompt from '@/presentation/components/Generals/PWAUpdatePrompt.vue'
import KeyboardShortcutsDialog from '@/presentation/components/Generals/KeyboardShortcutsDialog.vue'
import logo from '@/assets/logo-mark-white.svg'
import { SdMenu, SdSnackbar, type SdMenuItem } from '@/presentation/ui'
import { appContext } from '@/appContext'
import type { DigitizerErrorPayload } from '@/application/errors'
import {
  saveProjectAndDownload,
  triggerLoadProjectDialog,
} from '@/presentation/utils/projectFileDialog'
import { copyActiveDatasetToClipboard } from '@/application/utils/dataExport'
import { toggleInterpolation } from '@/presentation/utils/interpolationToggle'
import { createAppPersistence } from '@/appPersistence'
import type { ProjectDTO } from '@/application/dto/projectDTO'
import {
  dataUrlToBlob,
  type ImageSource,
} from '@/application/utils/imageLoader'

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

const DEFAULT_IMAGE = '/sample_graph_curve.png'

// INFO: standalone-app-only auto-save (see src/appPersistence.ts). The library
// persists nothing by itself; this app has no backend, so it keeps the work in
// IndexedDB and restores it on the next load. Created at module scope because
// there is exactly one App instance and it is not reactive state.
const persistence = createAppPersistence()

export default defineComponent({
  name: 'App',

  components: {
    StarryDigitizer,
    PwaUpdatePrompt,
    KeyboardShortcutsDialog,
    SdMenu,
    SdSnackbar,
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
    showError: false,
    errorMessage: '',
    showKeyboardShortcuts: false,
    // INFO: left undefined until mounted() has looked for auto-saved work, so
    // a restored image is not preceded by a pointless fetch/decode of the
    // sample figure (and its flash on screen).
    imageSource: undefined as ImageSource | undefined,
    // INFO: nothing is written before the restore has finished — otherwise the
    // empty startup state would overwrite the very work we are about to read.
    autoSaveReady: false,
    lastSavedImageUrl: '',
  }),
  computed: {
    // INFO: "v<version>#<GitHub Actions build number>"; used to be rendered
    // inside StarryDigitizer.vue.
    appVerAndBuildInfo(): string {
      const appVer = this.isProd ? `v${this.version}` : ''
      const buildNumber = this.githubRunNumber ? `#${this.githubRunNumber}` : ''

      return appVer + buildNumber
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
            { text: 'Zoom Out', shortcut: '-', action: this.handleZoomOut },
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
          ],
        },
      ]
    },
  },
  async mounted() {
    await this.restoreAutoSavedWork()
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
    async restoreAutoSavedWork() {
      const saved = await persistence.load()
      if (saved?.project) {
        // INFO: an older session that only ever used the sample figure has no
        // image of its own; fall back to the same default a fresh visit gets.
        await this.digitizerRef()?.loadProject(
          saved.project,
          saved.image ?? DEFAULT_IMAGE,
        )
      } else {
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
    onDigitizerError(payload: DigitizerErrorPayload) {
      this.showErrorSnackbar(payload.message)
    },
    async handleSaveProject() {
      const result = await saveProjectAndDownload(this.appContext)
      if (!result.success) {
        this.showErrorSnackbar(result.errorMessage)
      }
    },
    async handleLoadProject() {
      const result = await triggerLoadProjectDialog(this.appContext)
      if (!result.success && result.errorMessage) {
        this.showErrorSnackbar(result.errorMessage)
      }
    },
    async handleCopyData() {
      const result = await copyActiveDatasetToClipboard(this.appContext)
      if (!result.success) {
        this.showErrorSnackbar(result.errorMessage)
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
    showErrorSnackbar(message?: string) {
      this.errorMessage = message ?? 'An error occurred'
      this.showError = true
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
