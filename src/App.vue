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
          <v-list-item
            v-for="item in menu.items"
            :key="item.text"
            :href="item.href"
            :target="item.href ? '_blank' : undefined"
            :disabled="item.disabled"
            @click="item.action"
          >
            <div class="d-flex justify-space-between" style="gap: 24px">
              <span>{{ item.text }}</span>
              <span v-if="item.shortcut" class="text-medium-emphasis">{{
                item.shortcut
              }}</span>
            </div>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>
    <v-main v-if="!deviceIsSmartphone">
      <starry-digitizer :initialGraphImagePath="'/sample_graph_curve.png'" />
    </v-main>
    <v-footer :color="isProd ? 'primary' : 'orange'">
      <v-row justify="center" no-gutters>
        <v-btn
          v-for="link in footerLinks"
          :key="link.url"
          color="white"
          variant="text"
          rounded
          class="my-2 text-none"
          :href="link.url"
          target="_blank"
          size="small"
        >
          {{ link.text }}
        </v-btn>
        <v-col class="text-center text-white" cols="12">
          {{ new Date().getFullYear() }} — <strong>StarryDigitizer</strong
          ><span class="ml-2 mt-1">{{ isProd ? version : '' }}</span>
        </v-col>
      </v-row>
    </v-footer>
    <v-snackbar v-model="showError" color="error" timeout="4000">
      {{ errorMessage }}
    </v-snackbar>
    <pwa-update-prompt />
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import StarryDigitizer from '@/presentation/components/StarryDigitizer.vue'
import PwaUpdatePrompt from '@/presentation/components/Generals/PWAUpdatePrompt.vue'
import logo from '@/assets/logo.svg'
import {
  canvasHandler,
  historyManager,
  interpolator,
} from '@/instanceStore/applicationServiceInstances'
import {
  saveProjectAndDownload,
  triggerLoadProjectDialog,
} from '@/application/utils/projectFileOperations'

import { version } from '../package.json'

export default defineComponent({
  name: 'App',

  components: {
    StarryDigitizer,
    PwaUpdatePrompt,
  },

  data: () => ({
    points: [],
    version,
    logo,
    canvasHandler,
    historyManager,
    interpolator,
    footerLinks: [
      {
        text: 'Release Note',
        url: 'https://github.com/t29mato/starry-digitizer/releases',
      },
    ],
    isProd: import.meta.env.MODE === 'production',
    showError: false,
    errorMessage: '',
  }),
  computed: {
    deviceIsSmartphone() {
      const ua = navigator.userAgent.toLowerCase()

      return /(iphone|android).*mobile/.test(ua)
    },
    // INFO: A native-app-style menu bar (File/Edit/View/Help), per issue
    // #148 — Undo/Redo and zoom used to be buttons above the canvas; they
    // now live here (plus their existing keyboard shortcuts) so the canvas
    // gets that screen space back.
    menus() {
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
          ],
        },
        {
          title: 'Help',
          items: [
            {
              text: 'Document',
              href: 'https://starrydigitizer.readthedocs.io/',
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
    async handleSaveProject() {
      const result = await saveProjectAndDownload()
      if (!result.success) {
        this.showErrorSnackbar(result.errorMessage)
      }
    },
    async handleLoadProject() {
      const result = await triggerLoadProjectDialog()
      if (!result.success && result.errorMessage) {
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
