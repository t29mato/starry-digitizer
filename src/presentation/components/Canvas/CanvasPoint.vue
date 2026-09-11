<template>
  <div
    class="canvas-point"
    :style="{
      position: 'absolute',
      top: hitTop,
      left: hitLeft,
      cursor: cursor,
      width: hitSize,
      height: hitSize,
      'box-sizing': 'border-box',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      visibility: isVisible ? 'visible' : 'hidden',
      zIndex: zIndex,
    }"
    @click="click"
  >
    <!-- INFO: two elements, because the pointer target and the dot are no
         longer the same size. The OUTER one is the hit area (transparent,
         never smaller than STYLE.POINT_HIT_MIN_SIZE_PX) and keeps
         `canvas-point` as its ONLY class — CanvasMain identifies a click on a
         point with `target.className === 'canvas-point'`, and the e2e specs
         count and position these. This one is the dot, which shrinks with the
         zoom; `pointer-events: none` keeps it out of the way so the click
         target stays the outer element.
         The comment sits INSIDE the root: above it, the SFC compiles to a
         fragment and the component no longer has a single root element. -->
    <div
      :style="{
        width: size,
        height: size,
        'box-sizing': 'border-box',
        'background-color': backgroundColor,
        // INFO: 白一色の縁取りだと白背景(または明るい背景色)のグラフで見えなく
        // なるため、白+黒の二重リングにして、明暗どちらの背景でも最低限どちらか
        // の縁でコントラストを確保する。box-shadowはレイアウトに影響しないため
        // borderの代わりに使う。
        'box-shadow': '0 0 0 1px white, 0 0 0 2px black',
        'border-radius': borderRadius,
        opacity: opacity,
        'pointer-events': 'none',
      }"
    ></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { Point } from '@/@types/types'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { deletePoint } from '@/application/utils/pointOperations'
import { MANUAL_MODE, STYLE } from '@/constants'
import { scaledMarkerSizePx } from '@/application/utils/markerSize'
import { nearestPointId } from '@/application/utils/pointPicking'

