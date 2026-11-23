<template>
  <!-- INFO: `sd-panel` is what makes this panel style itself, so a host
       composing the panels needs no `.starry-digitizer` wrapper around
       them; inside one it is a no-op. src/presentation/styles/base.scss. -->
  <div class="sd-panel" data-cy="start-over">
    <sd-button
      size="small"
      variant="outlined"
      data-cy="start-over-button"
      :disabled="options.readonly || !hasWork"
      title="Clear all axes, datasets and auto-extraction results of this image. The image stays. One Undo step."
      @click="handleOnClickStartOver"
      >Start over (keep image)</sd-button
    >
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import {
  requestConfirmation,
  useDigitizerOptions,
} from '@/presentation/digitizerOptions'
import {
  canStartOver,
  startOver,
} from '@/application/utils/startOverOperations'
import { SdButton } from '@/presentation/ui'

// INFO: F12 in docs/design/starryai-auto.md. The operation (and its undo
// snapshot) lives in application/utils/startOverOperations.ts; the question
// stays here, through `options.confirm` like every other destructive action
// of the library, so a host's own dialog asks it.
const START_OVER_MESSAGE =
  'Start over on this image? All axes, datasets and auto-extraction results (review, Auto-place proposal) are cleared. The image stays. Undo (⌘Z) brings the axes and datasets back.'

export default defineComponent({
  components: { SdButton },
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    return { ctx, options }
  },
  computed: {
    hasWork(): boolean {
      return canStartOver(this.ctx)
    },
  },
  methods: {
    async handleOnClickStartOver() {
      if (this.options.readonly) return
      const confirmed = await requestConfirmation(
        this.options,
        START_OVER_MESSAGE,
      )
      if (!confirmed) return
      // INFO: nothing to re-check after the dialog: whatever was added while
      // it was open is part of "this image's work" too, and startOver() does
      // nothing (no empty undo step) if it all went away meanwhile.
      startOver(this.ctx)
    },
  },
})
</script>
