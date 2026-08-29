import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // INFO: docs/design/pwa-design.md (HQ #59, minimal version) — precaches
    // the built static assets and generates manifest.webmanifest +
    // sw.js. No runtime caching rules needed: the app is fully
    // client-side, there's no API to cache.
    VitePWA({
      registerType: 'autoUpdate',
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
  },
})
