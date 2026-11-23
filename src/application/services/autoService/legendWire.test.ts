import {
  buildLegendRequest,
  LEGEND_MAX_POINTS_PER_SERIES,
  LEGEND_MAX_SERIES,
  LEGEND_MAX_TOTAL_POINTS,
  parseLegendResponse,
  ServerExtractionSeries,
} from './autoServiceWire'
import { DigitizerError } from '@/application/errors'

// INFO: shaped after the wpd-auto backend (MIT): README "POST
// /api/v1/legend", legend_pass.py (no_legend, the 200 envelope) and the
// vendored real-chart-bench usecase/legend_reader.py (the `legend-reader/2`
// JSON: legend.source, entries, assignments, draft_order, …), with the
// labels of backend/tests/test_legend_pass.py's chart
const okAnswer = {
  status: 'ok',
  reason: null,
  legend: {
    schema: 'legend-reader/2',
    legend: {
      found: true,
      source: 'vlm',
      bbox: [130, 570, 330, 840],
      vlm_model: 'qwen3.5:9b',
    },
    entries: [
      { order: 0, text: '100 nm', shape: 'circle' },
      { order: 1, text: '200 nm', shape: 'square' },
    ],
    assignments: [
      {
        series_id: 's1',
        entry_order: 0,
        label: '100 nm',
        role: 'primary',
        confidence: 0.98,
        cost: 0.1,
        colour_distance: 3.2,
        shape_agrees: true,
      },
      {
        series_id: 's0',
        entry_order: 1,
        label: ' 200 nm ',
        role: 'primary',
        confidence: 0.41,
        cost: 0.9,
        colour_distance: 12.5,
        shape_agrees: null,
      },
      // odd ones: dropped
      { series_id: 's0', label: 'again', confidence: 0.9 },
      { series_id: 's2', label: '', confidence: 0.9 },
      { series_id: 's3', label: 'x', confidence: 'high' },
      'nonsense',
    ],
    unmatched_series: [],
    draft_order: ['s1', 's0', 7, 's1'],
    timing_s: { vlm: 4.9, ocr: 0.5, match: 0.05, total: 5.5 },
    warnings: [],
  },
  elapsed_ms: 5400,
  components: { legend: { id: 'rcb-legend/v2@4850d1f' } },
}

const series = (
  label: string | null,
  points: [number, number][],
): ServerExtractionSeries => ({
  label,
  legendLabel: null,
  score: null,
  points: points.map(([xPx, yPx]) => ({ xPx, yPx })),
})

describe('POST /legend: the request', () => {
  test('ids s0…, the kind, MarkerNet shape names, backend pixels', () => {
    const body = buildLegendRequest(
      'aGVsbG8=',
      [
        series('circle', [
          [10.5, 20.5],
          [30.5, 40.5],
        ]),
        series('line 2', [[1, 2]]),
        series(null, [[5, 5]]),
      ],
      'marker',
    )
    expect(body).toEqual({
      image: 'aGVsbG8=',
      series: [
        {
          id: 's0',
          kind: 'marker',
          shape: 'circle',
          points: [
            [10, 20],
            [30, 40],
          ],
        },
        // INFO: not a short word: the backend would refuse the whole request
        { id: 's1', kind: 'marker', points: [[0.5, 1.5]] },
        { id: 's2', kind: 'marker', points: [[4.5, 4.5]] },
      ],
    })
  })

  test('lines carry no shape', () => {
    const body = buildLegendRequest('x', [series('circle', [[1, 1]])], 'line')
    expect(body.series[0]).toEqual({
      id: 's0',
      kind: 'line',
      points: [[0.5, 0.5]],
    })
  })

  test('stays within the backend limits instead of being refused', () => {
    const long = Array.from(
      { length: LEGEND_MAX_POINTS_PER_SERIES + 500 },
      (_, i): [number, number] => [i, i],
    )
    const one = buildLegendRequest('x', [series(null, long)], 'line')
    const points = one.series[0].points
    expect(points).toHaveLength(LEGEND_MAX_POINTS_PER_SERIES)
    // INFO: evenly thinned, both ends kept
    expect(points[0]).toEqual([-0.5, -0.5])
    expect(points[points.length - 1]).toEqual([
      long.length - 1.5,
      long.length - 1.5,
    ])

    const many = Array.from({ length: LEGEND_MAX_SERIES + 5 }, () =>
      series(null, long),
    )
    const body = buildLegendRequest('x', many, 'line')
    expect(body.series).toHaveLength(LEGEND_MAX_SERIES)
    const total = body.series.reduce((n, s) => n + s.points.length, 0)
    expect(total).toBeLessThanOrEqual(LEGEND_MAX_TOTAL_POINTS)
    expect(body.series[LEGEND_MAX_SERIES - 1].id).toBe(
      `s${LEGEND_MAX_SERIES - 1}`,
    )
  })
})

describe('POST /legend: the answer', () => {
  test('names, confidences and the legend order', () => {
    expect(parseLegendResponse(okAnswer)).toEqual({
      status: 'ok',
      reason: null,
      source: 'vlm',
      assignments: [
        { seriesId: 's1', label: '100 nm', confidence: 0.98, role: 'primary' },
        { seriesId: 's0', label: '200 nm', confidence: 0.41, role: 'primary' },
      ],
      draftOrder: ['s1', 's0'],
      elapsedMs: 5400,
    })
  })

  test('no legend is a status, not an error', () => {
    expect(
      parseLegendResponse({
        status: 'vlm_unavailable',
        reason: 'the local VLM is not running',
        legend: null,
        elapsed_ms: 12,
        components: {},
      }),
    ).toEqual({
      status: 'vlm_unavailable',
      reason: 'the local VLM is not running',
      source: null,
      assignments: [],
      draftOrder: [],
      elapsedMs: 12,
    })
  })

  test('an answer without a status is an error', () => {
    expect(() => parseLegendResponse({ legend: null })).toThrow(DigitizerError)
    expect(() => parseLegendResponse('ok')).toThrow(DigitizerError)
  })
})
