<template>
  <label class="sd-field" :class="{ 'sd-field--disabled': disabled }">
    <span v-if="label" class="sd-field__label">{{ label }}</span>
    <input
      class="sd-field__input"
      :class="{ 'sd-field__input--underlined': variant === 'underlined' }"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :step="step"
      :min="min"
      :max="max"
      :list="list"
      v-bind="$attrs"
      @input="onInput"
      @change="$emit('change', $event)"
      @keydown="$emit('keydown', $event)"
      @keyup="$emit('keyup', $event)"
      @focus="$emit('focus', $event)"
      @blur="$emit('blur', $event)"
    />
  </label>
</template>

<script setup lang="ts">
// INFO: replacement for <v-text-field>. Number inputs emit numbers (like
// Vuetify with `type="number"` + `.number`), everything else emits strings.
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    label?: string
    placeholder?: string
    type?: string
    disabled?: boolean
    readonly?: boolean
    variant?: 'outlined' | 'underlined'
    step?: string | number
    min?: string | number
    max?: string | number
    list?: string
  }>(),
  {
    modelValue: '',
    label: undefined,
    placeholder: undefined,
    type: 'text',
    disabled: false,
    readonly: false,
    variant: 'outlined',
    step: undefined,
    min: undefined,
    max: undefined,
    list: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  change: [event: Event]
  keydown: [event: KeyboardEvent]
  keyup: [event: KeyboardEvent]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  if (props.type === 'number') {
    // INFO: keep the raw string while the user is mid-edit ("1e", "-"),
    // hand back a number once it parses.
    const parsed = parseFloat(target.value)
    emit('update:modelValue', Number.isNaN(parsed) ? target.value : parsed)
    return
  }
  emit('update:modelValue', target.value)
}
</script>

<style scoped lang="scss">
.sd-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;

  &__label {
    font-size: 0.75rem;
    color: var(--sd-text-medium, rgba(0, 0, 0, 0.6));
    margin-bottom: 2px;
  }

  &__input {
    width: 100%;
    min-width: 0;
    height: 32px;
    padding: 0 8px;
    font: inherit;
    color: inherit;
    background: var(--sd-surface, #fff);
    border: 1px solid var(--sd-border, rgba(0, 0, 0, 0.24));
    border-radius: var(--sd-radius, 4px);
    outline: none;

    &:focus {
      border-color: var(--sd-primary, #1e88e5);
      box-shadow: 0 0 0 1px var(--sd-primary, #1e88e5);
    }
    &:disabled {
      color: var(--sd-text-disabled, rgba(0, 0, 0, 0.38));
      background: var(--sd-surface-variant, #f5f5f5);
    }
    &--underlined {
      height: 28px;
      padding: 0 4px;
      border-width: 0 0 1px 0;
      border-radius: 0;
      background: transparent;
      &:focus {
        box-shadow: 0 1px 0 0 var(--sd-primary, #1e88e5);
      }
    }
  }

  &--disabled {
    opacity: 0.8;
  }
}
</style>
