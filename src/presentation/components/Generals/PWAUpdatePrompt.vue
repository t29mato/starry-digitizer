<template>
  <v-snackbar
    v-model="needRefresh"
    :timeout="-1"
    vertical
    location="bottom right"
    color="white"
    class="c__pwa-update-prompt"
  >
    <p class="font-weight-bold mb-1">
      A new version{{ newVersion ? ` (v${newVersion})` : '' }} is available
    </p>
    <template v-if="notes.length">
      <p class="mb-1">What's new:</p>
      <ul class="pl-4">
        <li v-for="note in notes" :key="note">{{ note }}</li>
      </ul>
    </template>
    <template #actions>
      <v-btn color="grey" variant="text" size="small" @click="dismiss">
        Later
      </v-btn>
      <v-btn color="primary" variant="flat" size="small" @click="reload">
        Reload
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { version as currentVersion } from '../../../../package.json'

// INFO: shown when vite-plugin-pwa (registerType: 'prompt') detects a new
// Service Worker waiting after a deploy. version.json is fetched from the
// network (it is excluded from the SW precache, see vite.config.js) so the
// popup can display the incoming version and its release notes.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

export default defineComponent({
  name: 'PWAUpdatePrompt',
  setup() {
    const newVersion = ref('')
    const notes = ref<string[]>([])

    const { needRefresh, updateServiceWorker } = useRegisterSW({
      async onNeedRefresh() {
        try {
          const res = await fetch(`/version.json?updatedAt=${Date.now()}`, {
            cache: 'no-store',
          })
          if (!res.ok) return
          const info = await res.json()
          // Same version means a redeploy without a version bump — showing
          // "v1.14.0 is available" while running v1.14.0 would be confusing.
          if (info.version !== currentVersion) {
            newVersion.value = info.version
            notes.value = Array.isArray(info.notes) ? info.notes : []
          }
        } catch {
          // Popup still shows, just without version details.
        }
      },
      onRegisteredSW(_url, registration) {
        // PWA windows tend to stay open for a long time; poll so users get
        // the update prompt without reopening the app.
        if (registration) {
          setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS)
        }
      },
    })

    return { needRefresh, updateServiceWorker, newVersion, notes }
  },
  methods: {
    reload() {
      this.updateServiceWorker(true)
    },
    dismiss() {
      this.needRefresh = false
    },
  },
})
</script>

<style lang="scss" scoped>
.c__pwa-update-prompt {
  ul {
    max-width: 360px;
  }
}
</style>
