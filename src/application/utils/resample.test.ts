import {
  CalPoint,
  douglasPeucker,
  everyKth,
  interpolateLinear,
  movingAverage,
  parseValueList,
  planResample,
  prepareSeries,
  thinEvenly,
  ValueAxis,
} from './resample'

const metric = { pxPerU: 1, pxPerV: 1 }
const linearAxis: ValueAxis = {
  valueToU: (x) => x,
  uToValue: (u) => u,
  logX: false,
}
const logAxis: ValueAxis = {
  valueToU: (x) => (x > 0 ? Math.log10(x) : NaN),
  uToValue: (u) => Math.pow(10, u),
  logX: true,
}

function line(n: number): CalPoint[] {
  return Array.from({ length: n }, (_, i) => ({ u: i, v: 2 * i }))
}

describe('thinEvenly', () => {
  test('keeps both ends and exactly N strictly increasing indices', () => {
    const indices = thinEvenly(line(101), 20, metric)
    expect(indices).toHaveLength(20)
    expect(indices[0]).toBe(0)
    expect(indices[19]).toBe(100)
    indices.slice(1).forEach((index, i) => {
      expect(index).toBeGreaterThan(indices[i])
    })
  })

  test('spreads by arc length, not by index', () => {
    // 10 points crowded in [0,1], then 1 point far away at 100
    const points = [
      ...Array.from({ length: 10 }, (_, i) => ({ u: i / 10, v: 0 })),
      { u: 100, v: 0 },
    ]
    expect(thinEvenly(points, 3, metric)).toEqual([0, 9, 10])
  })

  test('N >= count keeps everything; zero-length curve still gives N', () => {
    expect(thinEvenly(line(5), 9, metric)).toEqual([0, 1, 2, 3, 4])
    const same = Array.from({ length: 7 }, () => ({ u: 1, v: 1 }))
    expect(thinEvenly(same, 3, metric)).toEqual([0, 3, 6])
  })
})

describe('everyKth', () => {
  test('keeps 0, k, 2k and the last', () => {
    expect(everyKth(10, 4)).toEqual([0, 4, 8, 9])
    expect(everyKth(9, 4)).toEqual([0, 4, 8])
    expect(everyKth(3, 1)).toEqual([0, 1, 2])
  })
})

describe('douglasPeucker', () => {
  test('a straight line collapses to its ends', () => {
    expect(douglasPeucker(line(50), 0.5, metric)).toEqual([0, 49])
  })

  test('keeps a corner beyond the tolerance and drops one within it', () => {
    const corner = [
      { u: 0, v: 0 },
      { u: 5, v: 0 },
      { u: 10, v: 0 },
      { u: 10, v: 5 },
      { u: 10, v: 10 },
    ]
    expect(douglasPeucker(corner, 1, metric)).toEqual([0, 2, 4])
    const bump = [
      { u: 0, v: 0 },
      { u: 5, v: 0.4 },
      { u: 10, v: 0 },
    ]
    expect(douglasPeucker(bump, 0.5, metric)).toEqual([0, 2])
    expect(douglasPeucker(bump, 0.3, metric)).toEqual([0, 1, 2])
  })

  test('tolerance is measured in screen pixels through the metric', () => {
    const bump = [
      { u: 0, v: 0 },
      { u: 5, v: 0.4 },
      { u: 10, v: 0 },
    ]
    // 0.4 units × 10 px/unit = 4 px > 1 px
    expect(douglasPeucker(bump, 1, { pxPerU: 1, pxPerV: 10 })).toEqual([
      0, 1, 2,
    ])
  })

  test('handles 200k points without recursion', () => {
    const many = Array.from({ length: 200000 }, (_, i) => ({
      u: i,
      v: Math.sin(i / 1000) * 100,
    }))
    const kept = douglasPeucker(many, 1, metric)
    expect(kept[0]).toBe(0)
    expect(kept[kept.length - 1]).toBe(199999)
    expect(kept.length).toBeLessThan(2000)
  })
})

describe('movingAverage', () => {
  test('keeps a line and the end values, reduces noise', () => {
    const values = [0, 1, 2, 3, 4, 5, 6]
    expect(movingAverage(values, 5)).toEqual(values)
    const noisy = [0, 10, 0, 10, 0, 10, 0]
    const smooth = movingAverage(noisy, 3)
    expect(smooth[0]).toBe(0)
    expect(smooth[6]).toBe(0)
    expect(
      Math.max(...smooth.slice(1, -1)) - Math.min(...smooth.slice(1, -1)),
    ).toBeLessThan(4)
  })
})

describe('series helpers', () => {
  test('prepareSeries sorts, averages equal x and drops non-finite', () => {
    expect(
      prepareSeries([
        { u: 2, v: 4 },
        { u: 1, v: 1 },
        { u: 2, v: 6 },
        { u: NaN, v: 0 },
      ]),
    ).toEqual([
      { u: 1, v: 1 },
      { u: 2, v: 5 },
    ])
  })

  test('interpolateLinear never extrapolates', () => {
    const series = [
      { u: 0, v: 0 },
      { u: 10, v: 100 },
    ]
    expect(interpolateLinear(series, 2.5)).toBe(25)
    expect(interpolateLinear(series, 10)).toBe(100)
    expect(interpolateLinear(series, 10.1)).toBeNaN()
    expect(interpolateLinear(series, -1)).toBeNaN()
  })

  test('parseValueList accepts commas/spaces/semicolons and names a bad token', () => {
    expect(parseValueList('1, 2.5 1e3;4')).toEqual({
      values: [1, 2.5, 1000, 4],
    })
    expect(parseValueList('1, abc')).toEqual({ error: 'Not a number: "abc"' })
  })
})

