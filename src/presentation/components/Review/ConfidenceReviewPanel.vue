<template>
  <div v-if="scoredPointCount > 0" class="mt-3">
    <h4>Confidence Review</h4>
    <div class="d-flex align-center">
      <v-slider
        :model-value="confidenceReview.threshold"
        @update:model-value="confidenceReview.setThreshold($event)"
        :min="0"
        :max="1"
        :step="0.01"
        density="compact"
        hide-details
        color="#ff1493"
      ></v-slider>
      <span class="text-caption ml-2" style="width: 3em">{{
        confidenceReview.threshold.toFixed(2)
      }}</span>
    </div>
    <div class="text-caption mb-1">
      <span style="color: #ff1493">●</span> {{ lowPoints.length }} point(s) with
      score &lt; {{ confidenceReview.threshold.toFixed(2) }}
      <span v-if="currentPosition" class="text-medium-emphasis"
        >· at {{ currentPosition }}</span
      >
    </div>
    <div class="d-flex flex-wrap" style="gap: 4px">
      <v-btn
        size="small"
        :disabled="lowPoints.length === 0"
        @click="step(-1)"
        title="Previous (Shift+N)"
        ><v-icon>mdi-chevron-left</v-icon>Prev</v-btn
      >
      <v-btn
        size="small"
        :disabled="lowPoints.length === 0"
        @click="step(1)"
        title="Next (N)"
        >Next<v-icon>mdi-chevron-right</v-icon></v-btn
      >
      <v-btn
        size="small"
        :disabled="lowPoints.length === 0"
        @click="removeBelow"
        >Remove {{ lowPoints.length }}</v-btn
      >
      <v-btn size="small" :disabled="removedCount === 0" @click="restore"
        >Restore {{ removedCount }}</v-btn
      >
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { confidenceReview } from '@/instanceStore/applicationServiceInstances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
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
// carries a score, i.e. after importing a detector's output.
export default defineComponent({
  data() {
    return {
      confidenceReview,
      datasetRepository,
    }
  },
  computed: {
    scoredPointCount(): number {
      return countScoredPoints(this.datasetRepository.datasets)
    },
    lowPoints(): LowConfidencePoint[] {
      return currentLowConfidencePoints()
    },
    removedCount(): number {
      return this.datasetRepository.datasets.reduce(
        (sum, d) => sum + d.scoreRemovedPoints.length,
        0,
      )
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
    step(direction: 1 | -1) {
      goToLowConfidencePoint(direction)
    },
    removeBelow() {
      removePointsBelowThreshold()
    },
    restore() {
      restoreScoreRemovedPoints()
    },
  },
})
</script>
