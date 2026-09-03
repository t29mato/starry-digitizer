<template>
  <button
    type="button"
    class="sd-btn"
    :class="[
      `sd-btn--${size}`,
      `sd-btn--${variant}`,
      color ? `sd-btn--${color}` : '',
      {
        'sd-btn--icon-only': !!icon && !$slots.default,
        'sd-btn--block': block,
      },
    ]"
    :disabled="disabled"
    :title="title"
    :aria-label="title"
    @click="$emit('click', $event)"
  >
    <sd-icon v-if="icon" :path="icon" :size="iconSize" />
    <span v-if="$slots.default" class="sd-btn__label"><slot /></span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SdIcon from './SdIcon.vue'

// INFO: replacement for <v-btn>. `size`/`variant`/`color` keep Vuetify's
// vocabulary so existing templates map 1:1.
const props = withDefaults(
  defineProps<{
    size?: 'x-small' | 'small' | 'default'
    variant?: 'elevated' | 'text' | 'outlined' | 'tonal'
    color?: 'primary' | 'error' | 'white' | ''
    icon?: string
    disabled?: boolean
    title?: string
    block?: boolean
  }>(),
  {
    size: 'default',
    variant: 'elevated',
    color: '',
    icon: undefined,
    disabled: false,
    title: undefined,
    block: false,
  },
)
defineEmits<{ click: [event: MouseEvent] }>()

const iconSize = computed(() =>
  props.size === 'x-small' ? 14 : props.size === 'small' ? 16 : 18,
)
</script>

<style scoped lang="scss">
.sd-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid transparent;
  border-radius: var(--sd-radius, 4px);
  background: var(--sd-surface-variant, #f5f5f5);
  color: var(--sd-text, rgba(0, 0, 0, 0.87));
  font: inherit;
  font-weight: 500;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition:
    background-color 0.15s,
    box-shadow 0.15s;

  &:hover:not(:disabled) {
    filter: brightness(0.95);
  }
  &:active:not(:disabled) {
    box-shadow: none;
  }
  &:disabled {
    cursor: default;
    opacity: 0.45;
    box-shadow: none;
  }

  &--default {
    height: 36px;
    padding: 0 16px;
    font-size: 0.875rem;
  }
  &--small {
    height: 28px;
    padding: 0 12px;
    font-size: 0.75rem;
  }
  &--x-small {
    height: 20px;
    padding: 0 8px;
    font-size: 0.625rem;
  }
  &--icon-only {
    padding: 0;
    &.sd-btn--default {
      width: 36px;
    }
    &.sd-btn--small {
      width: 28px;
    }
    &.sd-btn--x-small {
      width: 20px;
    }
  }
  &--block {
    display: flex;
    width: 100%;
  }

  &--text {
    background: transparent;
    box-shadow: none;
    &:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.06);
      filter: none;
    }
  }
  &--outlined {
    background: transparent;
    box-shadow: none;
    border-color: var(--sd-border, rgba(0, 0, 0, 0.24));
  }
  &--tonal {
    box-shadow: none;
  }

  &--primary {
    background: var(--sd-primary, #1e88e5);
    color: var(--sd-primary-contrast, #fff);
    &.sd-btn--text,
    &.sd-btn--outlined {
      background: transparent;
      color: var(--sd-primary, #1e88e5);
    }
  }
  &--error {
    background: var(--sd-error, #e53935);
    color: #fff;
  }
  &--white {
    background: #fff;
    color: var(--sd-text, rgba(0, 0, 0, 0.87));
  }
}
</style>
