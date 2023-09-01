import { createApp } from 'vue'
import App from './App.vue'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'

const pinia = createPinia()

const vuetify = createVuetify({
  components,
  directives,
})

createApp(App).use(pinia).use(vuetify).mount('#app')
