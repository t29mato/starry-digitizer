// Import the Vue component
import Main from './presentation/components/Main.vue'

// Define the install function executed by Vue.use()
export function install(Vue) {
  if (install.installed) return
  install.installed = true
  Vue.component(Main, Main)
}

// Create module definition for Vue.use()
const plugin = {
  install,
}

// Automatically install when Vue is found (e.g. when used via a <script> tag in a browser)
let GlobalVue = null
if (typeof window !== 'undefined') {
  GlobalVue = window.Vue
} else if (typeof global !== 'undefined') {
  GlobalVue = global.Vue
}
if (GlobalVue) {
  GlobalVue.use(plugin)
}

// Export the component so it can be used as a module (e.g. via npm/webpack)
export default Main
