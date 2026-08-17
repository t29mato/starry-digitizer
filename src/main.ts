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
import './vuetify-style.css'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
// TODO: TSの型宣言エラーが解消できずignore いずれ再度調査
// @ts-ignore
import colors from 'vuetify/lib/util/colors'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

import { inject as injectAnalytics } from '@vercel/analytics'

import { interpolator } from './instanceStore/applicationServiceInstances'

//INFO: initialize application services
interpolator.initialize()

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

/*
 * 訪問数を数える(Vercel Web Analytics)。
 *
 * **ここはアプリの入り口(`src/main.ts`)だけ。**このリポジトリは
 * `library-build/entry.ts` からライブラリも配布しているので、そちらには入れない。
 * **人の作ったページに、こちらの計測を紛れ込ませることになる。**
 *
 * Cookieを置かず、個人を追わないので同意バナーは要らない。
 * 開発中は何も送らない。
 */
injectAnalytics()

const app = createApp(App).use(vuetify)
app.mount('#app')

if (import.meta.env.MODE === 'production') {
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
