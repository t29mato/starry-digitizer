<template>
  <!-- INFO: not closable by Esc or a click outside (no update:modelValue
       handler): records wait for this choice -->
  <sd-dialog :model-value="modelValue" title="Who is working?" :max-width="420">
    <div data-cy="collect-user-dialog">
      <p class="mb-2">{{ COLLECT_NOTICE }}</p>
      <p class="mb-3 text-caption">
        The name is a label on the saved work, not a login. It is remembered in
        this browser.
      </p>
      <div class="collect-user-dialog__names">
        <sd-button
          v-for="user in users"
          :key="user.id"
          :data-cy="`collect-user-${user.id}`"
          @click="$emit('choose', user.id)"
        >
          {{ user.name }}
        </sd-button>
        <sd-button
          v-if="guestAllowed"
          data-cy="collect-user-guest"
          @click="$emit('choose', null)"
        >
          Guest
        </sd-button>
      </div>
    </div>
  </sd-dialog>
</template>

<script setup lang="ts">
import { SdButton, SdDialog } from '@/presentation/ui'
import type { CollectUser } from './collectClient'
import { COLLECT_NOTICE } from './collectNoticeText'

defineProps<{
  modelValue: boolean
  users: CollectUser[]
  guestAllowed: boolean
}>()
defineEmits<{ choose: [user: string | null] }>()
</script>

<style scoped lang="scss">
.collect-user-dialog__names {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
