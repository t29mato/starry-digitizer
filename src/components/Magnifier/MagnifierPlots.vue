<template>
  <!-- INFO: プロットデータ -->
  <div
    class="magnifier-plots"
    :style="{
      position: 'absolute',
      top: `${(yPx - plotHalfSize) * magnifier.scale}px`,
      left: `${(xPx - plotHalfSize) * magnifier.scale}px`,
      transform: `scale(${magnifier.scale}) translate(-${
        canvas.cursor.xPx - magnifierHalfSize / magnifier.scale
      }px, -${canvas.cursor.yPx - magnifierHalfSize / magnifier.scale}px)`,
      'transform-origin': 'top left',
      'pointer-events': 'none',
      width: `${plotSizePx}px`,
      height: `${plotSizePx}px`,
      'background-color': isActive ? 'red' : 'dodgerblue',
      border: `${1}px solid white`,
      'border-radius': '50%',
    }"
  ></div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { useCanvasStore } from '@/store/modules/canvas'
import { useStyleStore } from '@/store/modules/style'
import { useMagnifierStore } from '@/store/modules/magnifier'
import { Coord } from '@/domains/datasetInterface'

export default defineComponent({
  props: {
    plot: {
      type: Object as () => Coord,
      required: true,
    },
    magnifierSize: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
    },
  },
  setup(props) {
    const { magnifier } = useMagnifierStore()
    const { canvas } = useCanvasStore()
    const { plotSizePx } = useStyleStore()

    const plotHalfSize = computed(() => {
      return plotSizePx.value / 2
    })

    const magnifierHalfSize = computed(() => {
      return props.magnifierSize / 2
    })

    const xPx = computed(() => {
      return props.plot.xPx
    })

    const yPx = computed(() => {
      return props.plot.yPx
    })

    return {
      magnifier,
      canvas,
      plotHalfSize,
      magnifierHalfSize,
      xPx,
      yPx,
    }
  },
})
</script>
