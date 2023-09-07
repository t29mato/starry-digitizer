<template>
  <v-btn
    size="small"
    @click="toggleSettingsDialog"
    :style="{
      position: 'absolute',
      top: '0px',
      left: '173px',
      'z-index': 100,
    }"
    icon
    ><v-icon size="small">mdi-cog</v-icon></v-btn
  >
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  computed: {},
  props: {
    toggleSettingsDialog: {
      type: Function,
      required: true,
    },
  },
})
</script>
