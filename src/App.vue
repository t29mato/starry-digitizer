<template>
  <v-app>
    <v-main>
      <Main
        :initialGraphImagePath="require('@/assets/sample_graph_curve.png')"
      />
    </v-main>
    <v-footer :color="isProd ? 'primary' : 'orange'">
      <v-row justify="center" no-gutters>
        <v-btn
          v-for="link in links"
          :key="link.url"
          color="white"
          text
          rounded
          class="my-2"
          :href="link.url"
          target="_blank"
          small
        >
          {{ link.text }}
        </v-btn>
        <v-col class="text-center white--text" cols="12">
          {{ new Date().getFullYear() }} — <strong>StarryDigitizer</strong
          ><span class="ml-2 mt-1">{{ version }}</span>
        </v-col>
      </v-row>
    </v-footer>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue'
// import * as Sentry from '@sentry/vue'
// import { Integrations } from '@sentry/tracing'

import Main from './components/Main.vue'
import { version } from '../package.json'

//TODO: 後で戻す対応
// if (process.env.NODE_ENV === 'production') {
//   Sentry.init({
//     Vue,
//     dsn: process.env.VUE_APP_SENTRY_DSN,
//     release: `starry-digitizer@${version}`,
//     integrations: [
//       new Integrations.BrowserTracing({
//         tracingOrigins: ['vpd.vercel.app', /^\//],
//       }),
//     ],
//     tracesSampleRate: 1.0,
//   })
// }

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
    isProd: process.env.NODE_ENV === 'production',
  }),
  methods: {
    importPlots(plots: any) {
      this.plots = plots
    },
  },
})
</script>
