import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// INFO: port 5174 is what the host-app Cypress specs point at
// (cypress.config.ts, CYPRESS_HOST_APP=1).
export default defineConfig({
  // INFO: plugin-vue only for this example's own App.vue. The library ships
  // already-compiled render functions and no UI-framework plugin is needed.
  plugins: [vue()],
  resolve: {
    // INFO: `starry-digitizer` is a file: dependency, so npm symlinks it to
    // the repository root and its own `vue` import resolves against the ROOT
    // node_modules — a second copy of Vue. dedupe pins every `vue` import to
    // this project's copy. Real installs from npm do not need this.
    dedupe: ['vue'],
  },
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
    // INFO: ...but that also hides the library's own bare imports from Vite's
    // dependency scan, so they are discovered only once the page runs and
    // trigger a re-optimization reload. Listing them pre-bundles them up front.
    include: ['curve-interpolator', 'jszip'],
  },
})
