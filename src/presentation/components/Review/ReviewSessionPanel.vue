<template>
  <div
    v-if="reviewSession.data"
    class="sd-panel mb-3 c__review-panel"
    data-cy="review-session-panel"
  >
    <div class="d-flex align-center">
      <h4 class="mb-0">Auto-Extraction Review</h4>
      <sd-button
        size="x-small"
        variant="text"
        class="ml-2"
        :icon="mdiDownload"
        title="Export Edit Log (JSON)"
        @click="exportEditLog"
      ></sd-button>
      <sd-button
        size="x-small"
        variant="text"
        :icon="mdiClose"
        title="End review (stop tracking edits)"
        :disabled="options.readonly"
        @click="confirmEndReview"
      ></sd-button>
    </div>
    <div class="text-caption">
      <div v-if="sourceText" class="text-medium-emphasis">{{ sourceText }}</div>
      <div v-if="calibrationText">{{ calibrationText }}</div>
      <div v-else class="text-medium-emphasis">
        No axes imported — calibrate them by hand.
      </div>
      <div
        v-for="(warning, i) in reviewSession.data.warnings"
        :key="i"
        class="c__warning"
      >
        ⚠ {{ warning }}
      </div>
      <table v-if="rows.length" class="mt-1 c__review-table">
        <tr v-for="row in rows" :key="row.label">
          <th>{{ row.label }}</th>
          <td>{{ row.text }}</td>
        </tr>
      </table>
      <div class="d-flex align-center mt-1 c__controls">
        <sd-checkbox
          label="Show changes"
          :model-value="reviewView.showChanges"
          @update:model-value="reviewView.setShowChanges(!!$event)"
        ></sd-checkbox>
        <sd-button
          size="x-small"
          :color="reviewView.showInitial ? 'primary' : ''"
          title="Hold (or hold the I key) to see the imported state"
          @mousedown="reviewView.setShowInitial(true)"
          @mouseup="reviewView.setShowInitial(false)"
          @mouseleave="reviewView.setShowInitial(false)"
          >Hold: imported (I)</sd-button
        >
      </div>
      <div v-if="reviewView.showChanges" class="c__review-legend">
        <span
          v-for="item in legend"
          :key="item.label"
          :class="item.className"
          :style="{ '--sd-legend-color': item.color }"
          >{{ item.label }}</span
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mdiClose, mdiDownload } from '@mdi/js'
import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import {
  requestConfirmation,
  useDigitizerOptions,
} from '@/presentation/digitizerOptions'
import { SdButton, SdCheckbox } from '@/presentation/ui'
import { STYLE } from '@/constants'
import {
  buildEditLog,
  currentReviewDiff,
  endReview,
} from '@/application/utils/autoExtractionOperations'
import { EditLogDiff } from '@/application/utils/editLogDiff'
import { downloadJson, timestamp } from '@/presentation/utils/jsonDownload'

const RING = 'c__legend-item c__legend-item--ring'
const CROSS = 'c__legend-item c__legend-item--cross'

// INFO: Shown only during an auto-extraction review (docs/design/
// auto-extraction-review-design.md): where the data came from, how well the
// imported ticks fit, and the live correction cost the edit log will report.
export default defineComponent({
  components: { SdButton, SdCheckbox },
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    const { reviewSession, reviewView } = ctx
    return { ctx, options, reviewSession, reviewView, mdiClose, mdiDownload }
  },
  data() {
    return {
      // INFO: same colours as CanvasReviewDiff.vue draws
      legend: [
        { label: 'moved from', color: '#616161', className: RING },
        { label: 'deleted', color: '#d50000', className: CROSS },
        {
          label: 'below threshold',
          color: STYLE.LOW_CONFIDENCE_POINT_COLOR,
          className: CROSS,
        },
        { label: 'added', color: '#00c853', className: RING },
        { label: 'other series', color: '#ff6d00', className: RING },
      ],
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
    this.reviewView.setShowInitial(false)
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
    calibrationText(): string {
      const calibration = this.reviewSession.data?.calibration
      if (!calibration) return ''
      const x = calibration.x.rmsResidualPx.toFixed(2)
      const y = calibration.y.rmsResidualPx.toFixed(2)
      return `Tick fit RMS: x ${x}px / y ${y}px`
    },
    diff(): EditLogDiff | null {
      return currentReviewDiff(this.ctx)
    },
    rows(): { label: string; text: string }[] {
      if (!this.diff) return []
      const { points, series, axes } = this.diff.summary
      const reassigned = points.reassigned
        ? `, reassigned ${points.reassigned}`
        : ''
      const pointsText =
        `moved ${points.moved}, deleted ${points.deleted}, ` +
        `added ${points.added}${reassigned} ` +
        `(${points.initial} → ${points.final})`
      const seriesText =
        `split ${series.split}, merged ${series.merged}, ` +
        `added ${series.added}, removed ${series.removed}`
      let axesText: string
      if (axes.initially_calibrated) {
        axesText =
          `${axes.reference_points_changed} reference point(s), ` +
          `${axes.scale_changed} scale(s) changed`
      } else {
        axesText = axes.finally_calibrated
          ? 'calibrated by hand'
          : 'not calibrated yet'
      }
      return [
        { label: 'Points', text: pointsText },
        { label: 'Series', text: seriesText },
        { label: 'Axes', text: axesText },
      ]
    },
  },
  methods: {
    isTypingTarget(e: KeyboardEvent): boolean {
      const target = e.target as Element | null
      if (!target || !('nodeName' in target)) return false
      return (
        target.nodeName === 'INPUT' ||
        target.nodeName === 'TEXTAREA' ||
        target.nodeName === 'SELECT' ||
        target.hasAttribute('contentEditable')
      )
    },
    onKeyDown(e: KeyboardEvent) {
      if (!this.options.features.keyboardEditing) return
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
    exportEditLog() {
      const editLog = buildEditLog(this.ctx)
      if (!editLog) return
      downloadJson(editLog, `edit-log-${timestamp()}.json`)
    },
    async confirmEndReview() {
      const confirmed = await requestConfirmation(
        this.options,
        'End the review? Edits will no longer be tracked and the edit log will be discarded.',
      )
      if (confirmed) endReview(this.ctx)
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
  &__warning {
    color: #b26a00;
  }
  &__controls {
    gap: 6px;
  }
  &__review-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 8px;
  }
  &__legend-item {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    &--ring::before {
      content: '';
      display: inline-block;
      width: 10px;
      height: 10px;
      border: 2px solid var(--sd-legend-color);
      border-radius: 50%;
    }
    &--cross::before {
      content: '×';
      font-weight: bold;
      color: var(--sd-legend-color);
    }
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
