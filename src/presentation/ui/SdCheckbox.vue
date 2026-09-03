<template>
  <label class="sd-check" :class="{ 'sd-check--disabled': disabled }">
    <input
      class="sd-check__input"
      :type="type"
      :checked="checked"
      :disabled="disabled"
      :name="name"
      :value="value"
      v-bind="$attrs"
      @change="onChange"
    />
    <span v-if="label || $slots.default" class="sd-check__label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// INFO: replacement for <v-checkbox> and <v-switch> (boolean v-model) and,
// with `type="radio"` + `value`, for <v-radio> inside SdRadioGroup.
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: boolean | string | number
    label?: string
    disabled?: boolean
    type?: 'checkbox' | 'radio'
    value?: string | number
    name?: string
  }>(),
  {
    modelValue: false,
    label: undefined,
    disabled: false,
    type: 'checkbox',
    value: undefined,
    name: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean | string | number]
  change: [value: boolean | string | number]
}>()

const checked = computed(() =>
  props.type === 'radio'
    ? props.modelValue === props.value
    : props.modelValue === true,
)

function onChange(event: Event) {
  const target = event.target as HTMLInputElement
  const next =
    props.type === 'radio' ? (props.value as string | number) : target.checked
  emit('update:modelValue', next)
  emit('change', next)
}
</script>

<style scoped lang="scss">
.sd-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;

  &__input {
    margin: 0;
    width: 16px;
    height: 16px;
    accent-color: var(--sd-primary, #1e88e5);
    cursor: inherit;
  }
  &__label {
    font-size: 0.875rem;
  }
  &--disabled {
    cursor: default;
    color: var(--sd-text-disabled, rgba(0, 0, 0, 0.38));
  }
}
</style>
