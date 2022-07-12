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
      <v-btn @click="resizeCanvasToOriginal">100%</v-btn>
      <v-btn class="ml-2" @click="resizeCanvasToFit">Fit</v-btn>
    </div>
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
  },
})
</script>
