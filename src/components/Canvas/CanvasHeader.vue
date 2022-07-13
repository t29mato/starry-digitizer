<template>
  <div class="d-flex justify-space-between">
    <v-file-input
      accept="image/*"
      label="file input"
      @change="uploadImage"
      :clearable="false"
      dense
    ></v-file-input>
    <div class="ml-2">
      <v-btn small @click="scaleDown"><v-icon>mdi-minus</v-icon></v-btn>
      <v-btn small class="ml-2" @click="scaleUp"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn small class="ml-2" @click="resizeCanvasToOriginal">100%</v-btn>
      <v-btn small class="ml-2" @click="resizeCanvasToFit">Fit</v-btn>
    </div>
    <span class="ma-1">{{ showScaleRatio }}</span>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: {
    uploadImage: {
      type: Function,
      required: true,
    },
    resizeCanvasToOriginal: {
      type: Function,
      required: true,
    },
    resizeCanvasToFit: {
      type: Function,
      required: true,
    },
    scaleDown: {
      type: Function,
      required: true,
    },
    scaleUp: {
      type: Function,
      required: true,
    },
    scaleRatio: {
      type: Number,
      required: true,
    },
  },
  computed: {
    showScaleRatio(): string {
      return Math.trunc(this.scaleRatio * 100) + '%'
    },
  },
})
</script>
