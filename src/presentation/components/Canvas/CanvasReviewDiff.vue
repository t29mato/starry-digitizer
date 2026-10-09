<template>
  <svg
    v-if="overlay && (reviewView.showChanges || reviewView.showInitial)"
    class="c__review-diff"
    :width="canvasHandler.originalWidth * scale"
    :height="canvasHandler.originalHeight * scale"
  >
    <!-- INFO: the imported state, while "show imported" is held -->
    <g v-if="reviewView.showInitial">
      <g v-for="(series, i) in overlay.initialSeries" :key="`init-${i}`">
        <circle
          v-for="(p, j) in series.points"
          :key="j"
          :cx="p.xPx * scale"
          :cy="p.yPx * scale"
          :r="pointRadius"
          :fill="seriesColor(i)"
          stroke="black"
          stroke-width="1"
        />
      </g>
    </g>
    <g v-else>
      <g v-for="(m, i) in overlay.axes" :key="`axis-${i}`">
        <line v-bind="segment(m.from, m.to)" class="c__trail" />
        <rect
          :x="m.from.xPx * scale - pointRadius"
          :y="m.from.yPx * scale - pointRadius"
          :width="pointRadius * 2"
          :height="pointRadius * 2"
          class="c__ghost"
        />
      </g>
      <g v-for="(m, i) in overlay.moved" :key="`moved-${i}`">
        <line v-bind="segment(m.from, m.to)" class="c__trail" />
        <circle
          :cx="m.from.xPx * scale"
          :cy="m.from.yPx * scale"
          :r="pointRadius"
          class="c__ghost"
        />
      </g>
      <path
        v-for="(d, i) in overlay.deleted"
        :key="`deleted-${i}`"
        :d="cross(d.at)"
        :stroke="d.byThreshold ? lowConfidenceColor : '#d50000'"
        stroke-width="2"
      />
      <circle
        v-for="(a, i) in overlay.added"
        :key="`added-${i}`"
        :cx="a.at.xPx * scale"
        :cy="a.at.yPx * scale"
        :r="ringRadius"
        class="c__ring"
        stroke="#00c853"
      />
      <circle
        v-for="(r, i) in overlay.reassigned"
        :key="`reassigned-${i}`"
        :cx="r.at.xPx * scale"
        :cy="r.at.yPx * scale"
        :r="ringRadius"
        class="c__ring"
        stroke="#ff6d00"
      />
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  canvasHandler,
  reviewView,
} from '@/instanceStore/applicationServiceInstances'
import { currentReviewOverlay } from '@/application/utils/autoExtractionOperations'
import { ReviewDiffOverlay } from '@/application/utils/reviewDiffOverlay'
import { Coord } from '@/@types/types'
import { DATASET_COLORS, STYLE } from '@/constants'

// INFO: Compares against the imported state (docs/design/
// auto-extraction-review-design.md, "6."). pointer-events: none, so all
// canvas interaction passes through untouched.
export default defineComponent({
  data() {
    return {
      canvasHandler,
      reviewView,
      pointRadius: STYLE.POINT_SIZE_PX / 2,
      ringRadius: STYLE.POINT_SIZE_PX / 2 + 4,
      lowConfidenceColor: STYLE.LOW_CONFIDENCE_POINT_COLOR,
    }
  },
  computed: {
    scale(): number {
      return this.canvasHandler.scale
    },
    overlay(): ReviewDiffOverlay | null {
      if (!this.reviewView.showChanges && !this.reviewView.showInitial) {
        return null
      }
      return currentReviewOverlay()
    },
  },
  methods: {
    seriesColor(index: number): string {
      return DATASET_COLORS[index % DATASET_COLORS.length]
    },
    segment(from: Coord, to: Coord) {
      return {
        x1: from.xPx * this.scale,
        y1: from.yPx * this.scale,
        x2: to.xPx * this.scale,
        y2: to.yPx * this.scale,
      }
    },
    cross(at: Coord): string {
      const x = at.xPx * this.scale
      const y = at.yPx * this.scale
      const r = this.pointRadius
      return `M${x - r},${y - r}L${x + r},${y + r}M${x - r},${y + r}L${x + r},${
        y - r
      }`
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__review-diff {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 3;
  }
  &__trail {
    stroke: #616161;
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
  }
  &__ghost {
    fill: none;
    stroke: #616161;
    stroke-width: 1.5;
  }
  &__ring {
    fill: none;
    stroke-width: 2.5;
  }
}
</style>
