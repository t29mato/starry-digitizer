<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="starry-digitizer sd-dialog__backdrop"
      @click.self="close"
    >
      <div
        class="sd-dialog"
        :style="{
          maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
        }"
        role="dialog"
        aria-modal="true"
      >
        <div v-if="title || $slots.title" class="sd-dialog__title">
          <slot name="title">{{ title }}</slot>
        </div>
        <div class="sd-dialog__body"><slot /></div>
        <div v-if="$slots.actions" class="sd-dialog__actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

// INFO: replacement for <v-dialog> + <v-card>. Teleported to body like
// Vuetify did; the wrapper carries `.starry-digitizer` so the library's
// tokens/utilities still apply inside.
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    maxWidth?: number | string
  }>(),
  { title: undefined, maxWidth: 560 },
)
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close() {
  emit('update:modelValue', false)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) document.addEventListener('keydown', onKeydown)
    else document.removeEventListener('keydown', onKeydown)
  },
  { immediate: true },
)
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped lang="scss">
.sd-dialog__backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}
.sd-dialog {
  width: calc(100% - 32px);
  max-height: calc(100vh - 32px);
  overflow: auto;
  background: var(--sd-surface, #fff);
  border-radius: var(--sd-radius, 4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

  &__title {
    padding: 16px 20px 8px;
    font-size: 1.25rem;
    font-weight: 500;
  }
  &__body {
    padding: 8px 20px 16px;
  }
  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 8px 16px 16px;
  }
}
</style>
