<template>
  <div
    :style="{
      position: 'absolute',
      top: '0px',
      left: '0px',
      width: `${width}px`,
      height: `${magnifier.sizePx}px`,
      outline: '1px solid grey',
    }"
  ></div>
</template>

<script lang="ts">
import { computed } from 'vue'
import { useMagnifierStore } from '@/store/modules/magnifier'

export default {
  props: {},
  setup() {
    const { magnifier } = useMagnifierStore()

    // INFO: 十字線を作成する箱の横幅
    const width = computed(() => {
      return (magnifier.value.sizePx - magnifier.value.crosshairSizePx) / 2
    })

    return {
      width,
      magnifier,
    }
  },
}
</script>
