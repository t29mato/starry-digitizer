<template>
  <label class="sd-file" :class="{ 'sd-file--disabled': disabled }">
    <sd-icon class="sd-file__icon" :path="mdiPaperclip" :size="20" />
    <span class="sd-file__field">
      <span
        class="sd-file__text"
        :class="{ 'sd-file__text--placeholder': !fileName }"
        >{{ fileName || label }}</span
      >
    </span>
    <!-- INFO: the native input stays in the DOM (visually hidden) so tests
         and keyboard users keep the real file control; clicking the label
         opens the picker. -->
    <input
      class="sd-file__input"
      type="file"
      :accept="accept"
      :disabled="disabled"
      v-bind="$attrs"
      @change="onChange"
    />
  </label>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { mdiPaperclip } from '@mdi/js'
import SdIcon from './SdIcon.vue'

// INFO: replacement for <v-file-input> (prepend paperclip + filled field).
// Emits the raw change event so the caller reads `event.target.files`.
defineOptions({ inheritAttrs: false })
withDefaults(
  defineProps<{ label?: string; accept?: string; disabled?: boolean }>(),
  { label: 'Choose a file', accept: undefined, disabled: false },
)
const emit = defineEmits<{ change: [event: Event] }>()

const fileName = ref('')
function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  fileName.value = input.files?.[0]?.name ?? ''
  emit('change', event)
}
</script>

<style scoped lang="scss">
.sd-file {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  cursor: pointer;

  &__icon {
    flex: 0 0 auto;
    color: var(--sd-text-medium, rgba(0, 0, 0, 0.6));
  }

  &__field {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    min-width: 0;
    height: 32px;
    padding: 0 12px;
    background: rgba(0, 0, 0, 0.06);
    border-bottom: 1px solid rgba(0, 0, 0, 0.42);
    border-radius: var(--sd-radius, 4px) var(--sd-radius, 4px) 0 0;
    transition: background-color 0.15s;
  }
  &:hover &__field {
    background: rgba(0, 0, 0, 0.09);
  }

  &__text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.875rem;
    font-weight: 500;

    &--placeholder {
      font-weight: 400;
      color: var(--sd-text-medium, rgba(0, 0, 0, 0.6));
    }
  }

  &__input {
    position: absolute;
    inset: 0;
    width: 1px;
    height: 1px;
    opacity: 0;
    overflow: hidden;
    pointer-events: none;
  }

  &--disabled {
    opacity: 0.6;
    cursor: default;
  }
}
</style>
