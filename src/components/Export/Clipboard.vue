<template>
  <div>
    <v-textarea
      readonly
      :value="convertPlotsIntoText"
      outlined
      hide-details="true"
    ></v-textarea>
    <v-btn @click="copy" text :disabled="convertPlotsIntoText.length === 0"
      >Copy to Clipboard</v-btn
    >
    <v-checkbox
      label="show Pixel"
      v-model="shouldShowPixel"
      dense
      hide-details
    ></v-checkbox>
    <v-checkbox
      label="show Value"
      v-model="shouldShowValue"
      dense
      hide-details
    ></v-checkbox>
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
          if (this.shouldShowPixel && this.shouldShowValue) {
            return prev + `${cur.xPx}, ${cur.yPx}, ${cur.xV}, ${cur.yV}\n`
          }
          if (this.shouldShowPixel) {
            return prev + `${cur.xPx}, ${cur.yPx}\n`
          }
          if (this.shouldShowValue) {
            return prev + `${cur.xV}, ${cur.yV}\n`
          }
          return prev
        }, '')
        .trim()
    },
  },
  data() {
    return {
      activeColor: colors.green.lighten5,
      shouldShowPixel: true,
      shouldShowValue: true,
    }
  },
  props: {
    plots: {
      type: [] as PropType<PlotValue[]>,
    },
  },
  methods: {
    copy(): void {
      navigator.clipboard.writeText(this.convertPlotsIntoText)
    },
  },
})
</script>
