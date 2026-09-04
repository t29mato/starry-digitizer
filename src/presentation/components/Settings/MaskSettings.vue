<template>
  <div class="mt-0 mb-0">
    <h5 class="mb-0">Selection Area</h5>
    <div class="d-flex align-center flex-wrap mb-2">
      <!-- INFO: replacement for <v-btn-toggle>: clicking the active tool
           deselects it (MASK_MODE.UNSET), same as Vuetify's toggle. -->
      <div class="c__mask-tools" role="group" aria-label="Selection Area">
        <sd-button
          v-for="tool in tools"
          :key="tool.label"
          size="small"
          class="pa-1"
          :color="canvasHandler.maskMode === tool.mode ? 'primary' : ''"
          :variant="
            canvasHandler.maskMode === tool.mode ? 'elevated' : 'outlined'
          "
          :disabled="options.readonly"
          :data-cy="tool.dataCy"
          @click="change(tool.mode)"
        >
          {{ tool.label }}
        </sd-button>
      </div>
      <sd-button
        size="small"
        class="ml-1"
        data-cy="mask-clear"
        :disabled="options.readonly || !canvasHandler.isDrawnMask"
        @click="clearMask"
      >
        Clear
      </sd-button>
    </div>
    <sd-text-field
      v-if="maskModeIsPen"
      :model-value="canvasHandler.penToolSizePx"
      @change="onChangePenToolSizePx"
      type="number"
      prefix="Pen Size:"
      suffix="px"
      :disabled="options.readonly"
    ></sd-text-field>
    <sd-text-field
      v-if="maskModeIsEraser"
      :model-value="canvasHandler.eraserSizePx"
      @change="onChangeEraserSizePx"
      type="number"
      prefix="Eraser Size:"
      suffix="px"
      :disabled="options.readonly"
    ></sd-text-field>
  </div>
</template>

<script lang="ts">
import { MASK_MODE } from '@/constants'
import { defineComponent } from 'vue'
import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { SdButton, SdTextField } from '@/presentation/ui'

export default defineComponent({
  components: { SdButton, SdTextField },
  setup() {
    const { canvasHandler } = useDigitizerContext()
    const options = useDigitizerOptions()
    return { canvasHandler, options }
  },
  data() {
    return {
      tools: [
        { label: 'Pen', mode: MASK_MODE.PEN, dataCy: 'mask-pen' },
        { label: 'Box', mode: MASK_MODE.BOX, dataCy: 'mask-box' },
        { label: 'Eraser', mode: MASK_MODE.ERASER, dataCy: 'mask-eraser' },
      ],
    }
  },
  computed: {
    maskModeIsPen() {
      return this.canvasHandler.maskMode === MASK_MODE.PEN
    },
    maskModeIsEraser() {
      return this.canvasHandler.maskMode === MASK_MODE.ERASER
    },
  },
  methods: {
    onChangePenToolSizePx(event: Event) {
      this.canvasHandler.setPenToolSizePx(
        Number((<HTMLInputElement>event.target).value),
      )
    },
    onChangeEraserSizePx(event: Event) {
      this.canvasHandler.setEraserSizePx(
        Number((<HTMLInputElement>event.target).value),
      )
    },
    change(value: number) {
      if (this.canvasHandler.maskMode === value) {
        this.canvasHandler.setMaskMode(MASK_MODE.UNSET)
        return
      }
      this.canvasHandler.setMaskMode(value)
    },
    clearMask() {
      this.canvasHandler.clearMask()
      // INFO: マスク削除後はマスク描画されておらず消しゴムツールを使う必要ないため。
      if (this.canvasHandler.maskMode === MASK_MODE.ERASER) {
        this.canvasHandler.setMaskMode(MASK_MODE.UNSET)
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.c__mask-tools {
  display: inline-flex;

  :deep(.sd-btn) {
    border-radius: 0;
    &:first-child {
      border-top-left-radius: var(--sd-radius, 4px);
      border-bottom-left-radius: var(--sd-radius, 4px);
    }
    &:last-child {
      border-top-right-radius: var(--sd-radius, 4px);
      border-bottom-right-radius: var(--sd-radius, 4px);
    }
    & + .sd-btn {
      margin-left: -1px;
    }
  }
}
</style>
