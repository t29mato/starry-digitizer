<template>
  <div>
    <v-textarea
      :value="convertPlotsIntoText"
      outlined
      hide-details="true"
      @change="changeTextArea"
    ></v-textarea>
    <div class="mt-2">
      <v-btn small @click="copy" :disabled="convertPlotsIntoText.length === 0"
        >Copy to Clipboard</v-btn
      >
      <v-btn v-if="exportBtnText" @click="exportPlots" class="ml-2">{{
        exportBtnText
      }}</v-btn>
    </div>
  </div>
</template>

<script lang="ts">
import { PlotValue } from '../../types'
import Vue, { PropType } from 'vue'
import colors from 'vuetify/lib/util/colors'
export default Vue.extend({
  computed: {
    convertPlotsIntoText(): string {
      return this.ceiledPlots
        .reduce((prev, cur) => {
          return prev + `${cur.xV}, ${cur.yV}\n`
        }, '')
        .trim()
    },
    ceiledPlots(): {
      id: number
      xV: string
      yV: string
      xPx: number
      yPx: number
    }[] {
      return this.plots.map((plot) => {
        return {
          xPx: Math.ceil(plot.xPx),
          yPx: Math.ceil(plot.yPx),
          id: plot.id,
          xV: plot.xV,
          yV: plot.yV,
        }
      })
    },
  },
  data() {
    return {
      activeColor: colors.green.lighten5,
      textArea: '',
    }
  },
  props: {
    plots: {
      type: [] as PropType<PlotValue[]>,
    },
    exportBtnText: {
      type: String,
    },
    exportPlots: Function,
  },
  methods: {
    copy(): void {
      navigator.clipboard.writeText(this.textArea || this.convertPlotsIntoText)
    },
    changeTextArea(text: string): void {
      this.textArea = text
    },
  },
})
</script>
