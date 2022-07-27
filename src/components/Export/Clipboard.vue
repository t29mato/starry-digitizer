<template>
  <div>
    <v-textarea
      :value="convertPlotsIntoText"
      outlined
      hide-details="true"
      @change="changeTextArea"
      height="50vh"
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
      return this.plots
        .reduce((prev, cur) => {
          return prev + `${cur.xV}, ${cur.yV}\n`
        }, '')
        .trim()
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
