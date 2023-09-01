<template>
  <div class="d-flex justify-end">
    <div></div>
    <div class="ml-2">
      <v-btn small @click="scaleDown"><v-icon>mdi-minus</v-icon></v-btn>
      <v-btn small class="ml-2" @click="scaleUp"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn small class="ml-2" @click="resizeCanvasToOriginal">100%</v-btn>
      <v-btn small class="ml-2" @click="drawFitSizeImage">Fit</v-btn>
    </div>
    <span class="ma-1">{{ showCanvasScale }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useCanvasStore } from '@/store/canvas'
import { mapState, mapActions } from 'pinia'

export default defineComponent({
  props: {},
  computed: {
    ...mapState(useCanvasStore, ['canvas']),
    showCanvasScale(): string {
      return Math.trunc(this.canvas.scale * 100) + '%'
    },
  },
  methods: {
    ...mapActions(useCanvasStore, [
      'scaleUp',
      'scaleDown',
      'resizeCanvasToOriginal',
      'drawFitSizeImage',
    ]),
  },
})
</script>
