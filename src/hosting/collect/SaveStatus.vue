<template>
  <span
    v-if="text"
    class="save-status"
    :class="{ 'save-status--warn': view.state !== 'saved' }"
    data-cy="save-status"
    role="status"
    >{{ text }}</span
  >
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SaveView, saveStatusText } from './projectSaver'

// INFO: the footer line of the work saved on the server (projectSaver.ts)
const props = defineProps<{ view: SaveView }>()
const text = computed(() => saveStatusText(props.view))
</script>

<style scoped lang="scss">
.save-status {
  font-size: 0.8em;
  &--warn {
    color: #ffcdd2;
    font-weight: bold;
  }
}
</style>
