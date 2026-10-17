import {
  AutoExtractionFormatError,
  parseAutoExtraction,
} from './autoExtractionParser'

const axes = {
  x: {
    scale: 'linear',
    ticks: [
      { px: 100, value: 0 },
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

const problemsOf = (json: unknown): string[] => {
  try {
    parseAutoExtraction(json)
  } catch (e) {
    expect(e).toBeInstanceOf(AutoExtractionFormatError)
    return (e as AutoExtractionFormatError).problems
  }
  throw new Error('expected parseAutoExtraction to throw')
}

describe('parseAutoExtraction', () => {
  test('parses a full document and normalizes it', () => {
    const parsed = parseAutoExtraction({
      format: 'starry-digitizer/auto-extraction',
      version: 1,
      image: { url: 'fig.png', width: 800, height: 600 },
      axes,
      series: [
        {
          label: 'x=0.1',
          points_px: [[150, 350]],
          points_value: [[2.5, 3.16]],
          scores: [0.9],
        },
      ],
      source: { extractor: 'markernet-v2', run: 'r1' },
      unknown_field: 'ignored',
    })
    expect(parsed.image).toEqual({ url: 'fig.png', width: 800, height: 600 })
    expect(parsed.axes?.y.scale).toBe('log')
    expect(parsed.series[0]).toEqual({
      label: 'x=0.1',
      pointsPx: [[150, 350]],
      pointsValue: [[2.5, 3.16]],
      scores: [0.9],
      marker: null,
    })
    expect(parsed.plotArea).toBeNull()
    expect(parsed.legendArea).toBeNull()
    expect(parsed.source).toEqual({ extractor: 'markernet-v2', run: 'r1' })
  })

  test('minimal document: pixels only, no axes, no image, default labels', () => {
    const parsed = parseAutoExtraction({
      version: 1,
      series: [{ points_px: [[1, 2]] }, { points_px: [] }],
    })
    expect(parsed.image).toEqual({ url: null, width: null, height: null })
    expect(parsed.axes).toBeNull()
    expect(parsed.source).toBeNull()
    expect(parsed.series.map((s) => s.label)).toEqual(['series 1', 'series 2'])
  })

  test('image may be a plain string; axis scale defaults to linear', () => {
    const parsed = parseAutoExtraction({
      version: 1,
      image: 'data:image/png;base64,xx',
      axes: { x: { ticks: axes.x.ticks }, y: axes.y },
      series: [{ points_value: [[1, 10]] }],
    })
    expect(parsed.image.url).toBe('data:image/png;base64,xx')
    expect(parsed.axes?.x.scale).toBe('linear')
  })

  test('rejects non-objects', () => {
    expect(problemsOf([])).toEqual(['document must be a JSON object'])
  })

  test('collects every problem instead of stopping at the first', () => {
    const problems = problemsOf({
      format: 'other',
      version: 2,
      image: 3,
      axes: { x: { scale: 'ln', ticks: [] } },
      series: [
        'nope',
        { label: 1, points_px: [[1]] },
        { points_value: 'x' },
        { scores: ['a'] },
      ],
      source: 'x',
    })
    expect(problems).toEqual([
      'format must be "starry-digitizer/auto-extraction" (got "other")',
      'version must be 1 (got 2)',
      'image must be a string, an object or null',
      'axes.x.scale must be "linear" or "log"',
      'axes.y is required when axes is given',
      'series[0] must be an object',
      'series[1].label must be a string',
      'series[1].points_px[0] must be [number, number]',
      'series[2].points_value must be an array of [x, y] or null',
      'series[3].scores must be an array of numbers',
      'source must be an object or null',
    ])
  })

  test.each([
    [{ x: { ticks: [{ px: 1, value: 1 }] }, y: axes.y }, 'at least 2 ticks'],
    [{ x: { ticks: [{ px: 1 }, { px: 2 }] }, y: axes.y }, 'axes.x.ticks[0]'],
    [
      {
        x: axes.x,
        y: {
          scale: 'log',
          ticks: [
            { px: 1, value: 0 },
            { px: 2, value: 1 },
          ],
        },
      },
      'positive on a log axis',
    ],
    [
      {
        x: {
          ticks: [
            { px: 1, value: 1 },
            { px: 2, value: 1 },
          ],
        },
        y: axes.y,
      },
      'distinct values',
    ],
    [
      {
        x: {
          ticks: [
            { px: 1, value: 1 },
            { px: 1, value: 2 },
          ],
        },
        y: axes.y,
      },
      'distinct px',
    ],
    ['x', 'axes must be an object'],
  ])('rejects bad axes (%#)', (badAxes, message) => {
    const problems = problemsOf({ version: 1, axes: badAxes, series: [] })
    expect(problems.join('\n')).toContain(message)
  })

  test.each([
    [{}, 'needs points_px or points_value'],
    [{ points_value: [[1, 2]] }, 'needs axes'],
    [
      { points_px: [[1, 2]], points_value: [] },
      'points_px and points_value differ in length',
    ],
    [{ points_px: [[1, 2]], scores: [] }, 'scores length differs'],
    [{ points_px: [[1, Infinity]] }, 'points_px[0] must be [number, number]'],
  ])('rejects bad series (%#)', (series, message) => {
    const problems = problemsOf({ version: 1, series: [series] })
    expect(problems.join('\n')).toContain(message)
  })

  test('rejects bad image fields and a missing series list', () => {
    const problems = problemsOf({ version: 1, image: { url: 1, width: -1 } })
    expect(problems).toEqual([
      'image.url must be a string',
      'image.width must be a positive number',
      'series must be an array',
    ])
  })

  test('plot/legend areas and markers', () => {
    const parsed = parseAutoExtraction({
      version: 1,
      plot_area: { x: 10, y: 20, width: 300, height: 200 },
      legend_area: null,
      series: [
        {
          points_px: [],
          marker: { shape: 'triangle-up', fill: 'open', size_px: 12 },
        },
        { points_px: [], marker: { shape: null } },
      ],
    })
    expect(parsed.plotArea).toEqual({
      xPx: 10,
      yPx: 20,
      widthPx: 300,
      heightPx: 200,
    })
    expect(parsed.series[0].marker).toEqual({
      shape: 'triangle-up',
      fill: 'open',
      sizePx: 12,
    })
    expect(parsed.series[1].marker).toEqual({})
  })

  test('rejects bad areas and markers', () => {
    const problems = problemsOf({
      version: 1,
      plot_area: { x: 0, y: 0, width: 0, height: 1 },
      legend_area: 'x',
      series: [
        { points_px: [], marker: { shape: 'blob', fill: 'gradient', size_px: -1 } },
        { points_px: [], marker: 3 },
      ],
    })
    expect(problems).toEqual([
      expect.stringContaining('series[0].marker.shape must be one of circle'),
      expect.stringContaining('series[0].marker.fill must be one of filled'),
      'series[0].marker.size_px must be a positive number',
      'series[1].marker must be an object or null',
      'plot_area must be {"x", "y", "width" > 0, "height" > 0} (pixels) or null',
      'legend_area must be {"x", "y", "width" > 0, "height" > 0} (pixels) or null',
    ])
  })
})
