<template>
  <v-app>
    <div v-if="deviceIsSmartphone" class="c__unsupported-device-screen">
      This application is not supported on smartphones. <br />Please access here
      on a PC.
    </div>
    <v-main v-if="!deviceIsSmartphone">
      <v-dialog v-model="showDemoDialog" max-width="860">
        <v-card>
          <v-card-title class="text-h6">New: AutoLineDigitizer — a companion tool for StarryDigitizer</v-card-title>
          <v-card-text>
            <p class="mb-3">
              Skip manual point clicking — AutoLineDigitizer automatically detects axes and extracts all line data from your graph image. The result loads directly into StarryDigitizer, so you can start editing right away.
            </p>
            <v-row>
              <v-col cols="6">
                <p class="text-center text-body-2 text-medium-emphasis mb-1">Your graph image</p>
                <img src="/auto-line-digitizer-before.png" alt="Original graph" style="width: 100%; border: 1px solid #ccc; border-radius: 4px;" />
              </v-col>
              <v-col cols="6">
                <p class="text-center text-body-2 text-medium-emphasis mb-1">Auto-extracted &amp; ready to edit in StarryDigitizer</p>
                <img src="/auto-line-digitizer-after.png" alt="Extracted data points" style="width: 100%; border: 1px solid #ccc; border-radius: 4px;" />
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-btn href="https://t29mato.github.io/AutoLineDigitizer/" target="_blank" color="primary" variant="flat">Try AutoLineDigitizer</v-btn>
            <v-spacer />
            <v-btn variant="outlined" @click="showDemoDialog = false">Remind me later</v-btn>
            <v-btn variant="outlined" @click="dismissDemoDialog">Don't show again</v-btn>
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
          <v-badge
            v-if="link.text === 'AutoLineDigitizer' && isPromoActive"
            content="NEW"
            color="red"
            inline
          />
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
        text: 'AutoLineDigitizer',
        url: 'https://t29mato.github.io/AutoLineDigitizer/',
      },
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
