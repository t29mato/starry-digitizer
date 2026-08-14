import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path, { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // INFO: plot-digitizer-core is not npm-linked (see
      // docs/design/plot-digitizer-architecture.md Phase 0/1) — resolve it
      // straight to its TS source via alias instead.
      '@plot-digitizer/core': path.resolve(
        __dirname,
        './packages/plot-digitizer-core/src/index.ts',
      ),
    },
  },
  build: {
    outDir: 'library-build/dist',
    lib: {
      entry: resolve(__dirname, 'library-build/entry.ts'),
      name: 'starry-digitizer',
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
})
