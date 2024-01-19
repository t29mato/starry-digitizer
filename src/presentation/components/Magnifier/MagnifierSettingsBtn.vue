<template>
  <v-btn
    size="small"
    @click="toggleSettingsDialog"
    :style="{
      position: 'absolute',
      top: '-4px',
      right: '-4px',
      'z-index': 100,
    }"
    icon
    elevation="0"
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
