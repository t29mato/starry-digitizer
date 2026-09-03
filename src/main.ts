import { createApp } from 'vue'
import App from './App.vue'

//Sentry
import { version } from '../package.json'
import * as Sentry from '@sentry/vue'
import { Integrations } from '@sentry/tracing'

// INFO: no UI framework any more — the digitizer ships its own styles
// (src/presentation/styles/base.scss, imported by StarryDigitizer.vue) and
// the standalone chrome (App.vue) carries its own scoped CSS.
import './app-style.css'

const app = createApp(App)
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
