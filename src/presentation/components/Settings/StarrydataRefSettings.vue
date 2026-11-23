<template>
  <!-- INFO: `sd-panel` styles the panel on its own (base.scss), like the
       other Settings panels -->
  <div class="sd-panel c__starrydata-ref" data-cy="starrydata-ref">
    <!-- INFO: SdTextField passes attrs (class too) to its <input>, so the
         sizes sit on wrappers -->
    <div class="c__row">
      <div class="c__sid">
        <sd-text-field
          label="Starrydata SID"
          placeholder="e.g. 12345"
          data-cy="starrydata-sid"
          :maxlength="SID_MAX_LENGTH"
          :model-value="ctx.starrydataRef.sid"
          :disabled="options.readonly"
          @update:model-value="onSid"
        />
      </div>
      <div class="c__figure">
        <sd-text-field
          label="Fig."
          placeholder="e.g. 3(b)"
          data-cy="starrydata-figure"
          :maxlength="FIGURE_MAX_LENGTH"
          :model-value="ctx.starrydataRef.figure"
          :disabled="options.readonly"
          @update:model-value="onFigure"
        />
      </div>
    </div>
    <p v-if="sidNotDigits" class="c__hint" data-cy="starrydata-sid-hint">
      A Starrydata SID is usually a number.
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import {
  FIGURE_MAX_LENGTH,
  SID_MAX_LENGTH,
} from '@/application/services/starrydataRef/starrydataRef'
import { SdTextField } from '@/presentation/ui'

// INFO: F18 of docs/design/starryai-auto.md: the Starrydata paper id and the
// figure the image is, both optional, saved with the project. Kept small and
// right under the image panel, since they describe the image. A SID that is
// not digits is allowed (only hinted), as on the wpd-auto page.
export default defineComponent({
  components: { SdTextField },
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    return { ctx, options, SID_MAX_LENGTH, FIGURE_MAX_LENGTH }
  },
  computed: {
    sidNotDigits(): boolean {
      const sid = this.ctx.starrydataRef.sid.trim()
      return sid !== '' && !/^\d+$/.test(sid)
    },
  },
  methods: {
    onSid(value: string | number) {
      if (this.options.readonly) return
      this.ctx.starrydataRef.set({ sid: String(value) })
    },
    onFigure(value: string | number) {
      if (this.options.readonly) return
      this.ctx.starrydataRef.set({ figure: String(value) })
    },
  },
})
</script>

<style scoped lang="scss">
.c__row {
  display: flex;
  gap: 6px;
}
.c__sid {
  flex: 3;
  min-width: 0;
}
.c__figure {
  flex: 2;
  min-width: 0;
}
.c__hint {
  margin: 2px 0 0;
  font-size: 0.75em;
  color: #8a6d00;
}
</style>
