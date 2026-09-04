<template>
  <label
    class="sd-field"
    :class="[`sd-field--${variant}`, { 'sd-field--disabled': disabled }]"
  >
    <span v-if="label" class="sd-field__label">{{ label }}</span>
    <span class="sd-field__control">
      <span v-if="prefix" class="sd-field__prefix">{{ prefix }}</span>
      <input
        class="sd-field__input"
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
      <span v-if="suffix" class="sd-field__suffix">{{ suffix }}</span>
    </span>
  </label>
</template>

<script setup lang="ts">
// INFO: replacement for <v-text-field>. The default `filled` variant mimics
// Vuetify's filled/compact look the app always had (grey field, rounded top,
// thin bottom border, inline prefix/suffix such as "x1:" or "px").
// Number inputs emit numbers (like Vuetify with `type="number"`), everything
// else emits strings.
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    label?: string
    placeholder?: string
    prefix?: string
    suffix?: string
    type?: string
    disabled?: boolean
    readonly?: boolean
    variant?: 'filled' | 'outlined' | 'underlined'
    step?: string | number
    min?: string | number
    max?: string | number
    list?: string
  }>(),
  {
    modelValue: '',
    label: undefined,
    placeholder: undefined,
    prefix: undefined,
    suffix: undefined,
    type: 'text',
    disabled: false,
    readonly: false,
    variant: 'filled',
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

  &__control {
    display: flex;
    align-items: center;
    min-width: 0;
    height: 32px;
    padding: 0 8px;
    background: var(--sd-surface, #fff);
    border: 1px solid var(--sd-border, rgba(0, 0, 0, 0.24));
    border-radius: var(--sd-radius, 4px);
    transition:
      border-color 0.15s,
      background-color 0.15s;

    &:focus-within {
      border-color: var(--sd-primary, #1e88e5);
      box-shadow: 0 0 0 1px var(--sd-primary, #1e88e5);
    }
  }

  &__prefix,
  &__suffix {
    flex: 0 0 auto;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--sd-text-medium, rgba(0, 0, 0, 0.6));
    white-space: nowrap;
  }
  &__prefix {
    margin-right: 6px;
  }
  &__suffix {
    margin-left: 6px;
  }

  &__input {
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    height: 100%;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    color: inherit;

    &::placeholder {
      font-weight: 400;
      color: var(--sd-text-medium, rgba(0, 0, 0, 0.6));
    }
    &:disabled {
      color: var(--sd-text-disabled, rgba(0, 0, 0, 0.38));
    }
  }

  // Vuetify "filled" look: grey block, rounded top corners, bottom line.
  &--filled &__control {
    background: rgba(0, 0, 0, 0.06);
    border-color: transparent;
    border-bottom: 1px solid rgba(0, 0, 0, 0.42);
    border-radius: var(--sd-radius, 4px) var(--sd-radius, 4px) 0 0;

    &:hover {
      background: rgba(0, 0, 0, 0.09);
    }
    &:focus-within {
      box-shadow: none;
      border-bottom: 2px solid var(--sd-primary, #1e88e5);
    }
  }

  &--underlined &__control {
    height: 28px;
    padding: 0 4px;
    background: transparent;
    border-width: 0 0 1px 0;
    border-radius: 0;

    &:focus-within {
      box-shadow: 0 1px 0 0 var(--sd-primary, #1e88e5);
    }
  }

  &--disabled {
    opacity: 0.7;
  }
  &--disabled &__control {
    background: rgba(0, 0, 0, 0.03);
  }
}
</style>
