import {
  axisSetIsCalibrated,
  buildFinalDocument,
  buildImportPlan,
  captureReviewState,
} from './autoExtractionImport'
import { parseAutoExtraction } from './autoExtractionParser'

const axes = {
  x: {
    scale: 'linear',
    ticks: [
      { px: 100, value: 0 },
      { px: 200, value: 5 },
      { px: 300, value: 10 },
    ],
  },
  y: {
    scale: 'log',
    ticks: [
      { px: 400, value: 1 },
      { px: 200, value: 100 },
    ],
  },
}

const plan = (doc: object, size = { width: 500, height: 500 }) =>
  buildImportPlan(parseAutoExtraction({ version: 1, ...doc }), size)

describe('buildImportPlan', () => {
  test('pixels only: uncalibrated axis set, one dataset per series', () => {
    const result = plan({
      series: [
        { label: 'A', points_px: [[10, 20], [30, 40]], scores: [0.9, 0.2] },
        { points_px: [] },
      ],
    })
    expect(axisSetIsCalibrated(result.axisSet)).toBe(false)
    expect(result.calibration).toBeNull()
    expect(result.warnings).toEqual([])
    expect(result.datasets.map((d) => d.name)).toEqual(['A', 'series 2'])
    expect(result.datasets[0].points).toEqual([
      { id: 1, xPx: 10, yPx: 20, origin: { series: 0, index: 0 }, score: 0.9 },
      { id: 2, xPx: 30, yPx: 40, origin: { series: 0, index: 1 }, score: 0.2 },
    ])
    expect(result.datasets[0].visiblePointIds).toEqual([1, 2])
    expect(result.datasets[1].id).toBe(2)
    expect(result.initialState.series[0].points).toHaveLength(2)
    expect(result.initialState.axes.calibrated).toBe(false)
  })

  test('axes: reference points at the fitted min/max ticks', () => {
    const result = plan({ axes, series: [] })
    const axisSet = result.axisSet
    expect(axisSetIsCalibrated(axisSet)).toBe(true)
    expect(axisSet.x1.value).toBe(0)
    expect(axisSet.x1.coord.xPx).toBeCloseTo(100)
    expect(axisSet.x2.value).toBe(10)
    expect(axisSet.x2.coord.xPx).toBeCloseTo(300)
    expect(axisSet.y1.coord.yPx).toBeCloseTo(400)
    expect(axisSet.y2.coord.yPx).toBeCloseTo(200)
    // INFO: markers sit at the corner of the lowest ticks
    expect(axisSet.x1.coord.yPx).toBeCloseTo(400)
    expect(axisSet.y1.coord.xPx).toBeCloseTo(100)
    expect(axisSet.xIsLogScale).toBe(false)
    expect(axisSet.yIsLogScale).toBe(true)
    expect(result.calibration?.x.residuals).toHaveLength(3)
    expect(result.calibration?.y.scale).toBe('log')
  })

  test('values only are placed through the fitted axes', () => {
    const result = plan({
      axes,
      series: [{ points_value: [[5, 10]] }],
    })
    const point = result.datasets[0].points[0]
    expect(point.xPx).toBeCloseTo(200)
    expect(point.yPx).toBeCloseTo(300)
  })

  test('points_px wins when both are given', () => {
    const result = plan({
      axes,
      series: [{ points_px: [[1, 2]], points_value: [[5, 10]] }],
    })
    expect(result.datasets[0].points[0]).toMatchObject({ xPx: 1, yPx: 2 })
  })

  test('a value that cannot be placed (log axis, value <= 0) is an error', () => {
    expect(() =>
      plan({ axes, series: [{ points_value: [[5, 0]] }] }),
    ).toThrow('series[0].points_value[0] cannot be placed')
  })

  test('warns about bad tick fits, out-of-image points and size mismatch', () => {
    const result = plan(
      {
        image: { width: 640, height: 480 },
        axes: {
          ...axes,
          x: {
            scale: 'linear',
            ticks: [
              { px: 100, value: 0 },
              { px: 210, value: 5 },
              { px: 300, value: 10 },
            ],
          },
        },
        series: [{ points_px: [[-1, 5], [600, 5], [5, 5]] }],
      },
      { width: 500, height: 500 },
    )
    expect(result.warnings).toEqual([
      'image size in the document (640x480) differs from the loaded image (500x500); pixel coordinates may be off',
      'x axis ticks fit with a max residual of 6.67px; check the tick values',
      '2 point(s) lie outside the image',
    ])
  })

  test('without a known image size nothing is checked against it', () => {
    const result = buildImportPlan(
      parseAutoExtraction({
        version: 1,
        image: { width: 1 },
        series: [{ points_px: [[-5, -5]] }],
      }),
      null,
    )
    expect(result.warnings).toEqual([])
  })
})

describe('buildFinalDocument', () => {
  test('round-trips through the import format', () => {
    const imported = plan({
      axes,
      series: [
        { label: 'A', points_px: [[200, 300]], scores: [0.7] },
        { label: 'B', points_px: [] },
      ],
      source: { extractor: 'x' },
    })
    imported.datasets[0].addPoint(100, 400)

    const final = buildFinalDocument(
      [imported.axisSet],
      imported.datasets,
      { width: 500, height: 500 },
      { extractor: 'x' },
    )
    expect(final.source).toEqual({
      tool: 'starry-digitizer',
      based_on: { extractor: 'x' },
    })
    expect(final.image).toEqual({ width: 500, height: 500 })
    // INFO: the empty dataset is dropped
    expect(final.series).toHaveLength(1)
    const series = final.series[0]
    expect(series.points_px).toEqual([
      [200, 300],
      [100, 400],
    ])
    expect(series.points_value?.[0][0]).toBeCloseTo(5)
    expect(series.points_value?.[0][1]).toBeCloseTo(10)
    expect(series.points_value?.[1][0]).toBeCloseTo(0)
    expect(series.points_value?.[1][1]).toBeCloseTo(1)
    // INFO: the added point has no score, so scores are dropped as a whole
    expect(series.scores).toBeNull()
    expect(series.origins).toEqual([[0, 0], null])

    const reparsed = parseAutoExtraction(JSON.parse(JSON.stringify(final)))
    expect(reparsed.axes?.x.ticks).toHaveLength(2)
    expect(reparsed.series[0].pointsPx).toEqual(series.points_px)
  })

  test('uncalibrated: no axes and no values; keeps scores when complete', () => {
    const imported = plan({ series: [{ points_px: [[1, 1]], scores: [0.5] }] })
    const final = buildFinalDocument(
      [imported.axisSet],
      imported.datasets,
      null,
      null,
    )
    expect(final.axes).toBeNull()
    expect(final.image).toBeNull()
    expect(final.series[0].points_value).toBeNull()
    expect(final.series[0].scores).toEqual([0.5])
  })
})

describe('captureReviewState', () => {
  test('copies points so later edits do not leak into the capture', () => {
    const imported = plan({ series: [{ points_px: [[1, 1]] }] })
    const captured = captureReviewState([imported.axisSet], imported.datasets)
    imported.datasets[0].points[0].xPx = 50
    expect(captured.series[0].points[0].xPx).toBe(1)
  })
})
