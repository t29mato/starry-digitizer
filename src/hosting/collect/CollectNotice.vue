<template>
  <!-- INFO: inline (the upload panel, at the top of the page): the details
       fold out below, where a tooltip opening upwards would be cut off -->
  <details v-if="inline" class="collect-notice" data-cy="collect-notice">
    <summary class="collect-notice__text">{{ NOTICE }}</summary>
    <span class="collect-notice__details">{{ details }}</span>
  </details>
  <span v-else class="collect-notice" data-cy="collect-notice">
    <sd-tooltip :text="details">
      <span tabindex="0" class="collect-notice__text">{{ NOTICE }}</span>
    </sd-tooltip>
    <template v-if="hasNames">
      <span class="ml-2">Name: {{ userName ?? 'Guest' }}</span>
      <button
        type="button"
        class="collect-notice__change"
        data-cy="collect-change-name"
        @click="$emit('change-name')"
      >
        Change
      </button>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SdTooltip } from '@/presentation/ui'
import { COLLECT_DETAILS, COLLECT_NOTICE } from './collectNoticeText'

// INFO: the research-collection notice of the starryai build (docs/design/
// starryai-auto.md §5.2). Shown only while collection is on; the client
// sends nothing before the page has rendered it.
const props = defineProps<{
  userName: string | null
  hasNames: boolean
  inline?: boolean
}>()
defineEmits<{ 'change-name': [] }>()

const NOTICE = COLLECT_NOTICE
const details = computed(() =>
  props.hasNames
    ? `${COLLECT_DETAILS} Name in use: ${props.userName ?? 'Guest'}.`
    : COLLECT_DETAILS,
)
</script>

<style scoped lang="scss">
.collect-notice {
  font-size: 0.8em;
  &__text {
    text-decoration: underline dotted;
    cursor: help;
  }
  summary {
    cursor: pointer;
  }
  &__details {
    display: block;
    margin-top: 4px;
  }
  &__change {
    margin-left: 4px;
    padding: 0 4px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
}
</style>
