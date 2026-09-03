<template>
  <span class="sd-tooltip">
    <slot />
    <span class="sd-tooltip__bubble" role="tooltip">{{ text }}</span>
  </span>
</template>

<script setup lang="ts">
// INFO: replacement for <v-tooltip>: pure CSS hover/focus bubble around the
// default slot. Keep `text` short; it is also fine to just use `title=`.
defineProps<{ text: string }>()
</script>

<style scoped lang="scss">
.sd-tooltip {
  position: relative;
  display: inline-flex;

  &__bubble {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 6px);
    z-index: 10;
    transform: translateX(-50%);
    width: max-content;
    max-width: 260px;
    padding: 6px 8px;
    border-radius: var(--sd-radius, 4px);
    background: rgba(50, 50, 50, 0.95);
    color: #fff;
    font-size: 0.75rem;
    white-space: normal;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
  }
  &:hover &__bubble,
  &:focus-within &__bubble {
    opacity: 1;
  }
}
</style>
