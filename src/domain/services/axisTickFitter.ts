// INFO: Least-squares calibration of one axis from 2+ ticks, for the
// auto-extraction import (docs/design/auto-extraction-review-design.md).
// The fit is a straight line px = intercept + slope * t, where t is the tick
// value (linear axis) or log10 of it (log axis). The result is then reduced
// to the two reference points (x1/x2 or y1/y2) the existing AxisSet /
// AxisSetCalculator already understand, so the calculator itself is unchanged.

export type AxisScale = 'linear' | 'log'

export type AxisTick = {
  px: number
  value: number
}

export type AxisTickResidual = AxisTick & {
  fittedPx: number
  // INFO: fittedPx - px
  residualPx: number
}

export type AxisFit = {
  scale: AxisScale
  slope: number
  intercept: number
  residuals: AxisTickResidual[]
  rmsResidualPx: number
  maxAbsResidualPx: number
  // INFO: the two reference points to place as x1/x2 (or y1/y2): the
  // smallest and the largest tick value, at their *fitted* pixel positions
  reference: { low: AxisTick; high: AxisTick }
}

export function fitAxisTicks(ticks: AxisTick[], scale: AxisScale): AxisFit {
  if (ticks.length < 2) {
    throw new Error('at least 2 ticks are required')
  }
  ticks.forEach((tick) => {
    if (!Number.isFinite(tick.px) || !Number.isFinite(tick.value)) {
      throw new Error('tick px and value must be finite numbers')
    }
    if (scale === 'log' && tick.value <= 0) {
      throw new Error(`tick value ${tick.value} must be positive on a log axis`)
    }
  })

  const toT = (value: number) => (scale === 'log' ? Math.log10(value) : value)
  const ts = ticks.map((tick) => toT(tick.value))
  const pxs = ticks.map((tick) => tick.px)
  const n = ticks.length
  const meanT = ts.reduce((a, b) => a + b, 0) / n
  const meanPx = pxs.reduce((a, b) => a + b, 0) / n
  let sTT = 0
  let sTP = 0
  for (let i = 0; i < n; i++) {
    sTT += (ts[i] - meanT) ** 2
    sTP += (ts[i] - meanT) * (pxs[i] - meanPx)
  }
  if (sTT === 0) {
    throw new Error('ticks must have at least 2 distinct values')
  }
  const slope = sTP / sTT
  if (slope === 0) {
    throw new Error('ticks must have at least 2 distinct pixel positions')
  }
  const intercept = meanPx - slope * meanT
  const fitPx = (value: number) => intercept + slope * toT(value)

  const residuals = ticks.map((tick) => {
    const fittedPx = fitPx(tick.value)
    return { ...tick, fittedPx, residualPx: fittedPx - tick.px }
  })
  const rmsResidualPx = Math.sqrt(
    residuals.reduce((sum, r) => sum + r.residualPx ** 2, 0) / n,
  )
  const maxAbsResidualPx = Math.max(
    ...residuals.map((r) => Math.abs(r.residualPx)),
  )

  const values = ticks.map((tick) => tick.value)
  const lowValue = Math.min(...values)
  const highValue = Math.max(...values)

  return {
    scale,
    slope,
    intercept,
    residuals,
    rmsResidualPx,
    maxAbsResidualPx,
    reference: {
      low: { value: lowValue, px: fitPx(lowValue) },
      high: { value: highValue, px: fitPx(highValue) },
    },
  }
}
