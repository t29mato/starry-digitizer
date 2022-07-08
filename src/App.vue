<template>
  <v-app>
    <v-app-bar app color="primary" dark dense>
      <div class="d-flex align-center">
        <!-- <v-img
          alt="StarryDigitizer Logo"
          class="shrink mr-2"
          contain
          src="https://user-images.githubusercontent.com/30012556/139611246-756466ff-b3ed-4403-a75c-8a9be600ec1a.png"
          transition="scale-transition"
          width="40"
        /> -->
        <h3>StarryDigitizer</h3>
        <span class="ml-2 mt-1">{{ version }}</span>
      </div>

      <v-spacer></v-spacer>

      <v-btn
        href="https://github.com/t29mato/starry-digitizer/releases"
        target="_blank"
        text
      >
        <span class="mr-2">Release Note</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>
    </v-app-bar>
    <v-main>
      <Main :initialGraphImagePath="require('@/assets/sample_graph.png')" />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue'
import * as Sentry from '@sentry/vue'
import { Integrations } from '@sentry/tracing'

import Main from './components/Main.vue'
import { version } from '../package.json'

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    Vue,
    dsn: process.env.VUE_APP_SENTRY_DSN,
    release: `starry-digitizer@${version}`,
    integrations: [
      new Integrations.BrowserTracing({
        tracingOrigins: ['vpd.vercel.app', /^\//],
      }),
    ],
    tracesSampleRate: 1.0,
  })
}

Vue.config.errorHandler = (err) => {
  alert(err)
  console.error(err)
  Sentry.captureException(err)
}

window.addEventListener('error', (event) => {
  alert(event.error)
  console.error(event)
  Sentry.captureException(event)
})

window.addEventListener('unhandledrejection', (event) => {
  alert(event.reason)
  console.error(event)
  Sentry.captureException(event)
})

export default Vue.extend({
  name: 'App',

  components: {
    Main,
  },

  data: () => ({
    plots: [],
    version: version + '(Beta)',
  }),
  methods: {
    importPlots(plots: any) {
      this.plots = plots
    },
  },
})
</script>
