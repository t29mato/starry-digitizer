import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))
const releaseNotes = JSON.parse(
  readFileSync(new URL('./release-notes.json', import.meta.url)),
)

// INFO: emits version.json into the build output. PWAUpdatePrompt.vue fetches
// it (bypassing the Service Worker cache) when a new Service Worker is
// waiting, so the update popup can show which version is available and what
// changed. Notes live in release-notes.json, keyed by package.json version.
const versionJson = () => ({
  name: 'emit-version-json',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({
        version: pkg.version,
        notes: releaseNotes[pkg.version] ?? [],
      }),
    })
  },
})

// INFO: the OCR assets (tesseract.js worker, core, English data), served
// from this build's own origin instead of tesseract.js's CDN: a build that
// sets VITE_OCR_ASSET_DIR (the starryai one, behind a proxy that may not
// reach the CDN — docs/design/starryai-auto.md §4.3) gets them in that
// directory, and App.vue points assetBaseUrl at it. The data is the one the
// CDN default would load (@tesseract.js-data/eng 4.0.0_best_int, LSTM).
const OCR_ASSETS = [
  'tesseract.js/dist/worker.min.js',
  'tesseract.js-core/tesseract-core.wasm.js',
  'tesseract.js-core/tesseract-core-simd.wasm.js',
  'tesseract.js-core/tesseract-core-lstm.wasm.js',
  'tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
]
const ocrAssets = (dir) => ({
  name: 'emit-ocr-assets',
  apply: 'build',
  generateBundle() {
    if (!dir) return
    for (const asset of OCR_ASSETS) {
      this.emitFile({
        type: 'asset',
        fileName: `${dir}/${path.basename(asset)}`,
        source: readFileSync(
          new URL(`./node_modules/${asset}`, import.meta.url),
        ),
      })
    }
  },
})

// INFO: STARRY_DIGITIZER_PWA=off builds without the Service Worker (the
// virtual:pwa-register module still resolves, to a no-op). For a build whose
// new versions must show at once and whose API must never be cached (the
// starryai one, docs/design/starryai-auto.md §4.4).
const pwaDisabled = process.env.STARRY_DIGITIZER_PWA === 'off'

// INFO: STARRY_DIGITIZER_ANALYTICS=off drops the Google tag from index.html,
// so the page never loads anything from Google (the starryai build: an
// internal research tool, docs/design/starryai-auto.md §4.3).
const dropAnalytics = () => ({
  name: 'drop-analytics',
  transformIndexHtml(html) {
    if (process.env.STARRY_DIGITIZER_ANALYTICS !== 'off') return html
    return html.replace(
      /[ \t]*<!-- analytics:start[\s\S]*?<!-- analytics:end -->\n?/,
      '',
    )
  },
})

// https://vitejs.dev/config/
export default defineConfig({
  // INFO: tells the page that it has no Service Worker, so the starryai
  // build's own "new version" check (src/hosting/version) takes over
  define: {
    'import.meta.env.VITE_PWA_OFF': JSON.stringify(pwaDisabled ? '1' : ''),
  },
  plugins: [
    vue(),
    versionJson(),
    dropAnalytics(),
    ocrAssets(process.env.VITE_OCR_ASSET_DIR),
    // INFO: docs/design/pwa-design.md (HQ #59, minimal version) — precaches
    // the built static assets and generates manifest.webmanifest +
    // sw.js. No runtime caching rules needed: the app is fully
    // client-side, there's no API to cache.
    VitePWA({
      // 'prompt': a new deploy leaves the new Service Worker waiting until
      // the user accepts the update via PWAUpdatePrompt.vue (which then
      // calls updateServiceWorker → skipWaiting + reload).
      registerType: 'prompt',
      disable: pwaDisabled,
      workbox: {
        // version.json must always come from the network, never from the
        // (old) Service Worker's precache — otherwise the popup would show
        // the currently-running version instead of the new one.
        globIgnores: ['**/version.json'],
      },
      manifest: {
        name: 'Starry Digitizer',
        short_name: 'Digitizer',
        description:
          'Extract numeric XY data from plot images, right in your browser.',
        theme_color: '#1565C0',
        background_color: '#ffffff',
        display: 'standalone',
        // INFO: relative to the manifest, so a build under another base
        // (vite build --base=/starry-digitizer/) installs that one
        start_url: '.',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8888,
    // INFO: bind IPv4 too — Cypress resolves `localhost` to 127.0.0.1 and
    // cannot verify an IPv6-only baseUrl.
    host: true,
  },
})
