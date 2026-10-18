import {
  applyResample,
  previewResample,
  RESAMPLE_ACTION,
} from './resampleOperations'
import { calibratedSpaceOf } from './calibratedSpace'
import { calculatePhysicalValue } from './datasetValues'
import {
  createDigitizerContext,
  DigitizerContext,
} from '@/application/digitizerContext'
import { POINT_MODE } from '@/constants'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'

// x1 at px 100 = 1, x2 at px 400 = 1000 (log X); y1 at px 500 = 1,
// y2 at px 100 = 1e4 (log Y): one decade = 100 px on both axes.
function calibrateLogLog(axisSet: AxisSetInterface): void {
  axisSet.pointMode = POINT_MODE.FOUR_POINTS
  axisSet.addAxisCoord({ xPx: 100, yPx: 500 })
  axisSet.addAxisCoord({ xPx: 400, yPx: 500 })
  axisSet.addAxisCoord({ xPx: 100, yPx: 500 })
  axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
  axisSet.x1.value = 1
  axisSet.x2.value = 1000
  axisSet.y1.value = 1
  axisSet.y2.value = 10000
  axisSet.setXIsLogScale(true)
  axisSet.setYIsLogScale(true)
}

describe('calibratedSpaceOf', () => {
  test('is null until the axis set can calibrate', () => {
    const ctx = createDigitizerContext()
    expect(calibratedSpaceOf(ctx.axisSetRepository.activeAxisSet)).toBeNull()
  })

  test('agrees with the values the app exports, tilt included, and round-trips', () => {
    const ctx = createDigitizerContext()
    const axisSet = ctx.axisSetRepository.activeAxisSet
    calibrateLogLog(axisSet)
    axisSet.considerGraphTilt = true
    // tilt the y axis a little
    axisSet.y2.coord = { xPx: 110, yPx: 100 }
    const space = calibratedSpaceOf(axisSet)
    expect(space).not.toBeNull()
    if (!space) return
    const { u, v } = space.toCalibrated(250, 300)
    const exported = calculatePhysicalValue(axisSet, 250, 300, 6)
    expect(space.uToValue(u)).toBeCloseTo(exported.x, 3)
    expect(space.vToValue(v) / exported.y).toBeCloseTo(1, 4)
    const back = space.toPixel(u, v)
    expect(back.xPx).toBeCloseTo(250, 9)
    expect(back.yPx).toBeCloseTo(300, 9)
    expect(space.pxPerU).toBeCloseTo(100, 9)
  })
})

describe('resample operations', () => {
  let ctx: DigitizerContext

  beforeEach(() => {
    ctx = createDigitizerContext()
    calibrateLogLog(ctx.axisSetRepository.activeAxisSet)
    // y = x^2 on log-log axes is a straight line of slope 2:
    // x = 10^(k/10) for k = 0..30 → px = 100 + 10k, py = 500 - 20k
    for (let k = 0; k <= 30; k++) {
      ctx.datasetRepository.activeDataset.addPoint(100 + 10 * k, 500 - 20 * k)
    }
  })

  test('previews without touching the dataset or the undo stack', () => {
    const preview = previewResample(ctx, { mode: 'thin', count: 5 })
    expect(preview.before).toBe(31)
    expect(preview.after).toBe(5)
    expect(preview.error).toBeUndefined()
    expect(ctx.datasetRepository.activeDataset.points).toHaveLength(31)
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  test('apply is one undo step named points.resample, and undo restores', () => {
    const actions: string[] = []
    ctx.historyManager.subscribe((change) => {
      if (change.type === 'capture') actions.push(change.action ?? '')
    })
    const before = ctx.datasetRepository.activeDataset.points.map((p) => ({
      xPx: p.xPx,
      yPx: p.yPx,
    }))

    expect(applyResample(ctx, { mode: 'every', k: 10 })).not.toBeNull()
    expect(actions).toEqual([RESAMPLE_ACTION])
    expect(RESAMPLE_ACTION).toBe('points.resample')
    expect(
      ctx.datasetRepository.activeDataset.points.map((p) => p.xPx),
    ).toEqual([100, 200, 300, 400])

    ctx.historyManager.undo()
    expect(
      ctx.datasetRepository.activeDataset.points.map((p) => ({
        xPx: p.xPx,
        yPx: p.yPx,
      })),
    ).toEqual(before)
    ctx.historyManager.redo()
    expect(ctx.datasetRepository.activeDataset.points).toHaveLength(4)
  })

  test('atX interpolates in log space: values on y = x^2 stay on it', () => {
    const preview = applyResample(ctx, {
      mode: 'atX',
      xSpec: 'list',
      xList: '2 5 30 999',
    })
    expect(preview?.after).toBe(4)
    const axisSet = ctx.axisSetRepository.activeAxisSet
    ctx.datasetRepository.activeDataset.points.forEach((p, i) => {
      const { x, y } = calculatePhysicalValue(axisSet, p.xPx, p.yPx, 8)
      expect(x).toBeCloseTo([2, 5, 30, 999][i], 4)
      expect(y / (x * x)).toBeCloseTo(1, 5)
    })
  })

  test('kept points carry origin and score; errors capture nothing', () => {
    const dataset = ctx.datasetRepository.activeDataset
    dataset.points[0].origin = { series: 0, index: 0 }
    dataset.points[0].score = 0.5
    applyResample(ctx, { mode: 'thin', count: 2 })
    expect(dataset.points[0]).toMatchObject({
      origin: { series: 0, index: 0 },
      score: 0.5,
    })

    const undoDepth = ctx.historyManager.canUndo
    expect(applyResample(ctx, { mode: 'thin', count: 1 })).toBeNull()
    expect(ctx.historyManager.canUndo).toBe(undoDepth)
    expect(dataset.points).toHaveLength(2)
  })

  test('an uncalibrated axis set is refused with a message', () => {
    const fresh = createDigitizerContext()
    fresh.datasetRepository.activeDataset.addPoint(1, 1)
    fresh.datasetRepository.activeDataset.addPoint(2, 2)
    const preview = previewResample(fresh, { mode: 'thin', count: 2 })
    expect(preview.error).toMatch(/Calibrate/)
    expect(applyResample(fresh, { mode: 'thin', count: 2 })).toBeNull()
    expect(fresh.historyManager.canUndo).toBe(false)
  })
})
