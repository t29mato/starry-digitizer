<template>
  <div class="sd-radio-group" :class="{ 'sd-radio-group--inline': inline }">
    <span v-if="label" class="sd-radio-group__label">{{ label }}</span>
    <sd-checkbox
      v-for="option in options"
      :key="String(option.value)"
      type="radio"
      :name="name"
      :value="option.value"
      :label="option.label"
      :disabled="disabled || option.disabled"
      :model-value="modelValue"
      :data-value="option.value"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import SdCheckbox from './SdCheckbox.vue'

// INFO: replacement for <v-radio-group> + <v-radio>. Options are passed as
// data instead of children to keep the markup trivial.
export interface SdRadioOption {
  label: string
  value: string | number
  disabled?: boolean
}

withDefaults(
  defineProps<{
    modelValue: string | number
    options: SdRadioOption[]
    name: string
    label?: string
    disabled?: boolean
    inline?: boolean
  }>(),
  { label: undefined, disabled: false, inline: true },
)
defineEmits<{ 'update:modelValue': [value: string | number] }>()
</script>

<style scoped lang="scss">
.sd-radio-group {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &--inline {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }
  &__label {
    font-size: 0.75rem;
    color: var(--sd-text-medium, rgba(0, 0, 0, 0.6));
  }
}
</style>
