<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <h1 class="d-flex align-center">Vue Plot Digitizer</h1>
      <span class="ml-2 mt-3">{{ version }}</span>

      <v-spacer></v-spacer>

      <v-btn
        href="https://github.com/t29mato/vue-plot-digitizer/releases"
        target="_blank"
        text
      >
        <span class="mr-2">Latest Release</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <PlotDigitizer />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue'
import * as Sentry from '@sentry/vue'
import { Integrations } from '@sentry/tracing'

import PlotDigitizer from './components/PlotDigitizer.vue'
import { version } from '../package.json'

console.info('NODE_ENV', process.env.NODE_ENV)
console.info('VUE_APP_SENTRY_DSN', process.env.VUE_APP_SENTRY_DSN)
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    Vue,
    dsn: process.env.VUE_APP_SENTRY_DSN,
    integrations: [
      new Integrations.BrowserTracing({
        tracingOrigins: ['vpd.vercel.app', /^\//],
      }),
    ],
    tracesSampleRate: 1.0,
  })
}

export default Vue.extend({
  name: 'App',

  components: {
    PlotDigitizer,
  },

  data: () => ({
    version,
  }),
})
</script>
