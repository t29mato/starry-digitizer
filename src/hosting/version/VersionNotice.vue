<template>
  <!-- INFO: a small fixed bar like PWAUpdatePrompt.vue (which the starryai
       build does not have): outside the .starry-digitizer root, so it
       carries its own styles -->
  <div class="version-notice" data-cy="version-notice" role="status">
    <span class="version-notice__text">A new version is available.</span>
    <button
      type="button"
      class="version-notice__reload"
      data-cy="version-notice-reload"
      :disabled="busy"
      @click="$emit('reload')"
    >
      {{ busy ? 'Saving…' : 'Reload' }}
    </button>
    <button
      type="button"
      class="version-notice__close"
      data-cy="version-notice-close"
      aria-label="Later"
      title="Later"
      :disabled="busy"
      @click="$emit('dismiss')"
    >
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
// INFO: F17 (docs/design/starryai-auto.md). The page never reloads by
// itself: the person may be in the middle of placing points.
defineProps<{ busy?: boolean }>()
defineEmits<{ reload: []; dismiss: [] }>()
</script>

<style scoped lang="scss">
.version-notice {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 12px;
  border-radius: 4px;
  background: #fff;
  color: rgba(0, 0, 0, 0.87);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-size: 0.875rem;

  &__reload {
    padding: 2px 10px;
    border: 0;
    border-radius: 4px;
    background: #1e88e5;
    color: #fff;
    font: inherit;
    cursor: pointer;
    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
  }

  &__close {
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
  }
}
</style>
