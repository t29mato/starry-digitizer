// import Vue from 'vue'
// import App from './App.vue'
// import vuetify from './plugins/vuetify'

// require('./styles/style.scss')

// Vue.config.productionTip = false

// new Vue({
//   vuetify,
//   render: (h) => h(App),
// }).$mount('#app')

import { createApp } from 'vue'
import App from './App.vue'

// Vuetify
import 'vuetify/_styles.scss'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify'
import * as directives from 'vuetify'

const vuetify = createVuetify({
  components,
  directives,
})

createApp(App).use(vuetify).mount('#app')
