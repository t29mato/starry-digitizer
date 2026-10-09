<template>
  <div v-if="reviewSession.data" class="mb-3 c__review-panel">
    <h4>
      Auto-Extraction Review
      <v-btn
        size="x-small"
        class="ml-2"
        title="Export Edit Log (JSON)"
        @click="handleOnClickExportEditLog"
        ><v-icon>mdi-download</v-icon></v-btn
      >
      <v-btn
        size="x-small"
        class="ml-1"
        title="End review (stop tracking edits)"
        @click="handleOnClickEndReview"
        ><v-icon>mdi-close</v-icon></v-btn
      >
    </h4>
    <div class="text-caption">
      <div v-if="sourceText" class="text-medium-emphasis">{{ sourceText }}</div>
      <div v-if="reviewSession.data.calibration">
        Tick fit RMS: x
        {{ reviewSession.data.calibration.x.rmsResidualPx.toFixed(2) }}px / y
        {{ reviewSession.data.calibration.y.rmsResidualPx.toFixed(2) }}px
      </div>
      <div v-else class="text-medium-emphasis">
        No axes imported — calibrate them by hand.
      </div>
      <div
        v-for="(warning, i) in reviewSession.data.warnings"
        :key="i"
        class="text-warning"
      >
        ⚠ {{ warning }}
      </div>
      <table v-if="diff" class="mt-1 c__review-table">
        <tr>
          <th>Points</th>
          <td>
            moved {{ diff.summary.points.moved }}, deleted
            {{ diff.summary.points.deleted }}, added
            {{ diff.summary.points.added }}
            <span v-if="diff.summary.points.reassigned"
              >, reassigned {{ diff.summary.points.reassigned }}</span
            >
            <span class="text-medium-emphasis">
              ({{ diff.summary.points.initial }} →
              {{ diff.summary.points.final }})</span
            >
          </td>
        </tr>
        <tr>
          <th>Series</th>
          <td>
            split {{ diff.summary.series.split }}, merged
            {{ diff.summary.series.merged }}, added
            {{ diff.summary.series.added }}, removed
            {{ diff.summary.series.removed }}
          </td>
        </tr>
        <tr>
          <th>Axes</th>
          <td>
            <template v-if="diff.summary.axes.initially_calibrated">
              {{ diff.summary.axes.reference_points_changed }} reference
              point(s), {{ diff.summary.axes.scale_changed }} scale(s) changed
            </template>
            <template v-else>
              {{
                diff.summary.axes.finally_calibrated
                  ? 'calibrated by hand'
                  : 'not calibrated yet'
              }}
            </template>
          </td>
        </tr>
      </table>
      <div class="d-flex align-center mt-1" style="gap: 6px">
        <v-checkbox
          :model-value="reviewView.showChanges"
          @update:model-value="reviewView.setShowChanges(!!$event)"
          label="Show changes"
          density="compact"
          hide-details
        ></v-checkbox>
        <v-btn
          size="x-small"
          :color="reviewView.showInitial ? 'primary' : undefined"
          title="Hold (or hold the I key) to see the imported state"
          @mousedown="reviewView.setShowInitial(true)"
          @mouseup="reviewView.setShowInitial(false)"
          @mouseleave="reviewView.setShowInitial(false)"
          >Hold: imported (I)</v-btn
        >
      </div>
      <div v-if="reviewView.showChanges" class="c__review-legend">
        <span
          ><i class="c__mark" style="border-color: #616161"></i>moved from</span
        >
        <span><b style="color: #d50000">×</b> deleted</span>
        <span
          ><b :style="{ color: lowConfidenceColor }">×</b> below threshold</span
        >
        <span><i class="c__mark" style="border-color: #00c853"></i>added</span>
        <span
          ><i class="c__mark" style="border-color: #ff6d00"></i>other
          series</span
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  reviewSession,
  reviewView,
} from '@/instanceStore/applicationServiceInstances'
import { STYLE } from '@/constants'
import {
  currentReviewDiff,
  downloadEditLog,
} from '@/application/utils/autoExtractionOperations'

// INFO: Shown only during an auto-extraction review (docs/design/
// auto-extraction-review-design.md): where the data came from, how well the
// imported ticks fit, and the live correction cost the edit log will report.
export default defineComponent({
  data() {
    return {
      reviewSession,
      reviewView,
      lowConfidenceColor: STYLE.LOW_CONFIDENCE_POINT_COLOR,
    }
  },
  // INFO: hold `i` to see the imported state (docs/design/
  // auto-extraction-review-design.md, "6."); `i` is not an editing key in
  // CanvasMain, and blur resets it in case the keyup is never seen.
  mounted() {
    document.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKeyDown)
    document.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
  },
  computed: {
    sourceText(): string {
      const source = this.reviewSession.data?.source
      if (!source) return ''
      return ['extractor', 'run']
        .filter((key) => source[key] !== undefined)
        .map((key) => `${key}: ${String(source[key])}`)
        .join(' / ')
    },
    diff() {
      return currentReviewDiff()
    },
  },
  methods: {
    isTypingTarget(e: KeyboardEvent): boolean {
      const target = e.target as Element | null
      if (!target || !('nodeName' in target)) return false
      return (
        target.nodeName === 'INPUT' ||
        target.nodeName === 'TEXTAREA' ||
        target.hasAttribute('contentEditable')
      )
    },
    onKeyDown(e: KeyboardEvent) {
      if (!this.reviewSession.data || e.key.toLowerCase() !== 'i') return
      if (e.metaKey || e.ctrlKey || e.altKey || this.isTypingTarget(e)) return
      this.reviewView.setShowInitial(true)
    },
    onKeyUp(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'i') this.reviewView.setShowInitial(false)
    },
    onBlur() {
      this.reviewView.setShowInitial(false)
    },
    handleOnClickExportEditLog() {
      downloadEditLog()
    },
    handleOnClickEndReview() {
      if (
        window.confirm(
          'End the review? Edits will no longer be tracked and the edit log will be discarded.',
        )
      ) {
        this.reviewSession.clear()
        this.reviewView.setShowChanges(false)
        this.reviewView.setShowInitial(false)
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__review-panel {
    outline: solid 1px gray;
    padding: 4px 6px;
  }
  &__review-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 8px;
    span {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
  }
  &__mark {
    display: inline-block;
    width: 10px;
    height: 10px;
    border: 2px solid;
    border-radius: 50%;
  }
  &__review-table {
    border-collapse: collapse;
    th {
      text-align: left;
      vertical-align: top;
      padding-right: 6px;
      font-weight: bold;
    }
  }
}
</style>
