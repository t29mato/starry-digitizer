import { Point } from '@/@types/types'
import { diffReviewState, ReviewAxesState, ReviewState } from './editLogDiff'

const axes = (overrides: Partial<ReviewAxesState> = {}): ReviewAxesState => ({
  calibrated: true,
  x1: { xPx: 100, yPx: 400, value: 0 },
  x2: { xPx: 300, yPx: 400, value: 10 },
  y1: { xPx: 100, yPx: 400, value: 1 },
  y2: { xPx: 100, yPx: 200, value: 100 },
  xIsLogScale: false,
  yIsLogScale: true,
  ...overrides,
})

const p = (
  series: number,
  index: number,
  xPx: number,
  yPx: number,
  score?: number,
): Point => ({ id: index + 1, xPx, yPx, origin: { series, index }, score })

const initial: ReviewState = {
  axes: axes(),
  series: [
    { label: 'A', points: [p(0, 0, 10, 10, 0.9), p(0, 1, 20, 20, 0.8)] },
    { label: 'B', points: [p(1, 0, 30, 30), p(1, 1, 40, 40)] },
  ],
}

describe('diffReviewState', () => {
  test('no edits: everything kept', () => {
    const { summary, details } = diffReviewState(initial, initial, 0.5)
    expect(summary.points).toEqual({
      initial: 4,
      final: 4,
      kept: 4,
      moved: 0,
      deleted: 0,
      deleted_by_threshold: 0,
      added: 0,
      reassigned: 0,
    })
    expect(summary.series).toEqual({
      initial: 2,
      final: 2,
      split: 0,
      merged: 0,
      added: 0,
      removed: 0,
      renamed: 0,
    })
    expect(summary.axes).toEqual({
      initially_calibrated: true,
      finally_calibrated: true,
      reference_points_changed: 0,
      scale_changed: 0,
    })
    expect(details.series_mapping[0]).toEqual({
      series: 0,
      label: 'A',
      destinations: [{ dataset: 'A', points: 2 }],
    })
  })

  test('moved / deleted / added points, with the move tolerance', () => {
    const current: ReviewState = {
      axes: axes(),
      series: [
        {
          label: 'A',
          // INFO: index 0 moved 0.3px (under tolerance), index 1 deleted,
          // one point added by hand
          points: [p(0, 0, 10.3, 10), { id: 3, xPx: 50, yPx: 50 }],
        },
        { label: 'B', points: [p(1, 0, 33, 34), p(1, 1, 40, 40)] },
      ],
    }
    const { summary, details } = diffReviewState(initial, current, 0.5)
    expect(summary.points).toMatchObject({
      kept: 2,
      moved: 1,
      deleted: 1,
      added: 1,
      final: 4,
    })
    expect(details.moved).toEqual([
      { series: 1, index: 0, dx: 3, dy: 4, distance: 5 },
    ])
    expect(details.deleted).toEqual([
      { series: 0, index: 1, px: [20, 20], score: 0.8, by_threshold: false },
    ])
    expect(details.added).toEqual([{ dataset: 'A', px: [50, 50] }])
  })

  test('merging two series into one dataset', () => {
    const current: ReviewState = {
      axes: axes(),
      series: [
        { label: 'A', points: [...initial.series[0].points, ...initial.series[1].points] },
        { label: 'B', points: [] },
      ],
    }
    const { summary } = diffReviewState(initial, current, 0.5)
    expect(summary.series).toMatchObject({
      merged: 1,
      split: 0,
      // INFO: B's primary destination is now dataset "A"
      renamed: 1,
      final: 1,
    })
    expect(summary.points.reassigned).toBe(0)
  })

  test('splitting a series, adding a new series, removing a series', () => {
    const current: ReviewState = {
      axes: axes(),
      series: [
        { label: 'A', points: [p(0, 0, 10, 10)] },
        { label: 'A2', points: [p(0, 1, 20, 20)] },
        { label: 'C', points: [{ id: 1, xPx: 5, yPx: 5 }] },
        { label: 'empty', points: [] },
      ],
    }
    const { summary, details } = diffReviewState(initial, current, 0.5)
    expect(summary.series).toMatchObject({
      split: 1,
      merged: 0,
      added: 1,
      removed: 1,
      renamed: 0,
      final: 3,
    })
    expect(summary.points.reassigned).toBe(1)
    expect(details.reassigned).toEqual([
      { series: 0, index: 1, dataset: 'A2', px: [20, 20] },
    ])
    expect(summary.points.deleted).toBe(2)
    expect(details.series_mapping[1].destinations).toEqual([])
  })

  test('the primary destination is the one holding most points', () => {
    const big: ReviewState = {
      axes: axes(),
      series: [
        { label: 'A', points: [p(0, 0, 1, 1), p(0, 1, 2, 2), p(0, 2, 3, 3)] },
      ],
    }
    const current: ReviewState = {
      axes: axes(),
      series: [
        { label: 'X', points: [p(0, 0, 1, 1)] },
        { label: 'A', points: [p(0, 1, 2, 2), p(0, 2, 3, 3)] },
      ],
    }
    const { summary, details } = diffReviewState(big, current, 0.5)
    expect(details.series_mapping[0].destinations[0]).toEqual({
      dataset: 'A',
      points: 2,
    })
    expect(summary.points.reassigned).toBe(1)
    expect(summary.series.renamed).toBe(0)
  })

  test('axis edits: moved reference point, changed value, changed scale', () => {
    const current: ReviewState = {
      series: initial.series,
      axes: axes({
        x2: { xPx: 302, yPx: 400, value: 10 },
        y2: { xPx: 100, yPx: 200, value: 1000 },
        xIsLogScale: true,
      }),
    }
    expect(diffReviewState(initial, current, 0.5).summary.axes).toEqual({
      initially_calibrated: true,
      finally_calibrated: true,
      reference_points_changed: 2,
      scale_changed: 1,
    })
  })

  test('import without axes: only reports whether the human calibrated', () => {
    const uncalibrated = { ...initial, axes: axes({ calibrated: false }) }
    const current = { ...initial, axes: axes({ xIsLogScale: true }) }
    expect(diffReviewState(uncalibrated, current, 0.5).summary.axes).toEqual({
      initially_calibrated: false,
      finally_calibrated: true,
      reference_points_changed: 0,
      scale_changed: 0,
    })
  })

  test('points removed with the confidence threshold are flagged', () => {
    const current: ReviewState = {
      axes: axes(),
      series: [
        {
          label: 'A',
          points: [p(0, 0, 10, 10, 0.9)],
          scoreRemovedPoints: [p(0, 1, 20, 20, 0.8)],
        },
        { label: 'B', points: [p(1, 0, 30, 30)] },
      ],
    }
    const { summary, details } = diffReviewState(initial, current, 0.5)
    expect(summary.points).toMatchObject({ deleted: 2, deleted_by_threshold: 1 })
    expect(details.deleted.map((d) => d.by_threshold)).toEqual([true, false])
  })
})
