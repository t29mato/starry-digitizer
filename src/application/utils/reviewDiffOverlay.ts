import { Coord } from '@/@types/types'
import { diffReviewState, ReviewState } from '@/application/utils/editLogDiff'

// INFO: What the canvas draws to show "what was fixed" (docs/design/
// auto-extraction-review-design.md, "6."). Built from the very same
// diffReviewState() the edit log uses, so what you see is what gets counted.
// All coordinates are original-image pixels.

export type ReviewDiffOverlay = {
  moved: { from: Coord; to: Coord }[]
  deleted: { at: Coord; byThreshold: boolean }[]
  added: { at: Coord }[]
  reassigned: { at: Coord }[]
  axes: { name: string; from: Coord; to: Coord }[]
  // INFO: for the "show imported state" view, one entry per initial series
  initialSeries: { label: string; points: Coord[] }[]
}

const coord = ([xPx, yPx]: [number, number]): Coord => ({ xPx, yPx })

export function buildReviewDiffOverlay(
  initial: ReviewState,
  current: ReviewState,
  moveTolerancePx: number,
): ReviewDiffOverlay {
  const { details } = diffReviewState(initial, current, moveTolerancePx)

  const initialPosition = (series: number, index: number): Coord => {
    const point = initial.series[series].points.find(
      (p) => p.origin?.index === index,
    )
    return { xPx: point?.xPx ?? NaN, yPx: point?.yPx ?? NaN }
  }

  const axes: ReviewDiffOverlay['axes'] = []
  // INFO: without imported axes there is nothing to compare against
  if (initial.axes.calibrated) {
    ;(['x1', 'x2', 'y1', 'y2'] as const).forEach((name) => {
      const from = initial.axes[name]
      const to = current.axes[name]
      if (Math.hypot(from.xPx - to.xPx, from.yPx - to.yPx) > moveTolerancePx) {
        axes.push({
          name,
          from: { xPx: from.xPx, yPx: from.yPx },
          to: { xPx: to.xPx, yPx: to.yPx },
        })
      }
    })
  }

  return {
    moved: details.moved.map((m) => {
      const from = initialPosition(m.series, m.index)
      return {
        from,
        to: { xPx: from.xPx + m.dx, yPx: from.yPx + m.dy },
      }
    }),
    deleted: details.deleted.map((d) => ({
      at: coord(d.px),
      byThreshold: d.by_threshold,
    })),
    added: details.added.map((a) => ({ at: coord(a.px) })),
    reassigned: details.reassigned.map((r) => ({ at: coord(r.px) })),
    axes,
    initialSeries: initial.series.map((s) => ({
      label: s.label,
      points: s.points.map((p) => ({ xPx: p.xPx, yPx: p.yPx })),
    })),
  }
}
