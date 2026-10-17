<template>
  <div v-if="scoredPointCount > 0" class="sd-panel mt-3">
    <h4>Confidence Review</h4>
    <div class="d-flex align-center">
      <input
        class="c__threshold"
        type="range"
        min="0"
        max="1"
        step="0.01"
        aria-label="Score threshold"
        data-cy="confidence-threshold"
        :value="confidenceReview.threshold"
        @input="onThresholdInput"
      />
      <span class="text-caption ml-2 c__threshold-value">{{
        confidenceReview.threshold.toFixed(2)
      }}</span>
    </div>
    <div
      class="text-caption mb-1 c__summary"
      :style="{ '--sd-low-confidence': lowConfidenceColor }"
    >
      {{ summary }}
    </div>
    <div class="d-flex flex-wrap c__buttons">
      <sd-button
        size="small"
        :icon="mdiChevronLeft"
        title="Previous (Shift+N)"
        :disabled="lowPoints.length === 0"
        @click="step(-1)"
        >Prev</sd-button
      >
      <sd-button
        size="small"
        title="Next (N)"
        :disabled="lowPoints.length === 0"
        @click="step(1)"
        >Next</sd-button
      >
      <sd-button
        size="small"
        :disabled="!canEdit || lowPoints.length === 0"
        @click="removeBelow"
        >Remove {{ lowPoints.length }}</sd-button
      >
      <sd-button
        size="small"
        :disabled="!canEdit || removedCount === 0"
        @click="restore"
        >Restore {{ removedCount }}</sd-button
      >
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mdiChevronLeft } from '@mdi/js'
import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { SdButton } from '@/presentation/ui'
import { STYLE } from '@/constants'
import {
  countScoredPoints,
  LowConfidencePoint,
} from '@/application/utils/confidenceReview'
import {
  currentLowConfidencePoints,
  goToLowConfidencePoint,
  removePointsBelowThreshold,
  restoreScoreRemovedPoints,
} from '@/application/utils/confidenceReviewOperations'

// INFO: docs/design/auto-extraction-review-design.md, "2.": highlight
// low-score points, step through them lowest first, and take them out in
// bulk (kept aside, so they can be restored). Shown only when some point
// carries a score, i.e. after importing a detector's output or a Server
// Extraction with per-point scores.
export default defineComponent({
  components: { SdButton },
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    const { confidenceReview, datasetRepository } = ctx
    return {
      ctx,
      options,
      confidenceReview,
      datasetRepository,
      mdiChevronLeft,
      lowConfidenceColor: STYLE.LOW_CONFIDENCE_POINT_COLOR,
    }
  },
  computed: {
    canEdit(): boolean {
      return !this.options.readonly
    },
    scoredPointCount(): number {
      return countScoredPoints(this.datasetRepository.datasets)
    },
    lowPoints(): LowConfidencePoint[] {
      return currentLowConfidencePoints(this.ctx)
    },
    removedCount(): number {
      return this.datasetRepository.datasets.reduce(
        (sum, d) => sum + d.scoreRemovedPoints.length,
        0,
      )
    },
    summary(): string {
      const threshold = this.confidenceReview.threshold.toFixed(2)
      const count = `${this.lowPoints.length} point(s)`
      const text = `${count} with score < ${threshold}`
      if (!this.currentPosition) return text
      return `${text} · at ${this.currentPosition}`
    },
    currentPosition(): string {
      const current = this.confidenceReview.current
      if (!current) return ''
      const index = this.lowPoints.findIndex(
        (p) =>
          p.datasetId === current.datasetId && p.pointId === current.pointId,
      )
      return index === -1 ? '' : `${index + 1}/${this.lowPoints.length}`
    },
  },
  methods: {
    onThresholdInput(event: Event) {
      const value = parseFloat((event.target as HTMLInputElement).value)
      if (!Number.isNaN(value)) this.confidenceReview.setThreshold(value)
    },
    step(direction: 1 | -1) {
      goToLowConfidencePoint(this.ctx, direction)
    },
    removeBelow() {
      removePointsBelowThreshold(this.ctx)
    },
    restore() {
      restoreScoreRemovedPoints(this.ctx)
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__threshold {
    flex: 1;
    min-width: 0;
    accent-color: #ff1493;
  }
  &__threshold-value {
    width: 3em;
  }
  // INFO: the dot in the low-confidence color, before the count
  &__summary::before {
    content: '● ';
    color: var(--sd-low-confidence);
  }
  &__buttons {
    gap: 4px;
  }
}
</style>
