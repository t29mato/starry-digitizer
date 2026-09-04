<template>
  <!-- INFO: a plain fixed bar rather than SdSnackbar: this prompt lives in
       the standalone app chrome (outside the .starry-digitizer root), so it
       carries its own styles instead of the library's utility classes. -->
  <div
    v-if="needRefresh"
    class="c__pwa-update-prompt"
    data-cy="pwa-update-prompt"
    role="status"
  >
    <p class="c__title">
      A new version{{ newVersion ? ` (v${newVersion})` : '' }} is available
    </p>
    <template v-if="notes.length">
      <p class="c__notes-title">What's new:</p>
      <ul class="c__notes">
        <li v-for="note in notes" :key="note">{{ note }}</li>
      </ul>
    </template>
    <div class="c__actions">
      <sd-button variant="text" size="small" @click="dismiss">Later</sd-button>
      <sd-button color="primary" size="small" @click="reload">Reload</sd-button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { version as currentVersion } from '../../../../package.json'
import { SdButton } from '@/presentation/ui'

// INFO: shown when vite-plugin-pwa (registerType: 'prompt') detects a new
// Service Worker waiting after a deploy. version.json is fetched from the
// network (it is excluded from the SW precache, see vite.config.js) so the
// popup can display the incoming version and its release notes.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

export default defineComponent({
  name: 'PWAUpdatePrompt',
  components: { SdButton },
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
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2100;
  max-width: 400px;
  padding: 12px 16px;
  border-radius: 4px;
  background-color: #fff;
  color: rgba(0, 0, 0, 0.87);
  font-size: 0.875rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.c__title {
  margin: 0 0 4px;
  font-weight: 700;
}
.c__notes-title {
  margin: 0 0 4px;
}
.c__notes {
  margin: 0;
  padding-left: 16px;
  max-width: 360px;
}
.c__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
