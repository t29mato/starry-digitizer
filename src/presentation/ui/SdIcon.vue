<template>
  <svg
    class="sd-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="path" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
// INFO: inline SVG from @mdi/js (a string per icon) — no icon font, no CSS,
// tree-shakeable. Usage: <sd-icon :path="mdiPlus" />
withDefaults(defineProps<{ path: string; size?: number | string }>(), {
  size: 18,
})
</script>

<style scoped>
.sd-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
