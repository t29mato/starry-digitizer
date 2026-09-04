<template>
  <label
    class="sd-select"
    :class="[`sd-select--${variant}`, { 'sd-select--disabled': disabled }]"
  >
    <span v-if="label" class="sd-select__label">{{ label }}</span>
    <span class="sd-select__control">
      <span v-if="prefix" class="sd-select__prefix">{{ prefix }}</span>
      <select
        class="sd-select__native"
        :value="modelValue"
        :disabled="disabled"
        v-bind="$attrs"
        @change="onChange"
      >
        <option
          v-for="item in normalizedItems"
          :key="String(item.value)"
          :value="item.value"
        >
          {{ item.title }}
        </option>
      </select>
      <sd-icon class="sd-select__chevron" :path="mdiMenuDown" :size="20" />
    </span>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mdiMenuDown } from '@mdi/js'
import SdIcon from './SdIcon.vue'

// INFO: replacement for <v-select>. Items may be plain strings or
// { title, value } objects, like Vuetify. The native <select> is kept for
// accessibility and testability; only its chrome is restyled.
defineOptions({ inheritAttrs: false })

type Item = string | number | { title: string; value: string | number }

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    items: Item[]
    label?: string
    prefix?: string
    disabled?: boolean
    variant?: 'filled' | 'outlined'
  }>(),
  { label: undefined, prefix: undefined, disabled: false, variant: 'filled' },
)
const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()

const normalizedItems = computed(() =>
  props.items.map((item) =>
    typeof item === 'object' ? item : { title: String(item), value: item },
  ),
)

function onChange(event: Event) {
  const raw = (event.target as HTMLSelectElement).value
  // INFO: <select> only yields strings; map back to the original value so a
  // numeric v-model stays numeric.
  const match = normalizedItems.value.find((i) => String(i.value) === raw)
  emit('update:modelValue', match ? match.value : raw)
}
</script>

<style scoped lang="scss">
.sd-select {
  display: flex;
  flex-direction: column;
  width: 100%;

  &__label {
    font-size: 0.75rem;
    color: var(--sd-text-medium, rgba(0, 0, 0, 0.6));
    margin-bottom: 2px;
  }

  &__control {
    position: relative;
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 8px;
    background: var(--sd-surface, #fff);
    border: 1px solid var(--sd-border, rgba(0, 0, 0, 0.24));
    border-radius: var(--sd-radius, 4px);

    &:focus-within {
      border-color: var(--sd-primary, #1e88e5);
    }
  }

  &__prefix {
    flex: 0 0 auto;
    margin-right: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--sd-text-medium, rgba(0, 0, 0, 0.6));
    white-space: nowrap;
  }

  &__native {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    padding: 0 20px 0 0;
    border: 0;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    color: inherit;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;

    &:disabled {
      color: var(--sd-text-disabled, rgba(0, 0, 0, 0.38));
      cursor: default;
    }
  }

  &__chevron {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--sd-text-medium, rgba(0, 0, 0, 0.6));
  }

  &--filled &__control {
    background: rgba(0, 0, 0, 0.06);
    border-color: transparent;
    border-bottom: 1px solid rgba(0, 0, 0, 0.42);
    border-radius: var(--sd-radius, 4px) var(--sd-radius, 4px) 0 0;
    &:hover {
      background: rgba(0, 0, 0, 0.09);
    }
    &:focus-within {
      border-bottom: 2px solid var(--sd-primary, #1e88e5);
    }
  }

  &--disabled {
    opacity: 0.7;
  }
}
</style>
