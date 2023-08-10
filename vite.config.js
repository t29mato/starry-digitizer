import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'
import { VuetifyResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [VuetifyResolver()],
    }),
  ],
  server: {
    host: true,
  },
  define: { 'process.env': {} },
  resolve: {
    alias: [{ find: '@', replacement: '/src' }],
  },
  css: {
    preprocessorOptions: {
      // scss: {
      //   additionalData: "\n@import 'src/styles/variables.scss';\n",
      // },
    },
  },
})
