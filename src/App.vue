<template>
  <v-app>
    <div v-if="deviceIsSmartphone" class="c__unsupported-device-screen">
      This application is not supported on smartphones. <br />Please access here
      on a PC.
    </div>
    <v-main v-if="!deviceIsSmartphone">
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
    <pwa-update-prompt />
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import StarryDigitizer from '@/presentation/components/StarryDigitizer.vue'
import PwaUpdatePrompt from '@/presentation/components/Generals/PWAUpdatePrompt.vue'

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

// INFO: Vuetify's default `.v-application__wrap` only sets a *min*-height of
// 100vh and `v-main` doesn't shrink (flex: 1 0 auto), so any page whose
// content is even slightly taller than the viewport grows the whole page
// past 100vh and the browser scrolls it. That whole-page scroll shifted the
// canvas' bounding rect under the cursor, desyncing subsequent clicks (#276).
// Pin the app to exactly the viewport height and let v-main shrink so only
// the panels that actually need it (see StarryDigitizer.vue) scroll.
:deep(.v-application__wrap) {
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
}

:deep(.v-main) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

:deep(.v-main > .v-container) {
  height: 100%;
  min-height: 0;
}
</style>
