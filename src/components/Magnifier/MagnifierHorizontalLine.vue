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
import { defineComponent } from "vue";
import { mapGetters } from 'vuex'

export default defineComponent({
  props: {},
  computed: {
    ...mapGetters('magnifier', { magnifier: 'magnifier' }),
    // INFO: 十字線を作成する箱の横幅
    height(): number {
      return (this.magnifier.sizePx - this.magnifier.crosshairSizePx) / 2
    },
  },
})
</script>
