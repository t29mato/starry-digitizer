<template>
  <label class="sd-file" :class="{ 'sd-file--disabled': disabled }">
    <span v-if="label" class="sd-file__label">{{ label }}</span>
    <input
      class="sd-file__input"
      type="file"
      :accept="accept"
      :disabled="disabled"
      v-bind="$attrs"
      @change="$emit('change', $event)"
    />
  </label>
</template>

<script setup lang="ts">
// INFO: replacement for <v-file-input>. Emits the raw change event so the
// caller reads `event.target.files` exactly as before.
defineOptions({ inheritAttrs: false })
withDefaults(
  defineProps<{ label?: string; accept?: string; disabled?: boolean }>(),
  { label: undefined, accept: undefined, disabled: false },
)
defineEmits<{ change: [event: Event] }>()
</script>

<style scoped lang="scss">
.sd-file {
  display: flex;
  flex-direction: column;
  width: 100%;
  &__label {
    font-size: 0.75rem;
    color: var(--sd-text-medium, rgba(0, 0, 0, 0.6));
    margin-bottom: 2px;
  }
  &__input {
    font: inherit;
    font-size: 0.8rem;
    width: 100%;
  }
  &--disabled {
    opacity: 0.6;
  }
}
</style>
