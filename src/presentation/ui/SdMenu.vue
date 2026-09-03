<template>
  <div ref="root" class="sd-menu">
    <slot name="activator" :props="{ onClick: toggle }" :open="open" />
    <div v-if="open" class="sd-menu__list" role="menu">
      <template v-for="(item, index) in items">
        <hr v-if="item.divider" :key="`d-${index}`" class="sd-menu__divider" />
        <a
          v-else-if="item.href"
          :key="`a-${index}`"
          class="sd-menu__item"
          role="menuitem"
          :data-cy="`menu-item-${slug(item.text)}`"
          :href="item.href"
          target="_blank"
          rel="noopener"
          @click="close"
        >
          <span class="sd-menu__check"></span>
          <span class="sd-menu__text">{{ item.text }}</span>
        </a>
        <button
          v-else
          :key="`b-${index}`"
          type="button"
          class="sd-menu__item"
          role="menuitem"
          :data-cy="`menu-item-${slug(item.text)}`"
          :disabled="item.disabled"
          @click="select(item)"
        >
          <span class="sd-menu__check">
            <sd-icon v-if="item.checked" :path="mdiCheck" :size="14" />
          </span>
          <span class="sd-menu__text">{{ item.text }}</span>
          <span v-if="item.shortcut" class="sd-menu__shortcut">{{
            item.shortcut
          }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { mdiCheck } from '@mdi/js'
import SdIcon from './SdIcon.vue'

// INFO: replacement for <v-menu> + <v-list> used by the standalone app's
// File/Edit/View/Help bar. Click-to-open dropdown, closes on outside click
// or Escape.
export interface SdMenuItem {
  text: string
  shortcut?: string
  href?: string
  disabled?: boolean
  checked?: boolean
  divider?: boolean
  action?: () => void
}

defineProps<{ items: SdMenuItem[] }>()

const root = ref<HTMLElement>()
const open = ref(false)

// INFO: stable test hook: "Save Project" -> data-cy="menu-item-save-project"
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
function toggle() {
  open.value = !open.value
}
function close() {
  open.value = false
}
function select(item: SdMenuItem) {
  close()
  item.action?.()
}
function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) close()
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}
onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped lang="scss">
.sd-menu {
  position: relative;
  display: inline-block;

  &__list {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 1500;
    min-width: 220px;
    padding: 4px 0;
    background: #fff;
    color: rgba(0, 0, 0, 0.87);
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  }
  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 12px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.875rem;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    white-space: nowrap;

    &:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.06);
    }
    &:disabled {
      color: rgba(0, 0, 0, 0.38);
      cursor: default;
    }
  }
  &__check {
    display: inline-flex;
    width: 16px;
    justify-content: center;
  }
  &__text {
    flex: 1;
  }
  &__shortcut {
    color: rgba(0, 0, 0, 0.6);
    margin-left: 24px;
  }
  &__divider {
    margin: 4px 0;
    border: 0;
    border-top: 1px solid rgba(0, 0, 0, 0.12);
  }
}
</style>
