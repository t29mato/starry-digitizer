<template>
  <sd-button
    class="c__settings-btn"
    size="small"
    variant="text"
    :icon="mdiCog"
    title="Settings"
    @click="toggleSettingsDialog()"
  ></sd-button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mdiCog } from '@mdi/js'
import { SdButton } from '@/presentation/ui'

export default defineComponent({
  components: { SdButton },
  props: {
    toggleSettingsDialog: {
      type: Function,
      required: true,
    },
  },
  data() {
    return { mdiCog }
  },
})
</script>

<style lang="scss" scoped>
// INFO: pinned to the magnifier's top-right corner (was an inline :style
// on the Vuetify button).
.c__settings-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  z-index: 100;
}
</style>
