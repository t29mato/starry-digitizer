<template>
  <v-app>
    <div v-if="deviceIsSmartphone" class="c__unsupported-device-screen">
      This application is not supported on smartphones. <br />Please access here
      on a PC.
    </div>
    <v-main v-if="!deviceIsSmartphone">
      <v-dialog v-model="showDemoDialog" max-width="600">
        <v-card>
          <v-card-title class="text-h6">
            <v-icon color="primary" class="mr-2">mdi-robot</v-icon>
            New: AI-Powered Auto Extract Feature
          </v-card-title>
          <v-card-text>
            <v-alert type="info" variant="tonal" class="mb-2">
              <div class="text-subtitle-2 mb-2">How to use:</div>
              <ol class="ml-6">
                <li class="mb-1">Upload or paste your graph image</li>
                <li class="mb-1">Click the "Auto Extract with AI" button</li>
                <li class="mb-1">Wait 10-20 seconds for processing</li>
                <li>Review and refine the extracted data if needed</li>
              </ol>
            </v-alert>

            <v-alert type="success" variant="tonal" density="compact">
              <div class="text-caption">
                🔒 Your images are sent to our AI server for processing but are
                not stored or saved.
              </div>
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="outlined" @click="showDemoDialog = false"
              >Remind me later</v-btn
            >
            <v-spacer />
            <v-btn color="primary" variant="flat" @click="dismissDemoDialog"
              >Got it, don't show again</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
      <starry-digitizer :initialGraphImagePath="'/sample_graph_curve.png'" />
    </v-main>
    <v-footer :color="isProd ? 'primary' : 'orange'">
      <v-row justify="center" no-gutters>
        <v-btn
          v-for="link in links"
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
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import StarryDigitizer from '@/presentation/components/StarryDigitizer.vue'

import { version } from '../package.json'

export default defineComponent({
  name: 'App',

  components: {
    StarryDigitizer,
  },

  data: () => ({
    points: [],
    version,
    promoEndDate: '2026-04-10',
    links: [
      {
        text: 'Release Note',
        url: 'https://github.com/t29mato/starry-digitizer/releases',
      },
      {
        text: 'Document',
        url: 'https://starrydigitizer.readthedocs.io/',
      },
    ],
    showDemoDialog: false,
    isProd: import.meta.env.MODE === 'production',
  }),
  mounted() {
    const dismissed = localStorage.getItem('autoLineDigitizerDemoDismissed')
    if (!dismissed && this.isPromoActive) {
      this.showDemoDialog = true
    }
  },
  computed: {
    isPromoActive() {
      return new Date() < new Date(this.promoEndDate)
    },
    deviceIsSmartphone() {
      const ua = navigator.userAgent.toLowerCase()

      return /(iphone|android).*mobile/.test(ua)
    },
  },
  methods: {
    importPoints(points: any) {
      this.points = points
    },
    dismissDemoDialog() {
      this.showDemoDialog = false
      localStorage.setItem('autoLineDigitizerDemoDismissed', 'true')
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
