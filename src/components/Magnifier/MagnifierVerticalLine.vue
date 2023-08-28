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
import Vue from 'vue'
import { mapGetters } from 'vuex'

export default Vue.extend({
  props: {},
  computed: {
    ...mapGetters('magnifier', { magnifier: 'magnifier' }),
    // INFO: 十字線を作成する箱の横幅
    width(): number {
      return (this.magnifier.sizePx - this.magnifier.crosshairSizePx) / 2
    },
  },
})
</script>
