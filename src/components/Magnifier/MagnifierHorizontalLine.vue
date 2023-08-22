<template>
  <div
    :style="{
      position: 'absolute',
      top: '0px',
      left: '0px',
      width: `${magnifier.sizePx}px`,
      height: `${height}px`,
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
    const height = computed(() => {
      return (magnifier.value.sizePx - magnifier.value.crosshairSizePx) / 2
    })

    return {
      magnifier,
      height,
    }
  },
}
</script>
