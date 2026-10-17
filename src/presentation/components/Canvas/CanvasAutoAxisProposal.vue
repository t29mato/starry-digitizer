<template>
  <!-- INFO: the pending Auto-place proposal's tick candidates, drawn where
       the backend read them so the user can check them against the figure
       before applying. pointer-events: none — it must never take a click,
       a drag or a hover away from the canvas underneath. -->
  <svg
    v-if="proposal"
    class="c__auto-axis-proposal"
    data-cy="auto-axis-proposal"
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
  >
    <rect
      v-if="frame"
      :x="frame.x"
      :y="frame.y"
      :width="frame.width"
      :height="frame.height"
      fill="none"
      :stroke="color"
      stroke-width="1"
      stroke-dasharray="4 3"
    />
    <g v-for="(tick, i) in xTicks" :key="`x${i}`">
      <line
        :x1="tick.x"
        :y1="tick.y - tickLength"
        :x2="tick.x"
        :y2="tick.y + tickLength"
        :stroke="color"
        stroke-width="2"
      />
      <text
        :x="tick.x"
        :y="tick.y + tickLength + 11"
        text-anchor="middle"
        class="c__label"
        v-text="tick.label"
      ></text>
    </g>
    <g v-for="(tick, i) in yTicks" :key="`y${i}`">
      <line
        :x1="tick.x - tickLength"
        :y1="tick.y"
        :x2="tick.x + tickLength"
        :y2="tick.y"
        :stroke="color"
        stroke-width="2"
      />
      <text
        :x="tick.labelX"
        :y="tick.y + 4"
        :text-anchor="ySide === 'right' ? 'start' : 'end'"
        class="c__label"
        v-text="tick.label"
      ></text>
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { AutoCalibrationProposal } from '@/application/services/autoService/autoServiceWire'

type DrawnTick = { x: number; y: number; label: string; labelX: number }

// INFO: an orange that reads on the white background of a typical figure and
// is not used by points, axes, selection or the review overlay
const PROPOSAL_COLOR = '#e65100'

export default defineComponent({
  setup() {
    const { autoFeatures, axisSetRepository, canvasHandler } =
      useDigitizerContext()
    return { autoFeatures, axisSetRepository, canvasHandler }
  },
  data() {
    return { color: PROPOSAL_COLOR, tickLength: 6 }
  },
  computed: {
    // INFO: only the proposal made for the axis set on screen
    proposal(): AutoCalibrationProposal | null {
      const { proposal, proposalAxisSetId } = this.autoFeatures
      if (proposalAxisSetId !== this.axisSetRepository.activeAxisSetId) {
        return null
      }
      return proposal
    },
    scale(): number {
      return this.canvasHandler.scale
    },
    width(): number {
      return Math.max(this.canvasHandler.originalWidth * this.scale, 0)
    },
    height(): number {
      return Math.max(this.canvasHandler.originalHeight * this.scale, 0)
    },
    ySide(): 'left' | 'right' {
      return this.proposal?.ySide ?? 'left'
    },
    frame(): { x: number; y: number; width: number; height: number } | null {
      const frame = this.proposal?.frame
      if (!frame) return null
      return {
        x: frame.xPx * this.scale,
        y: frame.yPx * this.scale,
        width: frame.widthPx * this.scale,
        height: frame.heightPx * this.scale,
      }
    },
    // INFO: ticks are 1-D, so they sit on the axis lines (the frame's
    // bottom / left or right edge), or on the image edge without a frame
    xAxisY(): number {
      const frame = this.frame
      return frame ? frame.y + frame.height : this.height
    },
    yAxisX(): number {
      const frame = this.frame
      if (!frame) return this.ySide === 'right' ? this.width : 0
      return this.ySide === 'right' ? frame.x + frame.width : frame.x
    },
    xTicks(): DrawnTick[] {
      const axis = this.proposal?.x
      if (!axis) return []
      return axis.ticks.map((tick) => ({
        x: tick.px * this.scale,
        y: this.xAxisY,
        label: String(tick.value),
        labelX: tick.px * this.scale,
      }))
    },
    yTicks(): DrawnTick[] {
      const axis = this.proposal?.y
      if (!axis) return []
      // INFO: labels go outside the frame, on the side the axis is on
      const gap = this.tickLength + 2
      const labelX =
        this.ySide === 'right' ? this.yAxisX + gap : this.yAxisX - gap
      return axis.ticks.map((tick) => ({
        x: this.yAxisX,
        y: tick.px * this.scale,
        label: String(tick.value),
        labelX,
      }))
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__auto-axis-proposal {
    position: absolute;
    top: 0;
    left: 0;
    overflow: visible;
    pointer-events: none;
  }
  &__label {
    font-size: 10px;
    fill: #e65100;
    paint-order: stroke;
    stroke: #fff;
    stroke-width: 3px;
  }
}
</style>
