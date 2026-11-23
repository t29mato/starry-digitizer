<template>
  <!-- INFO: nothing at all unless an auto service is configured and can
       list its components (F14, docs/design/starryai-auto.md). For
       developers, so it starts folded and asks the service only when
       opened; nothing is stored. -->
  <details
    v-if="isAvailable"
    class="sd-panel c__components"
    data-cy="auto-components"
    @toggle="onToggle"
  >
    <summary class="c__summary">Components</summary>
    <div class="text-caption mt-1">
      <div v-if="isLoading" class="c__muted" data-cy="auto-components-loading">
        Asking the auto service…
      </div>
      <div v-else-if="error" class="c__error" data-cy="auto-components-error">
        {{ error }}
      </div>
      <template v-else-if="info">
        <div v-if="info.app" data-cy="auto-components-backend">
          <b>{{ info.app.name ?? 'Backend' }}</b>
          {{ backendText }}
        </div>
        <ul class="c__list">
          <li
            v-for="(component, index) in info.components"
            :key="component.id ?? index"
            :data-cy="`auto-component-${component.id ?? index}`"
          >
            <div>
              <b>{{
                component.publicName ?? component.name ?? component.id
              }}</b>
              <span
                v-if="component.publicName && component.name"
                class="c__muted"
              >
                ({{ component.name }})</span
              >
              —
              <span
                :class="
                  component.status === 'ok' ? 'c__status-ok' : 'c__status-other'
                "
                data-cy="auto-component-status"
                >{{ component.status ?? 'unknown' }}</span
              >
            </div>
            <div v-if="component.role" class="c__muted">
              {{ component.role }}
            </div>
            <div v-if="component.componentId || component.version">
              <code>{{ component.componentId ?? component.version }}</code>
            </div>
            <div
              v-for="hash in hashes(component.details)"
              :key="hash.key"
              class="c__muted"
            >
              {{ hash.key }}: <code :title="hash.value">{{ hash.short }}</code>
            </div>
          </li>
        </ul>
        <div v-if="info.digest" class="c__muted">
          digest <code>{{ info.digest }}</code>
        </div>
      </template>
    </div>
  </details>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import {
  canListAutoComponents,
  loadAutoComponents,
} from '@/application/utils/autoFeatureOperations'
import type { AutoComponentsInfo } from '@/application/services/autoService/autoServiceWire'
import { DigitizerError } from '@/application/errors'

// INFO: the identifying hashes and commits are what tell two runs apart
// (weights sha256, source / vendored commits, traineddata); the other
// details (thresholds, library versions) stay in the JSON for whoever needs
// them.
const HASH_KEY = /(sha256|commit|digest)$/

export default defineComponent({
  setup() {
    const ctx = useDigitizerContext()
    return { ctx }
  },
  data: () => ({
    info: null as AutoComponentsInfo | null,
    isLoading: false,
    error: '',
  }),
  computed: {
    isAvailable(): boolean {
      return canListAutoComponents(this.ctx)
    },
    backendText(): string {
      const app = this.info?.app
      if (!app) return ''
      return [
        app.version && `v${app.version}`,
        app.build && `build ${app.build}`,
        app.commit && `commit ${app.commit.slice(0, 12)}`,
        app.environment,
      ]
        .filter(Boolean)
        .join(' · ')
    },
  },
  methods: {
    hashes(details: Record<string, unknown>) {
      return Object.entries(details)
        .filter(
          (entry): entry is [string, string] =>
            HASH_KEY.test(entry[0]) && typeof entry[1] === 'string',
        )
        .map(([key, value]) => ({
          key,
          value,
          short: value.length > 12 ? `${value.slice(0, 12)}…` : value,
        }))
    },
    onToggle(event: Event) {
      if ((event.target as HTMLDetailsElement).open) this.load()
    },
    // INFO: asked again on every open — the list changes when the LineFormer
    // service or the VLM comes and goes, and it is cheap for the backend
    // (cached there)
    async load() {
      if (this.isLoading) return
      this.isLoading = true
      this.error = ''
      try {
        this.info = await loadAutoComponents(this.ctx)
      } catch (error) {
        this.info = null
        this.error = DigitizerError.from(error, 'AUTO_SERVICE_FAILED').message
      } finally {
        this.isLoading = false
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__summary {
    cursor: pointer;
    font-size: 0.85em;
  }
  &__list {
    list-style: none;
    padding: 0;
    margin: 4px 0;
    li {
      padding: 3px 0;
      border-top: solid 1px #eee;
    }
  }
  &__muted {
    color: #666;
  }
  &__error {
    color: #c62828;
  }
  &__status-ok {
    color: #2e7d32;
  }
  &__status-other {
    color: #b26a00;
  }
}
</style>
