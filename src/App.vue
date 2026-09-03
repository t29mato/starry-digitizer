<template>
  <v-app>
    <div v-if="deviceIsSmartphone" class="c__unsupported-device-screen">
      This application is not supported on smartphones. <br />Please access here
      on a PC.
    </div>
    <v-app-bar
      v-if="!deviceIsSmartphone"
      :color="isProd ? 'primary' : 'orange'"
      height="32"
      flat
    >
      <img
        :src="logo"
        alt="StarryDigitizer"
        width="18"
        height="18"
        class="ml-3 mr-2"
      />
      <span class="text-white font-weight-bold mr-4">StarryDigitizer</span>
      <v-menu v-for="menu in menus" :key="menu.title">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            variant="text"
            size="small"
            class="text-none text-white px-2"
          >
            {{ menu.title }}
          </v-btn>
        </template>
        <v-list density="compact" min-width="220">
          <template v-for="(item, index) in menu.items">
            <v-divider
              v-if="item.divider"
              :key="'divider-' + index"
            ></v-divider>
            <v-list-item
              v-else
              :key="index"
              :href="item.href"
              :target="item.href ? '_blank' : undefined"
              :disabled="item.disabled"
              @click="item.action"
            >
              <template v-if="item.checked !== undefined" v-slot:prepend>
                <v-icon size="small" class="mr-1" style="width: 16px">{{
                  item.checked ? 'mdi-check' : ''
                }}</v-icon>
              </template>
              <div class="d-flex justify-space-between" style="gap: 24px">
                <span>{{ item.text }}</span>
                <span v-if="item.shortcut" class="text-medium-emphasis">{{
                  item.shortcut
                }}</span>
              </div>
            </v-list-item>
          </template>
        </v-list>
      </v-menu>
    </v-app-bar>
    <v-main v-if="!deviceIsSmartphone">
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
    </v-main>
    <v-footer :color="isProd ? 'primary' : 'orange'">
      <v-row justify="center" no-gutters>
        <v-col class="text-center text-white" cols="12">
          {{ new Date().getFullYear() }} — <strong>StarryDigitizer</strong
          ><span class="ml-2 mt-1">{{ isProd ? version : '' }}</span>
        </v-col>
      </v-row>
    </v-footer>
    <v-snackbar v-model="showError" color="error" timeout="4000">
      {{ errorMessage }}
    </v-snackbar>
    <keyboard-shortcuts-dialog v-model="showKeyboardShortcuts" />
    <pwa-update-prompt />
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import StarryDigitizer from '@/presentation/components/StarryDigitizer.vue'
import PwaUpdatePrompt from '@/presentation/components/Generals/PWAUpdatePrompt.vue'
import KeyboardShortcutsDialog from '@/presentation/components/Generals/KeyboardShortcutsDialog.vue'
import logo from '@/assets/logo.svg'
import { appContext } from '@/appContext'
import type { DigitizerErrorPayload } from '@/application/errors'
import {
  saveProjectAndDownload,
  triggerLoadProjectDialog,
} from '@/application/utils/projectFileOperations'
import { copyActiveDatasetToClipboard } from '@/application/utils/dataExport'
import { toggleInterpolation } from '@/application/utils/interpolationToggle'

import { version } from '../package.json'

type MenuItem = {
  text: string
  shortcut?: string
  href?: string
  disabled?: boolean
  checked?: boolean
  divider?: boolean
  action?: () => void
}

type Menu = {
  title: string
  items: MenuItem[]
}

export default defineComponent({
  name: 'App',

  components: {
    StarryDigitizer,
    PwaUpdatePrompt,
    KeyboardShortcutsDialog,
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
.c {
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
