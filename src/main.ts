import { createApp } from 'vue'
import App from './App.vue'

//Sentry
import { version } from '../package.json'
import * as Sentry from '@sentry/vue'
import { Integrations } from '@sentry/tracing'
// Vuetify
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import colors from 'vuetify/lib/util/colors'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

//Pinia
import { createPinia } from 'pinia'

const pinia = createPinia()

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    themes: {
      light: {
        dark: false,
        colors: {
          primary: colors.blue.darken1,
          secondary: colors.blue.darken2,
        },
      },
    },
  },
})

const app = createApp(App).use(pinia).use(vuetify)
app.mount('#app')

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    app,
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

app.config.errorHandler = (err) => {
  // alert(err)
  console.error(err)
  Sentry.captureException(err)
}

window.addEventListener('error', (event) => {
  // alert(event.error)
  console.error(event)
  Sentry.captureException(event)
})

window.addEventListener('unhandledrejection', (event) => {
  // alert(event.reason)
  console.error(event)
  Sentry.captureException(event)
})
