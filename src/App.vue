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
        :context="appContext"
        image="/sample_graph_curve.png"
        :features="{
          imageUpload: true,
          zipExportImport: true,
          csvExport: true,
        }"
        :confirm-image-replace="true"
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
import logo from '@/assets/logo.svg'
import { SdMenu, SdSnackbar, type SdMenuItem } from '@/presentation/ui'
import { appContext } from '@/appContext'
import type { DigitizerErrorPayload } from '@/application/errors'
import {
  saveProjectAndDownload,
  triggerLoadProjectDialog,
} from '@/presentation/utils/projectFileDialog'
import { copyActiveDatasetToClipboard } from '@/application/utils/dataExport'
import { toggleInterpolation } from '@/application/utils/interpolationToggle'

import { version } from '../package.json'

type Menu = {
  title: string
  items: SdMenuItem[]
}

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
  methods: {
    importPoints(points: any) {
      this.points = points
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
