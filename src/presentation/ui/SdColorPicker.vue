<template>
  <label class="sd-color" :class="{ 'sd-color--disabled': disabled }">
    <span
      class="sd-color__swatch"
      :style="{ backgroundColor: hex6 }"
      :title="modelValue"
    ></span>
    <sd-icon class="sd-color__icon" :path="mdiPalette" :size="20" />
    <!-- INFO: the native color input is what actually opens the picker; it is
         visually hidden but stays in the DOM (tests can set its value). -->
    <input
      class="sd-color__input"
      type="color"
      :value="hex6"
      :disabled="disabled"
      v-bind="$attrs"
      @input="onPick"
    />
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mdiPalette } from '@mdi/js'
import SdIcon from './SdIcon.vue'

// INFO: replacement for the <v-color-picker> swatch + palette icon the app
// showed: a colour chip and a palette icon that open the native picker. The
// extractor stores #rrggbbaa; alpha is preserved when a new colour is picked.
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
</script>

<style scoped lang="scss">
.sd-color {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;

  &__swatch {
    display: inline-block;
    width: 44px;
    height: 18px;
    border-radius: 2px;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
  }
  &__icon {
    color: var(--sd-text, rgba(0, 0, 0, 0.87));
  }
  &__input {
    position: absolute;
    inset: 0;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
  &--disabled {
    opacity: 0.5;
    cursor: default;
  }
}
</style>
