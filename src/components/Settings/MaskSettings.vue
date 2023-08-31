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
      @change="setPenToolSizePx"
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
import { defineComponent } from "vue";
import { mapGetters, mapActions } from 'vuex'

export default defineComponent({
  computed: {
    ...mapGetters('canvas', { canvas: 'canvas' }),
  },
  props: {},
  methods: {
    ...mapActions('canvas', [
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
    clearMask() {
      this.canvas.clearMask()
      // INFO: マスク削除後はマスク描画されておらず消しゴムツールを使う必要ないため。
      if (this.canvas.maskMode === 2) {
        this.canvas.maskMode = -1
      }
    },
  },
})
</script>
