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
import { Magnifier } from '@/application/services/magnifier/magnifier'
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      magnifier: Magnifier.getInstance(),
    }
  },
  computed: {
    // INFO: 十字線を作成する箱の横幅
    width(): number {
      return (this.magnifier.sizePx - this.magnifier.crosshairSizePx) / 2
    },
  },
})
</script>
