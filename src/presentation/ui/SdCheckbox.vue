<template>
  <label
    class="sd-check"
    :class="{
      'sd-check--disabled': disabled,
      'sd-check--switch': switchStyle,
      'sd-check--radio': type === 'radio',
    }"
  >
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
    <span v-if="switchStyle" class="sd-check__track" aria-hidden="true">
      <span class="sd-check__thumb"></span>
    </span>
    <span v-if="label || $slots.default" class="sd-check__label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// INFO: replacement for <v-checkbox> / <v-radio> and, with `switch`, for
// <v-switch>. The real <input> stays in the DOM in every mode (tests toggle
// it directly); the switch merely draws a track/thumb next to it.
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: boolean | string | number
    label?: string
    disabled?: boolean
    type?: 'checkbox' | 'radio'
    value?: string | number
    name?: string
    switch?: boolean
  }>(),
  {
    modelValue: false,
    label: undefined,
    disabled: false,
    type: 'checkbox',
    value: undefined,
    name: undefined,
    switch: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean | string | number]
  change: [value: boolean | string | number]
}>()

const switchStyle = computed(() => props.switch && props.type === 'checkbox')

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
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  cursor: pointer;
  user-select: none;

  &__input {
    flex: 0 0 auto;
    margin: 0;
    width: 20px;
    height: 20px;
    accent-color: var(--sd-primary, #1e88e5);
    cursor: inherit;
  }
  &__label {
    font-size: 0.9375rem;
    font-weight: 500;
  }
  &--disabled {
    cursor: default;
    color: var(--sd-text-disabled, rgba(0, 0, 0, 0.38));
  }

  // ---- switch ---------------------------------------------------------
  // INFO: the real checkbox is laid transparently over the track (not
  // display:none / pointer-events:none) so it stays clickable, focusable
  // and testable exactly like a plain checkbox.
  &--switch {
    position: relative;
  }
  &--switch &__input {
    position: absolute;
    left: 0;
    top: 50%;
    width: 36px;
    height: 20px;
    margin: 0;
    transform: translateY(-50%);
    opacity: 0;
    z-index: 1;
    cursor: pointer;
  }
  &__track {
    position: relative;
    flex: 0 0 auto;
    width: 36px;
    height: 14px;
    border-radius: 7px;
    background: rgba(0, 0, 0, 0.38);
    transition: background-color 0.15s;
  }
  &__thumb {
    position: absolute;
    top: -3px;
    left: 0;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fafafa;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    transition: transform 0.15s;
  }
  &--switch &__input:checked ~ &__track {
    background: color-mix(in srgb, var(--sd-primary, #1e88e5) 50%, white);
  }
  &--switch &__input:checked ~ &__track &__thumb {
    transform: translateX(16px);
    background: var(--sd-primary, #1e88e5);
  }
  &--switch &__input:focus-visible ~ &__track {
    outline: 2px solid var(--sd-primary, #1e88e5);
    outline-offset: 2px;
  }
}
</style>