export default defineComponent({
  setup() {
    const ctx = useDigitizerContext()
    const { interpolator, canvasHandler, datasetRepository } = ctx
    const options = useDigitizerOptions()
    return { ctx, interpolator, canvasHandler, datasetRepository, options }
  },
  data() {
    return {
      pointOpacity: STYLE.POINT_OPACITY,
      tempPointOpacity: STYLE.TEMP_POINT_OPACITY,
      pointSizePx: STYLE.POINT_SIZE_PX,
      tempPointSizePx: STYLE.TEMP_POINT_SIZE_PX,
    }
  },
  computed: {
    xPx(): number {
      return this.point.xPx
    },
    yPx(): number {
      return this.point.yPx
    },
    cursor(): string | undefined {
      const mode = this.canvasHandler.manualMode
      if (mode === MANUAL_MODE.EDIT || mode === MANUAL_MODE.DELETE) {
        return 'pointer'
      }
      return undefined
    },
    opacity() {
      return this.isTemporary ? this.tempPointOpacity : this.pointOpacity
    },
    backgroundColor() {
      if (this.isActive) {
        return '#ff0000'
      }

      if (this.isManuallyAdded && this.interpolator.isActive) {
        return '#6a5acd'
      }

      // Use dataset color if provided (for show all datasets mode)
      if (this.datasetColor) {
        return this.datasetColor
      }

      return '#1e90ff'
    },
    borderRadius(): string {
      //TODO: 本来はinterpolatorのanchor pointsであるべきものを、暫定的にpointで表現しているので、最終的にここは消したい

      if (this.isManuallyAdded && this.interpolator.isActive) {
        return '0'
      }

      return '50%'
    },
    // INFO: the dot, scaled with the canvas so it stays the same size
    // relative to the figure — see scaledMarkerSizePx().
    scaledSizePx(): number {
      if (this.isTemporary) {
        return scaledMarkerSizePx(
          this.tempPointSizePx,
          this.canvasHandler.scale,
          STYLE.TEMP_POINT_MIN_SIZE_PX,
          STYLE.TEMP_POINT_MAX_SIZE_PX,
        )
      }
      return scaledMarkerSizePx(
        this.pointSizePx,
        this.canvasHandler.scale,
        STYLE.POINT_MIN_SIZE_PX,
        STYLE.POINT_MAX_SIZE_PX,
      )
    },
    // INFO: the pointer target. Never smaller than the dot, and never so small
    // that a zoomed-out point cannot be grabbed.
    hitSizePx(): number {
      return Math.max(this.scaledSizePx, STYLE.POINT_HIT_MIN_SIZE_PX)
    },
    size(): string {
      return this.scaledSizePx + 'px'
    },
    hitSize(): string {
      return this.hitSizePx + 'px'
    },
    hitTop(): string {
      return this.yPx - this.hitSizePx / 2 + 'px'
    },
    hitLeft(): string {
      return this.xPx - this.hitSizePx / 2 + 'px'
    },
    zIndex(): string {
      if (this.isTemporary) {
        return '1'
      }

      return '2'
    },
  },
  props: {
    point: {
      type: Object as () => Point,
      required: true,
    },
    isActive: {
      type: Boolean,
    },
    isVisible: {
      type: Boolean,
    },
    isTemporary: {
      type: Boolean,
      default: false,
    },
    isManuallyAdded: {
      type: Boolean,
      default: false,
    },
    datasetColor: {
      type: String,
      default: undefined,
    },
  },
  methods: {
    /**
     * The point this click means — the NEAREST marker covering it, not
     * necessarily this component's own.
     *
     * INFO: markers overlap wherever points sit closer together than the hit
     * area, and the browser gives the click to whichever element is on top.
     * That is not what the user aimed at: measured on real figures, a third of
     * clicks in the 6-12px band landed on the wrong point, and half of those
     * on a point that was not even the closest. The element that RECEIVED the
     * click is therefore only the entry point; which point it refers to is
     * decided by distance (see nearestPointId).
     *
     * Only the active dataset's points are candidates, because that is the
     * only dataset the actions below touch. Temporary points are their own
     * preview overlay and resolve to themselves.
     */
    resolvePointId(event: MouseEvent): number {
      if (this.isTemporary || this.datasetRepository.isViewAllMode) {
        return this.point.id
      }

      const target = event.currentTarget as HTMLElement | null
      if (!target) return this.point.id

      // INFO: measured off the element's own box rather than offsetX/offsetY,
      // which Chrome rounds — the markers here are only a few pixels apart, so
      // a rounded coordinate can change which point is nearest.
      const rect = target.getBoundingClientRect()
      const coord = {
        xPx: this.xPx + (event.clientX - (rect.left + rect.width / 2)),
        yPx: this.yPx + (event.clientY - (rect.top + rect.height / 2)),
      }

      const dataset = this.datasetRepository.activeDataset
      const candidates = dataset
        .scaledPoints(this.canvasHandler.scale)
        .filter((point) => dataset.visiblePointIds.includes(point.id))

      return nearestPointId(candidates, coord, this.hitSizePx) ?? this.point.id
    },
    click(event: MouseEvent) {
      // INFO: readonly mode is view-only: selecting or deleting points is disabled.
      if (this.options.readonly) {
        return
      }
      const pointId = this.resolvePointId(event)
      switch (this.canvasHandler.manualMode) {
        // INFO: CanvasMain Component -> point method
        case MANUAL_MODE.ADD:
          return
        case MANUAL_MODE.EDIT:
          if (event.ctrlKey || event.metaKey) {
            this.datasetRepository.activeDataset.toggleActivatedPoint(pointId)
            return
          }
          this.datasetRepository.activeDataset.switchActivatedPoint(pointId)
          return
        case MANUAL_MODE.DELETE:
          // INFO: through the use case, not clearPoint() directly — that is
          // where the undo snapshot is taken. Deleting by click used to be the
          // one deletion you could not undo, while the very same deletion by
          // Backspace could be (CanvasMain.handleDeleteKeys).
          deletePoint(this.ctx, pointId)

          return
        default:
          break
      }
    },
  },
})
</script>
