<template>
  <sd-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="About StarryDigitizer"
    :max-width="560"
  >
    <!-- INFO: SdDialog's root is a <teleport>, so the e2e hook goes on this
         wrapper inside the body slot rather than on the component tag. -->
    <div data-cy="about-dialog">
      <div class="text-caption" data-cy="about-page-version">
        <b>This page</b> {{ pageText }}
      </div>
      <!-- INFO: renders nothing unless an auto service is configured
           (starryai build); folded until opened -->
      <auto-components-panel class="mt-2"></auto-components-panel>
    </div>
    <template #actions>
      <sd-button
        data-cy="about-close"
        @click="$emit('update:modelValue', false)"
        >Close</sd-button
      >
    </template>
  </sd-dialog>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { SdButton, SdDialog } from '@/presentation/ui'
import AutoComponentsPanel from '@/presentation/components/Auto/AutoComponentsPanel.vue'

/** What the standalone app knows about its own build (App.vue). */
export interface PageVersionInfo {
  version: string
  build?: string
  commit?: string
  environment?: string
}

// INFO: the standalone app's Help > About (F14 in
// docs/design/starryai-auto.md): the page's own version / build / commit, and
// — only where an auto service is configured — the backend's Components list.
// App-only like KeyboardShortcutsDialog; it reads the context App.vue
// provides.
export default defineComponent({
  components: { SdButton, SdDialog, AutoComponentsPanel },
  props: {
    modelValue: { type: Boolean, required: true },
    page: { type: Object as PropType<PageVersionInfo>, required: true },
  },
  emits: ['update:modelValue'],
  computed: {
    pageText(): string {
      return [
        `v${this.page.version}`,
        this.page.build && `build ${this.page.build}`,
        this.page.commit && `commit ${this.page.commit.slice(0, 12)}`,
        this.page.environment,
      ]
        .filter(Boolean)
        .join(' · ')
    },
  },
})
</script>
