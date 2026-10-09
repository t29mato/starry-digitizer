import { Point } from '@/@types/types'
import { ReviewAxesState, ReviewState } from './editLogDiff'
import { buildReviewDiffOverlay } from './reviewDiffOverlay'

const axes = (x2 = 300, calibrated = true): ReviewAxesState => ({
  calibrated,
  x1: { xPx: 100, yPx: 400, value: 0 },
  x2: { xPx: x2, yPx: 400, value: 10 },
  y1: { xPx: 100, yPx: 400, value: 0 },
  y2: { xPx: 100, yPx: 200, value: 10 },
  xIsLogScale: false,
  yIsLogScale: false,
})

const p = (series: number, index: number, xPx: number, yPx: number): Point => ({
  id: index + 1,
  xPx,
  yPx,
  origin: { series, index },
})

const initial: ReviewState = {
  axes: axes(),
  series: [
    { label: 'A', points: [p(0, 0, 10, 10), p(0, 1, 20, 20), p(0, 2, 30, 30)] },
    { label: 'B', points: [p(1, 0, 50, 50), p(1, 1, 60, 60)] },
  ],
}

describe('buildReviewDiffOverlay', () => {
  test('no change: empty overlay but the initial series for the hold view', () => {
    const overlay = buildReviewDiffOverlay(initial, initial, 0.5)
    expect(overlay.moved).toEqual([])
    expect(overlay.deleted).toEqual([])
    expect(overlay.added).toEqual([])
    expect(overlay.reassigned).toEqual([])
    expect(overlay.axes).toEqual([])
    expect(overlay.initialSeries).toEqual([
      {
        label: 'A',
        points: [
          { xPx: 10, yPx: 10 },
          { xPx: 20, yPx: 20 },
          { xPx: 30, yPx: 30 },
        ],
      },
      {
        label: 'B',
        points: [
          { xPx: 50, yPx: 50 },
          { xPx: 60, yPx: 60 },
        ],
      },
    ])
  })

  test('moved / deleted (incl. by threshold) / added / reassigned / axes', () => {
    const current: ReviewState = {
      axes: axes(305),
      series: [
        {
          label: 'A',
          points: [p(0, 0, 13, 14), p(1, 1, 60, 60), { id: 9, xPx: 5, yPx: 5 }],
          scoreRemovedPoints: [p(0, 2, 30, 30)],
        },
        { label: 'B', points: [p(1, 0, 50, 50)] },
      ],
    }
    const overlay = buildReviewDiffOverlay(initial, current, 0.5)
    expect(overlay.moved).toEqual([
      { from: { xPx: 10, yPx: 10 }, to: { xPx: 13, yPx: 14 } },
    ])
    expect(overlay.deleted).toEqual([
      { at: { xPx: 20, yPx: 20 }, byThreshold: false },
      { at: { xPx: 30, yPx: 30 }, byThreshold: true },
    ])
    expect(overlay.added).toEqual([{ at: { xPx: 5, yPx: 5 } }])
    // INFO: B's points are split 1:1 between A and B; the tie goes to the
    // earlier dataset (A), so the one still in B counts as reassigned
    expect(overlay.reassigned).toEqual([{ at: { xPx: 50, yPx: 50 } }])
    expect(overlay.axes).toEqual([
      { name: 'x2', from: { xPx: 300, yPx: 400 }, to: { xPx: 305, yPx: 400 } },
    ])
  })

  test('imported without axes: axis changes are not drawn', () => {
    const uncalibrated = { ...initial, axes: axes(300, false) }
    const current = { ...initial, axes: axes(400) }
    expect(buildReviewDiffOverlay(uncalibrated, current, 0.5).axes).toEqual([])
  })
})
