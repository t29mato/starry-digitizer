<template>
  <div class="d-flex justify-end">
    <div></div>
    <div class="ml-2">
      <v-btn size="small" @click="scaleDown"><v-icon>mdi-minus</v-icon></v-btn>
      <v-btn size="small" class="ml-2" @click="scaleUp"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn size="small" class="ml-2" @click="resizeCanvasToOriginal"
        >100%</v-btn
      >
      <v-btn size="small" class="ml-2" @click="drawFitSizeImage">Fit</v-btn>
    </div>
    <span class="ma-1">{{ showCanvasScale }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCanvasStore } from '@/store/modules/canvas'

const canvasStore = useCanvasStore()

const showCanvasScale = computed(() => {
  return Math.trunc(canvasStore.canvas.value.scale * 100) + '%'
})

function scaleUp() {
  canvasStore.scaleUp()
}

function scaleDown() {
  canvasStore.scaleDown()
}

function resizeCanvasToOriginal() {
  canvasStore.resizeCanvasToOriginal()
}

function drawFitSizeImage() {
  canvasStore.drawFitSizeImage()
}
</script>
