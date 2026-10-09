import { Point, PointOrigin } from '@/@types/types'

// INFO: Correction cost = the difference between the state right after an
// auto-extraction import and the current state (docs/design/
// auto-extraction-review-design.md, "差分の定義"). Diffing instead of
// counting UI operations makes the numbers independent of which UI path
// made an edit, of undo/redo, and of save/reload in the middle of a review.
// Point identity is Point.origin, which only imported points carry.

export type ReviewAxisPoint = { xPx: number; yPx: number; value: number }

export type ReviewAxesState = {
  calibrated: boolean
  x1: ReviewAxisPoint
  x2: ReviewAxisPoint
  y1: ReviewAxisPoint
  y2: ReviewAxisPoint
  xIsLogScale: boolean
  yIsLogScale: boolean
}

export type ReviewSeriesState = {
  label: string
  points: Point[]
  // INFO: points taken out with the confidence threshold (still deleted
  // as far as the result goes, but reported separately)
  scoreRemovedPoints?: Point[]
}

export type ReviewState = {
  series: ReviewSeriesState[]
  axes: ReviewAxesState
}

export type EditLogSummary = {
  points: {
    initial: number
    final: number
    kept: number
    moved: number
    deleted: number
    deleted_by_threshold: number
    added: number
    reassigned: number
  }
  series: {
    initial: number
    final: number
    split: number
    merged: number
    added: number
    removed: number
    renamed: number
  }
  axes: {
    initially_calibrated: boolean
    finally_calibrated: boolean
    reference_points_changed: number
    scale_changed: number
  }
}

export type EditLogDetails = {
  moved: {
    series: number
    index: number
    dx: number
    dy: number
    distance: number
  }[]
  deleted: {
    series: number
    index: number
    px: [number, number]
    score: number | null
    by_threshold: boolean
  }[]
  added: { dataset: string; px: [number, number] }[]
  // INFO: surviving points outside their series' primary destination;
  // `px` is the current position
  reassigned: {
    series: number
    index: number
    dataset: string
    px: [number, number]
  }[]
  series_mapping: {
    series: number
    label: string
    destinations: { dataset: string; points: number }[]
  }[]
}

export type EditLogDiff = { summary: EditLogSummary; details: EditLogDetails }

const originKey = (series: number, index: number) => `${series}:${index}`

