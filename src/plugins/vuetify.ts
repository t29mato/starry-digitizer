import Vue from 'vue'
import Vuetify from 'vuetify/lib/framework'
import '@mdi/font/css/materialdesignicons.css'

Vue.use(Vuetify)

export const options = {
  icons: {
    iconfont: 'mdi',
  },
}

export default new Vuetify({ options })
