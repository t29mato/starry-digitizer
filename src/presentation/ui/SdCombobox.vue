<template>
  <span class="sd-combobox">
    <sd-text-field
      :model-value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :variant="variant"
      :list="listId"
      v-bind="$attrs"
      @update:model-value="$emit('update:modelValue', String($event))"
    />
    <datalist :id="listId">
      <option v-for="item in items" :key="item" :value="item" />
    </datalist>
  </span>
</template>

<script setup lang="ts">
import SdTextField from './SdTextField.vue'

// INFO: replacement for <v-combobox>: a text input with native <datalist>
// suggestions. Free text stays allowed, which is exactly what the dataset
// name field needs (datasetNameCandidates).
defineOptions({ inheritAttrs: false })

let counter = 0

withDefaults(
  defineProps<{
    modelValue: string
    items: string[]
    placeholder?: string
    disabled?: boolean
    readonly?: boolean
    variant?: 'outlined' | 'underlined'
  }>(),
  {
    placeholder: undefined,
    disabled: false,
    readonly: false,
    variant: 'outlined',
  },
)
defineEmits<{ 'update:modelValue': [value: string] }>()

const listId = `sd-combobox-${++counter}`
</script>

<style scoped>
.sd-combobox {
  display: block;
  width: 100%;
}
</style>
