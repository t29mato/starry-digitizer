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
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { reviewSession } from '@/instanceStore/applicationServiceInstances'
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
    }
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
