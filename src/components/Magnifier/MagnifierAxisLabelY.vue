<template>
  <div
    :style="{
      position: 'absolute',
      left: `${-18}px`,
      top: `${-10}px`,
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
