<template>
  <v-snackbar
    v-model="notifier.isActive"
    :color="notifier.type"
    location="bottom right"
    :timeout="4000"
    class="c__notification-snackbar"
  >
    {{ notifier.message }}
    <template #actions>
      <v-btn variant="text" size="small" @click="notifier.inactivate()">
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { notifier } from '@/instanceStore/applicationServiceInstances'

// INFO: Renders the app-wide toast/snackbar notifications (issue #281).
// Mounted once near the app root (see StarryDigitizer.vue), same pattern as
// ConfirmerBar.vue: a shared singleton service (notifier) drives a dumb view.
export default defineComponent({
  data() {
    return {
      notifier,
    }
  },
})
</script>
