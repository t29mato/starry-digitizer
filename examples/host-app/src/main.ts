import { createApp } from 'vue'
import App from './App.vue'

// Vuetify: the host owns the single Vuetify instance; the library declares it
// as a peer dependency and never creates one of its own.
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// Library styles, scoped under .starry-digitizer.
import 'starry-digitizer/styles'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
})

createApp(App).use(vuetify).mount('#app')
