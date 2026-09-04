<template>
  <teleport to="body">
    <transition name="sd-snackbar">
      <div
        v-if="modelValue"
        class="starry-digitizer sd-snackbar"
        :class="`sd-snackbar--${color}`"
        role="status"
      >
        <span class="sd-snackbar__text"><slot /></span>
        <button
          type="button"
          class="sd-snackbar__close"
          aria-label="close"
          @click="$emit('update:modelValue', false)"
        >
          ×
        </button>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

// INFO: replacement for <v-snackbar>; auto-hides after `timeout` ms.
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    color?: 'error' | 'success' | 'info'
    timeout?: number
  }>(),
  { color: 'info', timeout: 4000 },
)
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.modelValue,
  (open) => {
    if (timer) clearTimeout(timer)
    if (open && props.timeout > 0) {
      timer = setTimeout(() => emit('update:modelValue', false), props.timeout)
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => timer && clearTimeout(timer))
</script>

<style scoped lang="scss">
.sd-snackbar {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 2100;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 280px;
  max-width: calc(100vw - 32px);
  padding: 10px 16px;
  border-radius: var(--sd-radius, 4px);
  color: #fff;
  background: #323232;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

  &--error {
    background: var(--sd-error, #e53935);
  }
  &--success {
    background: #43a047;
  }
  &__text {
    flex: 1;
  }
  &__close {
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 1.2rem;
    cursor: pointer;
  }
}
.sd-snackbar-enter-active,
.sd-snackbar-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.sd-snackbar-enter-from,
.sd-snackbar-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
