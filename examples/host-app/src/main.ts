import { createApp } from 'vue'
import App from './App.vue'

// INFO: the library depends on nothing but `vue` — no Vuetify, no icon font.
// Its styles are scoped under `.starry-digitizer`, so this single import
// cannot leak into the host's own markup. This is exactly how Starrydata3
// is configured.
import 'starry-digitizer/styles'

createApp(App).mount('#app')