export function diffReviewState(
  initial: ReviewState,
  current: ReviewState,
  moveTolerancePx: number,
): EditLogDiff {
  // INFO: where each imported point ended up: dataset position in
  // current.series + the point itself
  const finalByOrigin = new Map<string, { dataset: number; point: Point }>()
  const removedByThreshold = new Set<string>()
  current.series.forEach((dataset, datasetIndex) => {
    dataset.scoreRemovedPoints?.forEach((point) => {
      if (point.origin) {
        removedByThreshold.add(
          originKey(point.origin.series, point.origin.index),
        )
      }
    })
    dataset.points.forEach((point) => {
      if (point.origin) {
        finalByOrigin.set(originKey(point.origin.series, point.origin.index), {
          dataset: datasetIndex,
          point,
        })
      }
    })
  })

  const details: EditLogDetails = {
    moved: [],
    deleted: [],
    added: [],
    reassigned: [],
    series_mapping: [],
  }
  let kept = 0
  let split = 0
  let removed = 0
  let renamed = 0

  initial.series.forEach((series, seriesIndex) => {
    const destinationCounts = new Map<number, number>()
    const survivors: { dataset: number; point: Point }[] = []
    series.points.forEach((initialPoint) => {
      const origin = initialPoint.origin
      if (!origin) return
      const key = originKey(origin.series, origin.index)
      const found = finalByOrigin.get(key)
      if (!found) {
        details.deleted.push({
          series: origin.series,
          index: origin.index,
          px: [initialPoint.xPx, initialPoint.yPx],
          score: initialPoint.score ?? null,
          by_threshold: removedByThreshold.has(key),
        })
        return
      }
      survivors.push(found)
      destinationCounts.set(
        found.dataset,
        (destinationCounts.get(found.dataset) ?? 0) + 1,
      )
      const dx = found.point.xPx - initialPoint.xPx
      const dy = found.point.yPx - initialPoint.yPx
      const distance = Math.hypot(dx, dy)
      if (distance > moveTolerancePx) {
        details.moved.push({
          series: origin.series,
          index: origin.index,
          dx,
          dy,
          distance,
        })
      } else {
        kept++
      }
    })

    // INFO: sorted by point count (desc), so destinations[0] is the series'
    // primary destination; ties go to the earlier dataset
    const destinations = [...destinationCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .map(([dataset, points]) => ({ dataset, points }))
    details.series_mapping.push({
      series: seriesIndex,
      label: series.label,
      destinations: destinations.map((d) => ({
        dataset: current.series[d.dataset].label,
        points: d.points,
      })),
    })

    if (destinations.length === 0) {
      if (series.points.length > 0) removed++
      return
    }
    split += destinations.length - 1
    survivors
      .filter((s) => s.dataset !== destinations[0].dataset)
      .forEach(({ dataset, point }) => {
        details.reassigned.push({
          series: seriesIndex,
          index: (point.origin as PointOrigin).index,
          dataset: current.series[dataset].label,
          px: [point.xPx, point.yPx],
        })
      })
    if (current.series[destinations[0].dataset].label !== series.label) {
      renamed++
    }
  })

  let merged = 0
  let addedSeries = 0
  current.series.forEach((dataset) => {
    const origins = new Set<number>()
    dataset.points.forEach((point) => {
      if (point.origin) {
        origins.add(point.origin.series)
      } else {
        details.added.push({
          dataset: dataset.label,
          px: [point.xPx, point.yPx],
        })
      }
    })
    merged += Math.max(0, origins.size - 1)
    if (origins.size === 0 && dataset.points.length > 0) addedSeries++
  })

  const countPoints = (state: ReviewState) =>
    state.series.reduce((sum, s) => sum + s.points.length, 0)

  return {
    summary: {
      points: {
        initial: countPoints(initial),
        final: countPoints(current),
        kept,
        moved: details.moved.length,
        deleted: details.deleted.length,
        deleted_by_threshold: details.deleted.filter((d) => d.by_threshold)
          .length,
        added: details.added.length,
        reassigned: details.reassigned.length,
      },
      series: {
        initial: initial.series.length,
        final: current.series.filter((s) => s.points.length > 0).length,
        split,
        merged,
        added: addedSeries,
        removed,
        renamed,
      },
      axes: diffAxes(initial.axes, current.axes, moveTolerancePx),
    },
    details,
  }
}

function diffAxes(
  initial: ReviewAxesState,
  current: ReviewAxesState,
  moveTolerancePx: number,
): EditLogSummary['axes'] {
  // INFO: when the import had no axes the human calibrated from scratch;
  // per-reference-point changes are meaningless then, so only report
  // whether calibration exists now
  if (!initial.calibrated) {
    return {
      initially_calibrated: false,
      finally_calibrated: current.calibrated,
      reference_points_changed: 0,
      scale_changed: 0,
    }
  }
  const names = ['x1', 'x2', 'y1', 'y2'] as const
  const referencePointsChanged = names.filter((name) => {
    const a = initial[name]
    const b = current[name]
    return (
      a.value !== b.value ||
      Math.hypot(a.xPx - b.xPx, a.yPx - b.yPx) > moveTolerancePx
    )
  }).length
  const scaleChanged =
    Number(initial.xIsLogScale !== current.xIsLogScale) +
    Number(initial.yIsLogScale !== current.yIsLogScale)
  return {
    initially_calibrated: true,
    finally_calibrated: current.calibrated,
    reference_points_changed: referencePointsChanged,
    scale_changed: scaleChanged,
  }
}
