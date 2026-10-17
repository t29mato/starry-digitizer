import { fitAxisTicks } from './axisTickFitter'

describe('fitAxisTicks', () => {
  test('two ticks on a linear axis fit exactly', () => {
    const fit = fitAxisTicks(
      [
        { px: 100, value: 0 },
        { px: 300, value: 10 },
      ],
      'linear',
    )
    expect(fit.slope).toBeCloseTo(20)
    expect(fit.intercept).toBeCloseTo(100)
    expect(fit.rmsResidualPx).toBeCloseTo(0)
    expect(fit.reference.low).toEqual({ value: 0, px: 100 })
    expect(fit.reference.high.px).toBeCloseTo(300)
  })

  test('3+ ticks are fit by least squares and residuals are reported', () => {
    // INFO: the middle tick is 3px off the line through the outer two
    const fit = fitAxisTicks(
      [
        { px: 100, value: 0 },
        { px: 203, value: 5 },
        { px: 300, value: 10 },
      ],
      'linear',
    )
    const residuals = fit.residuals.map((r) => r.residualPx)
    expect(residuals[0]).toBeCloseTo(1)
    expect(residuals[1]).toBeCloseTo(-2)
    expect(residuals[2]).toBeCloseTo(1)
    expect(fit.maxAbsResidualPx).toBeCloseTo(2)
    expect(fit.rmsResidualPx).toBeCloseTo(Math.sqrt(2))
  })

  test('log axes fit in log10 space and pick min/max values as reference', () => {
    // INFO: y axis: pixel y grows downward while values grow upward
    const fit = fitAxisTicks(
      [
        { px: 400, value: 1 },
        { px: 300, value: 10 },
        { px: 200, value: 100 },
      ],
      'log',
    )
    expect(fit.rmsResidualPx).toBeCloseTo(0)
    expect(fit.reference.low).toEqual({ value: 1, px: 400 })
    expect(fit.reference.high.value).toBe(100)
    expect(fit.reference.high.px).toBeCloseTo(200)
  })

  test.each([
    [[{ px: 1, value: 1 }], 'linear', 'at least 2'],
    [
      [
        { px: 1, value: 1 },
        { px: 2, value: 1 },
      ],
      'linear',
      'distinct values',
    ],
    [
      [
        { px: 1, value: 1 },
        { px: 1, value: 2 },
      ],
      'linear',
      'distinct pixel',
    ],
    [
      [
        { px: 1, value: 0 },
        { px: 2, value: 10 },
      ],
      'log',
      'positive',
    ],
    [
      [
        { px: NaN, value: 0 },
        { px: 2, value: 10 },
      ],
      'linear',
      'finite',
    ],
  ] as const)('rejects invalid ticks (%#)', (ticks, scale, message) => {
    expect(() => fitAxisTicks([...ticks], scale)).toThrow(message)
  })
})