describe('planResample', () => {
  test('thin returns the existing points with their source index', () => {
    const plan = planResample(
      line(11),
      { mode: 'thin', count: 3 },
      metric,
      linearAxis,
    )
    expect(plan.error).toBeUndefined()
    expect(plan.points.map((p) => p.source)).toEqual([0, 5, 10])
  })

  test('sortByX reorders before thinning', () => {
    const shuffled = [
      { u: 3, v: 0 },
      { u: 0, v: 0 },
      { u: 2, v: 0 },
      { u: 1, v: 0 },
    ]
    const plan = planResample(
      shuffled,
      { mode: 'every', k: 1, sortByX: true },
      metric,
      linearAxis,
    )
    expect(plan.points.map((p) => p.u)).toEqual([0, 1, 2, 3])
  })

  test('atX on a log axis: a power law on log-log axes is exact', () => {
    // y = 3 x^2  →  v = log10 3 + 2u, sampled at x = 1, 10, 100, 1000
    const input = [1, 10, 100, 1000].map((x) => ({
      u: Math.log10(x),
      v: Math.log10(3 * x * x),
    }))
    const plan = planResample(
      input,
      { mode: 'atX', xSpec: 'list', xList: '2, 50, 999' },
      metric,
      logAxis,
    )
    expect(plan.error).toBeUndefined()
    plan.points.forEach((p) => {
      const x = Math.pow(10, p.u)
      expect(Math.pow(10, p.v)).toBeCloseTo(3 * x * x, 6)
    })
    expect(plan.points.map((p) => Math.pow(10, p.u))).toEqual([
      expect.closeTo(2, 9),
      expect.closeTo(50, 9),
      expect.closeTo(999, 9),
    ])
  })

  test('atX count on a log axis spaces x evenly in log, ends included', () => {
    const input = [1, 1000].map((x) => ({ u: Math.log10(x), v: 0 }))
    const plan = planResample(
      input,
      { mode: 'atX', xSpec: 'count', count: 4 },
      metric,
      logAxis,
    )
    expect(plan.points.map((p) => Math.pow(10, p.u))).toEqual([
      expect.closeTo(1, 9),
      expect.closeTo(10, 9),
      expect.closeTo(100, 9),
      expect.closeTo(1000, 9),
    ])
    expect(plan.notes).toContain(
      'x values are evenly spaced in log (log X axis)',
    )
  })

  test('atX skips values outside the data with a note and refuses ≤ 0 on log', () => {
    const plan = planResample(
      line(11),
      { mode: 'atX', xSpec: 'list', xList: '-1 5 20' },
      metric,
      linearAxis,
    )
    expect(plan.points).toEqual([{ u: 5, v: 10 }])
    expect(plan.notes).toContain(
      '2 x value(s) outside the data range were skipped',
    )

    const refused = planResample(
      [
        { u: 0, v: 0 },
        { u: 1, v: 1 },
      ],
      { mode: 'atX', xSpec: 'list', xList: '0' },
      metric,
      logAxis,
    )
    expect(refused.error).toBe('x values must be > 0 on a log X axis')
  })

  test('atX with From/To in data units', () => {
    const plan = planResample(
      line(11),
      { mode: 'atX', xSpec: 'count', count: 3, xFrom: 2, xTo: 4 },
      metric,
      linearAxis,
    )
    expect(plan.points).toEqual([
      { u: 2, v: 4 },
      { u: 3, v: 6 },
      { u: 4, v: 8 },
    ])
  })

  test('smooth keeps the count and the ends; refuses an even window', () => {
    const noisy = [0, 5, 0, 5, 0, 5, 0].map((v, u) => ({ u, v }))
    const plan = planResample(
      noisy,
      { mode: 'smooth', smoothWindow: 3 },
      metric,
      linearAxis,
    )
    expect(plan.points).toHaveLength(7)
    expect(plan.points[0]).toMatchObject({ u: 0, v: 0, source: 0 })
    expect(plan.points[6]).toMatchObject({ u: 6, v: 0, source: 6 })
    expect(
      planResample(
        noisy,
        { mode: 'smooth', smoothWindow: 4 },
        metric,
        linearAxis,
      ).error,
    ).toBe('Smoothing window must be odd (3, 5, 7, …)')
    expect(
      planResample(noisy, { mode: 'smooth' }, metric, linearAxis).error,
    ).toBe('Set a smoothing window of 3 or more')
  })

  test('refuses bad parameters and too few points', () => {
    expect(
      planResample(line(5), { mode: 'thin', count: 1 }, metric, linearAxis)
        .error,
    ).toBe('Number of points must be a whole number ≥ 2')
    expect(
      planResample(line(5), { mode: 'every', k: 0 }, metric, linearAxis).error,
    ).toBe('k must be a whole number ≥ 1')
    expect(
      planResample(
        line(5),
        { mode: 'simplify', tolerancePx: -1 },
        metric,
        linearAxis,
      ).error,
    ).toBe('Tolerance must be a number ≥ 0 (px)')
    expect(
      planResample(line(1), { mode: 'every', k: 1 }, metric, linearAxis).error,
    ).toBe('Needs at least 2 points')
    expect(
      planResample(
        line(5),
        { mode: 'atX', xSpec: 'count', count: 20000 },
        metric,
        linearAxis,
      ).error,
    ).toBe('At most 10000 x values')
  })
})
