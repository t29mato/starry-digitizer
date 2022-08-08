<template>
  <div>
    <h5>Selection Area</h5>
    <v-btn-toggle :value="canvas.maskMode" @change="change" dense class="pl-2">
      <v-btn small color="primary"> Pen </v-btn>
      <v-btn small color="primary"> Box </v-btn>
      <v-btn small color="primary"> Eraser </v-btn>
    </v-btn-toggle>
    <v-btn
      small
      class="ml-1"
      :disabled="!canvas.isDrawnMask"
      @click="clearMask"
    >
      Clear
    </v-btn>
    <v-text-field
      v-if="canvas.maskMode === 0"
      :value="canvas.penToolSizePx"
      @change="setPenToolSize"
      type="number"
      hide-details
      label="Pen Size"
    ></v-text-field>
    <v-text-field
      v-if="canvas.maskMode === 2"
      :value="canvas.eraserSizePx"
      @change="setEraserSizePx"
      type="number"
      hide-details
      label="Eraser Size (px)"
    ></v-text-field>
  </div>
</template>

<script lang="ts">
import { canvasMapper } from '@/store/modules/canvas'
import Vue from 'vue'
export default Vue.extend({
  computed: {
    ...canvasMapper.mapGetters(['canvas']),
  },
  props: {
    clearMask: {
      type: Function,
      required: true,
    },
    // penToolSize: {
    //   type: Number,
    //   required: true,
    // },
    // setPenToolSize: {
    //   type: Function,
    //   required: true,
    // },
  },
  methods: {
    ...canvasMapper.mapActions([
      'setPenToolSizePx',
      'setMaskMode',
      'setEraserSizePx',
    ]),
    change(value: any) {
      if (value === undefined) {
        this.setMaskMode(-1)
        return
      }
      this.setMaskMode(value)
    },
  },
})
</script>
