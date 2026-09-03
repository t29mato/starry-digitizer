import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// INFO: port 5174 is what the host-app Cypress specs point at
// (cypress.config.ts, CYPRESS_HOST_APP=1).
export default defineConfig({
  plugins: [vue()],
  server: {
    // INFO: bind every interface (not just ::1) so Cypress' IPv4 baseUrl
    // check against http://localhost:5174 succeeds.
    host: true,
    port: 5174,
    strictPort: true,
  },
  optimizeDeps: {
    // INFO: starry-digitizer is a file: dependency built by `yarn lib-build`.
    // Excluding it keeps Vite from pre-bundling a stale copy after a rebuild.
    exclude: ['starry-digitizer'],
  },
})
