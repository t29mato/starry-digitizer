import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import path, { resolve } from 'path'

// INFO: Library build (`yarn lib-build`). Deliberately separate from
// vite.config.js: the app build enables Sentry, vite-plugin-pwa and
// import.meta.env-driven code, none of which may end up in a package that
// Starrydata3 embeds (integration spec R8, acceptance criterion 3).
//
// INFO: ES + CJS only, no UMD. A UMD bundle must inline every dependency it
// cannot resolve at runtime, which would (a) bundle Vue itself and risk a
// second Vue runtime in the host, and (b) re-embed
// tesseract.js's hard-coded CDN URLs — exactly what R8 forbids, since
// Starrydata3 restricts external origins via CSP.
export default defineConfig({
  plugins: [
    vue(),
    dts({
      tsconfigPath: resolve(__dirname, 'tsconfig.lib.json'),
      outDir: 'library-build/dist',
      // INFO: emits index.d.ts next to index.js so `types` in package.json
      // resolves for both the import and the require condition.
      insertTypesEntry: true,
      staticImport: true,
      // INFO: src/@types/types.d.ts is a hand-written declaration file, so
      // tsc never re-emits it; without this the published .d.ts files would
      // all fail to resolve '@types/types'.
      copyDtsFiles: true,
      // INFO: other agents' app-only files may still have type errors; the
      // declaration build should not be the thing that reports them.
      logDiagnostics: false,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'library-build/dist',
    emptyOutDir: true,
    // INFO: public/ holds standalone-app assets (favicon, PWA icons, sample
    // image). None of them belong in the npm package.
    copyPublicDir: false,
    // INFO: one style.css for the whole library, exposed as
    // `starry-digitizer/styles`; hosts import it once.
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, 'src/library-main.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      // INFO: `vue` is the only peer dependency; the runtime deps below are
      // installed by the host through package.json `dependencies`. @mdi/js
      // (icon path strings) is deliberately NOT external — it is bundled so
      // the host carries no icon package. UI framework: none (see
      // docs/design/framework-dependency-review.md).
      external: (id: string) => {
        if (id.endsWith('.css') || id.endsWith('.scss')) return false
        return [
          /^vue$/,
          /^vue\//,
          /^tesseract\.js/,
          /^jszip$/,
          /^curve-interpolator/,
        ].some((pattern) => pattern.test(id))
      },
    },
  },
})
