<template>
  <sd-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="Keyboard Shortcuts"
    :max-width="480"
  >
    <!-- INFO: SdDialog's root is a <teleport>, so the e2e hook goes on this
         wrapper inside the body slot rather than on the component tag. -->
    <div data-cy="keyboard-shortcuts-dialog">
      <div v-for="group in shortcutGroups" :key="group.title" class="mb-4">
        <div class="text-overline text-medium-emphasis">
          {{ group.title }}
        </div>
        <div
          v-for="item in group.items"
          :key="item.action"
          class="d-flex justify-space-between py-1"
        >
          <span>{{ item.action }}</span>
          <span class="text-medium-emphasis">{{ item.shortcut }}</span>
        </div>
      </div>
    </div>
    <template #actions>
      <sd-button
        data-cy="keyboard-shortcuts-close"
        @click="$emit('update:modelValue', false)"
        >Close</sd-button
      >
    </template>
  </sd-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { SdButton, SdDialog } from '@/presentation/ui'

// INFO: A reference list for every global keyboard shortcut wired up in
// CanvasMain.vue's keyDownHandler, so users who found the menu bar's
// per-item shortcuts (File/Edit/View) can also discover the ones that
// don't live in a menu (mode switching, point movement, etc).
export default defineComponent({
  components: { SdButton, SdDialog },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  data: () => ({
    shortcutGroups: [
      {
        title: 'File',
        items: [
          { action: 'Save Project', shortcut: '⌘S' },
          { action: 'Load Project', shortcut: '⌘O' },
        ],
      },
      {
        title: 'Edit',
        items: [
          { action: 'Undo', shortcut: '⌘Z' },
          { action: 'Redo', shortcut: '⌘⇧Z' },
          { action: 'Activate all points', shortcut: '⌘A' },
          { action: 'Deactivate points', shortcut: 'Esc' },
          { action: 'Delete active points', shortcut: 'Delete / Backspace' },
          { action: 'Move active point/axis (1px)', shortcut: '↑ ↓ ← →' },
          {
            action: 'Move active point/axis (10px)',
            shortcut: '⇧ + ↑ ↓ ← →',
          },
        ],
      },
      {
        title: 'View',
        items: [
          { action: 'Zoom In', shortcut: '+' },
          { action: 'Zoom Out', shortcut: '-' },
          { action: 'Reset to 100%', shortcut: '0' },
          { action: 'Fit', shortcut: 'F' },
        ],
      },
      {
        title: 'Manual Extraction mode',
        items: [
          { action: 'Add', shortcut: 'A' },
          { action: 'Edit', shortcut: 'E' },
          { action: 'Delete', shortcut: 'D' },
        ],
      },
    ],
  }),
})
</script>
