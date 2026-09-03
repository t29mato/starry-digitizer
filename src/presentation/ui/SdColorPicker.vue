<template>
  <div class="sd-color" :class="{ 'sd-color--disabled': disabled }">
    <input
      class="sd-color__swatch"
      type="color"
      :value="hex6"
      :disabled="disabled"
      v-bind="$attrs"
      @input="onPick"
    />
    <sd-text-field
      class="sd-color__hex"
      :model-value="modelValue"
      :disabled="disabled"
      placeholder="#rrggbbaa"
      @update:model-value="onType"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SdTextField from './SdTextField.vue'

// INFO: replacement for <v-color-picker mode="hexa">: the native color input
// (6-digit hex) plus a text field for the 8-digit #rrggbbaa the extractor
// stores. Alpha is preserved from the text field when the swatch changes.
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{ modelValue: string; disabled?: boolean }>(),
  { disabled: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const hex6 = computed(() => {
  const m = /^#([0-9a-fA-F]{6})/.exec(props.modelValue)
  return m ? `#${m[1]}` : '#000000'
})

function onPick(event: Event) {
  const rgb = (event.target as HTMLInputElement).value
  const alpha = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})$/.exec(props.modelValue)?.[1]
  emit('update:modelValue', `${rgb}${alpha ?? 'ff'}`)
}

function onType(value: string | number) {
  emit('update:modelValue', String(value))
}
</script>

<style scoped lang="scss">
.sd-color {
  display: flex;
  align-items: center;
  gap: 8px;

  &__swatch {
    width: 40px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--sd-border, rgba(0, 0, 0, 0.24));
    border-radius: var(--sd-radius, 4px);
    background: transparent;
    cursor: pointer;
  }
  &__hex {
    flex: 1;
  }
  &--disabled {
    opacity: 0.6;
  }
}
</style>
