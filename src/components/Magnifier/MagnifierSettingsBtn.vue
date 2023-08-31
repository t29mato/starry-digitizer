<template>
  <v-btn
    small
    @click="toggleSettingsDialog"
    :style="{
      position: 'absolute',
      top: '0px',
      left: '173px',
      'z-index': 100,
    }"
    icon
    ><v-icon small>mdi-cog</v-icon></v-btn
  >
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  computed: {},
  props: {
    toggleSettingsDialog: {
      type: Function,
      required: true,
    },
  },
})
</script>
