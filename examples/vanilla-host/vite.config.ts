import { defineConfig } from 'vite'

// INFO: no @vitejs/plugin-vue here on purpose. This host owns no .vue file, and
// the `starry-digitizer` package ships already-compiled render functions, so
// nothing in the graph needs SFC compilation. See README.md.
export default defineConfig({
  server: {
    // INFO: bind every interface so Cypress' IPv4 baseUrl check against
    // http://localhost:5175 succeeds.
    host: true,
    port: 5175,
    strictPort: true,
  },
  resolve: {
    // INFO: `starry-digitizer` is a file: dependency, so npm symlinks it to the
    // repository root and its own `vue` import resolves against the ROOT
    // node_modules — a second copy of Vue. dedupe pins every `vue` import to
    // this project's copy. Real installs from npm do not need this.
    dedupe: ['vue'],
  },
  define: {
    // INFO: @vitejs/plugin-vue is what normally injects Vue's compile-time
    // feature flags. Without it, vue's esm-bundler build logs a warning and
    // falls back to defaults, so we set them here. The Options API flag must
    // stay true: several library components are still Options API.
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
  optimizeDeps: {
    // INFO: starry-digitizer is a file: dependency built by `yarn lib-build`
    // at the repo root. Excluding it keeps Vite from pre-bundling a stale copy.
    exclude: ['starry-digitizer'],
    // INFO: ...but that also hides the library's own bare imports from Vite's
    // dependency scan, so they are discovered only once the page runs and
    // trigger a re-optimization reload. Listing them pre-bundles them up front.
    include: ['curve-interpolator', 'jszip'],
  },
})
