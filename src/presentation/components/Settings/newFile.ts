import { defineComponent } from 'vue'
import { SymbolExtractByArea } from '@plot-digitizer/core'

export default defineComponent({
  data() {
    return {
      symbolExtractByArea: SymbolExtractByArea.instance,
    }
  },
  methods: {
    inputMin(value: string) {
      this.symbolExtractByArea.setMinDiameterPx(parseInt(value))
    },
    inputMax(value: string) {
      this.symbolExtractByArea.setMaxDiameterPx(parseInt(value))
    },
  },
})
