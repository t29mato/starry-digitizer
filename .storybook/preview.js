import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import { options } from '../src/plugins/vuetify.ts'

// Vuetifyを設定し、vuetifyインスタンスを作成
Vue.use(Vuetify)
const vuetify = new Vuetify(options)

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
}

// decoratorsでvuetifyインスタンスをVueのオプションに登録
export const decorators = [
  (story, context) => {
    const wrapped = story(context)
    return Vue.extend({
      vuetify,
      components: { wrapped },
      template: `
        <v-app>
          <v-container fluid>
            <wrapped />
          </v-container>
        </v-app>
      `,
    })
  },
]
