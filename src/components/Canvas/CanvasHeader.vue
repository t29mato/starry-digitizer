<template>
  <div class="d-flex justify-end">
    <div></div>
    <div class="ml-2">
      <v-btn small @click="scaleDown"><v-icon>mdi-minus</v-icon></v-btn>
      <v-btn small class="ml-2" @click="scaleUp"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn small class="ml-2" @click="resizeCanvasToOriginal">100%</v-btn>
      <v-btn small class="ml-2" @click="resizeCanvasToFit">Fit</v-btn>
    </div>
    <span class="ma-1">{{ showCanvasScale }}</span>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { CanvasManager as CM } from '@/domains/CanvasManager'
import { DatasetManager as DM } from '@/domains/DatasetManager'
const cm = CM.instance
const dm = DM.instance

export default Vue.extend({
  props: {
    uploadImage: {
      type: Function,
      required: true,
    },
  },
  computed: {
    showCanvasScale(): string {
      return Math.trunc(this.canvasScale * 100) + '%'
    },
    canvasScale(): number {
      return cm.canvasScale
    },
  },
  methods: {
    scaleUp() {
      cm.scaleUp()
      dm.refreshPlots()
    },
    scaleDown() {
      cm.scaleDown()
      dm.refreshPlots()
    },
    resizeCanvasToOriginal() {
      cm.drawOriginalSizeImage()
      dm.refreshPlots()
    },
    resizeCanvasToFit() {
      cm.drawFitSizeImage()
      dm.refreshPlots()
    },
  },
})
</script>
