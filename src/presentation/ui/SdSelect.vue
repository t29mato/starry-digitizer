<template>
  <label class="sd-select" :class="{ 'sd-select--disabled': disabled }">
    <span v-if="label" class="sd-select__label">{{ label }}</span>
    <select
      class="sd-select__control"
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
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// INFO: replacement for <v-select>. Items may be plain strings or
// { title, value } objects, like Vuetify.
defineOptions({ inheritAttrs: false })

type Item = string | number | { title: string; value: string | number }

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    items: Item[]
    label?: string
    disabled?: boolean
  }>(),
  { label: undefined, disabled: false },
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
    height: 32px;
    padding: 0 8px;
    font: inherit;
    color: inherit;
    background: var(--sd-surface, #fff);
    border: 1px solid var(--sd-border, rgba(0, 0, 0, 0.24));
    border-radius: var(--sd-radius, 4px);
    &:focus {
      outline: none;
      border-color: var(--sd-primary, #1e88e5);
      box-shadow: 0 0 0 1px var(--sd-primary, #1e88e5);
    }
    &:disabled {
      color: var(--sd-text-disabled, rgba(0, 0, 0, 0.38));
      background: var(--sd-surface-variant, #f5f5f5);
    }
  }
}
</style>
