<template>
  <v-app>
    <div v-if="deviceIsSmartphone" class="c__unsupported-device-screen">
      This application is not supported on smartphones. <br />Please access here
      on a PC.
    </div>
    <v-app-bar :color="isProd ? 'primary' : 'orange'" density="compact" flat>
      <img
        :src="logo"
        alt="StarryDigitizer"
        width="24"
        height="24"
        class="ml-4 mr-2"
      />
      <v-app-bar-title class="text-white">StarryDigitizer</v-app-bar-title>
      <v-spacer />
      <v-btn
        v-for="link in headerLinks"
        :key="link.url"
        color="white"
        variant="text"
        class="mr-2 text-none"
        :href="link.url"
        target="_blank"
        size="small"
      >
        {{ link.text }}
      </v-btn>
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
    <pwa-update-prompt />
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import StarryDigitizer from '@/presentation/components/StarryDigitizer.vue'
import PwaUpdatePrompt from '@/presentation/components/Generals/PWAUpdatePrompt.vue'
import logo from '@/assets/logo.svg'

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
    headerLinks: [
      {
        text: 'Document',
        url: 'https://starrydigitizer.readthedocs.io/',
      },
    ],
    footerLinks: [
      {
        text: 'Release Note',
        url: 'https://github.com/t29mato/starry-digitizer/releases',
      },
    ],
    isProd: import.meta.env.MODE === 'production',
  }),
  computed: {
    deviceIsSmartphone() {
      const ua = navigator.userAgent.toLowerCase()

      return /(iphone|android).*mobile/.test(ua)
    },
  },
  methods: {
    importPoints(points: any) {
      this.points = points
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
