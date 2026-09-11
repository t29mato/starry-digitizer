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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    versionJson(),
    // INFO: docs/design/pwa-design.md (HQ #59, minimal version) — precaches
    // the built static assets and generates manifest.webmanifest +
    // sw.js. No runtime caching rules needed: the app is fully
    // client-side, there's no API to cache.
    VitePWA({
      // 'prompt': a new deploy leaves the new Service Worker waiting until
      // the user accepts the update via PWAUpdatePrompt.vue (which then
      // calls updateServiceWorker → skipWaiting + reload).
      registerType: 'prompt',
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
        start_url: '/',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
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
