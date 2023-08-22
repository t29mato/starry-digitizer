<template>
  <div
    :style="{
      position: 'absolute',
      left: `${4}px`,
      top: `${8}px`,
    }"
  >
    {{ label }}
  </div>
</template>

<script lang="ts">
export default {
  props: {
    label: String,
  },
}
</script>
