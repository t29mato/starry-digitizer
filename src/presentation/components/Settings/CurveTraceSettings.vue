<template>
  <div class="c__trace mb-2" data-cy="curve-trace-settings">
    <div class="text-caption mb-1">
      Click a curve to follow it both ways in its colour. Uses the colour
      distance and the mask below.
    </div>
    <div class="d-flex c__row">
      <sd-text-field
        data-cy="trace-gap"
        type="number"
        min="0"
        :max="limits.maxGapPx"
        step="1"
        prefix="Max gap:"
        suffix="px"
        :model-value="curveTrace.maxGapPx"
        :disabled="options.readonly"
        @update:model-value="onGap"
      ></sd-text-field>
      <sd-text-field
        data-cy="trace-spacing"
        type="number"
        :min="limits.minSpacingPx"
        :max="limits.maxSpacingPx"
        step="1"
        prefix="Every:"
        suffix="px"
        :model-value="curveTrace.spacingPx"
        :disabled="options.readonly"
        @update:model-value="onSpacing"
      ></sd-text-field>
    </div>
    <div class="d-flex c__row mt-1">
      <sd-select
        data-cy="trace-sampling"
        prefix="Along:"
        :model-value="curveTrace.sampling"
        :items="samplingItems"
        :disabled="options.readonly"
        @update:model-value="onSampling"
      ></sd-select>
      <sd-select
        data-cy="trace-color-source"
        prefix="Colour:"
        :model-value="curveTrace.colorSource"
        :items="colorSourceItems"
        :disabled="options.readonly"
        @update:model-value="onColorSource"
      ></sd-select>
    </div>
    <div
      v-if="status"
      class="text-caption mt-1"
      :class="{ c__error: !!curveTrace.lastOutcome?.error }"
      data-cy="trace-status"
    >
      <span
        v-if="curveTrace.lastOutcome?.colorHex"
        class="c__swatch"
        :style="{ background: curveTrace.lastOutcome.colorHex }"
      ></span>
      {{ status }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { SdSelect, SdTextField } from '@/presentation/ui'
import { TRACE_LIMITS, TraceStop } from '@/application/utils/curveTrace'

const STOP_TEXT: Record<TraceStop, string> = {
  end: 'line ended',
  edge: 'image edge',
  mask: 'mask boundary',
  loop: 'closed curve',
  junction: 'sharp turn / junction',
  limit: 'step limit',
}

// INFO: the Trace Curve tool's settings, shown under the Manual Extraction
// modes while Trace is the active mode. The tracing itself is
// curveTraceOperations.ts; CanvasMain calls it on a click.
export default defineComponent({
  components: { SdSelect, SdTextField },
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    return { options, curveTrace: ctx.curveTrace, limits: TRACE_LIMITS }
  },
  data() {
    return {
      samplingItems: [
        { title: 'the path', value: 'path' },
        { title: 'x', value: 'x' },
      ],
      colorSourceItems: [
        { title: 'under the click', value: 'click' },
        { title: 'Color Settings', value: 'picker' },
      ],
    }
  },
  computed: {
    status(): string {
      const outcome = this.curveTrace.lastOutcome
      if (!outcome) return ''
      if (outcome.error) return outcome.error
      const ends = outcome.stops
        ? ` · ends: ${STOP_TEXT[outcome.stops[0]]}, ${
            STOP_TEXT[outcome.stops[1]]
          }`
        : ''
      return `Added ${outcome.added} point(s)${ends}`
    },
  },
  methods: {
    onGap(value: string | number) {
      this.curveTrace.setMaxGapPx(Number(value))
    },
    onSpacing(value: string | number) {
      this.curveTrace.setSpacingPx(Number(value))
    },
    onSampling(value: string | number) {
      this.curveTrace.setSampling(value === 'x' ? 'x' : 'path')
    },
    onColorSource(value: string | number) {
      this.curveTrace.setColorSource(value === 'picker' ? 'picker' : 'click')
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__row {
    gap: 4px;
  }
  &__error {
    color: var(--sd-error, #e53935);
  }
  &__swatch {
    display: inline-block;
    width: 0.8em;
    height: 0.8em;
    margin-right: 4px;
    vertical-align: middle;
    border: 1px solid var(--sd-border, rgba(0, 0, 0, 0.24));
  }
}
</style>
