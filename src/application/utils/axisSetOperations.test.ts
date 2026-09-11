// INFO: "one thing the user did = one undo entry" for the axis-set use cases.
// Every case here was a change to project data that the panels made WITHOUT
// capturing, which is worse than "not undoable": ⌘Z still did something — it
// undid whatever the user had done before, silently. See the audit table in
// README "Undo granularity".
//
// The counterpart at the component level (the real buttons and checkboxes)
// lives in presentation/components/undoGranularity.test.ts; this file pins the
// use cases themselves, which are what a host that replaces the panels calls.
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import {
  activateAxisSet,
  addAxisCoord,
  addAxisSet,
  clearAxisSetCoords,
  removeAxisSet,
  setAxisValues,
  setConsiderGraphTilt,
  setLogScale,
  setPointMode,
} from '@/application/utils/axisSetOperations'
import { DigitizerError } from '@/application/errors'
import { POINT_MODE } from '@/constants'

/** The active axis set's four real coordinates, as plain data. */
function coordsOf(ctx: DigitizerContext) {
  const axisSet = ctx.axisSetRepository.activeAxisSet
  return {
    x1: { ...axisSet.x1.coord },
    x2: { ...axisSet.x2.coord },
    y1: { ...axisSet.y1.coord },
    y2: { ...axisSet.y2.coord },
  }
}

function calibrate(ctx: DigitizerContext): void {
  ctx.axisSetRepository.activeAxisSet.addAxisCoord({ xPx: 10, yPx: 90 })
  ctx.axisSetRepository.activeAxisSet.addAxisCoord({ xPx: 90, yPx: 10 })
}

describe('axis-set use cases capture exactly one undo entry', () => {
  let ctx: DigitizerContext

  beforeEach(() => {
    ctx = createDigitizerContext()
  })

  describe('clearAxisSetCoords ("Clear XY Axes")', () => {
    it('restores the calibration when undone', () => {
      calibrate(ctx)
      const before = coordsOf(ctx)

      clearAxisSetCoords(ctx)
      expect(ctx.axisSetRepository.activeAxisSet.hasAtLeastOneAxis).toBe(false)

      ctx.historyManager.undo()

      expect(coordsOf(ctx)).toStrictEqual(before)
    })

    it('captures exactly once', () => {
      calibrate(ctx)
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      clearAxisSetCoords(ctx)

      expect(capture).toHaveBeenCalledTimes(1)
    })

    it('captures nothing when there is no calibration to clear', () => {
      clearAxisSetCoords(ctx)

      expect(ctx.historyManager.canUndo).toBe(false)
    })
  })

  describe('setAxisValues (the OCR "auto-detect" batch)', () => {
    it('restores every value it overwrote with a single undo', () => {
      const axisSet = ctx.axisSetRepository.activeAxisSet
      axisSet.setX1Value(3)
      axisSet.setX2Value(7)
      const before = [axisSet.x1.value, axisSet.x2.value, axisSet.y1.value]

      setAxisValues(ctx, { x1: 100, x2: 200, y1: 300 })
      expect(ctx.axisSetRepository.activeAxisSet.x1.value).toBe(100)

      ctx.historyManager.undo()

      const after = ctx.axisSetRepository.activeAxisSet
      expect([after.x1.value, after.x2.value, after.y1.value]).toStrictEqual(
        before,
      )
    })

    it('captures once for the whole batch, not once per axis', () => {
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      setAxisValues(ctx, { x1: 1, x2: 2, y1: 3, y2: 4 })

      expect(capture).toHaveBeenCalledTimes(1)
    })

    it('captures nothing when the detection found nothing', () => {
      setAxisValues(ctx, {})

      expect(ctx.historyManager.canUndo).toBe(false)
    })

    it('captures nothing when every detected value is already set', () => {
      // INFO: the axis defaults. An entry here would make the next ⌘Z a no-op
      // for the user and swallow the host's own undo turn.
      setAxisValues(ctx, { x1: 0, x2: 1, y1: 0, y2: 1 })

      expect(ctx.historyManager.canUndo).toBe(false)
    })
  })

  describe('setLogScale', () => {
    it('flips back when undone', () => {
      setLogScale(ctx, 'x', true)
      expect(ctx.axisSetRepository.activeAxisSet.xIsLogScale).toBe(true)

      ctx.historyManager.undo()

      expect(ctx.axisSetRepository.activeAxisSet.xIsLogScale).toBe(false)
    })

    it('captures exactly once per click', () => {
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      setLogScale(ctx, 'x', true)
      setLogScale(ctx, 'y', true)

      expect(capture).toHaveBeenCalledTimes(2)
    })

    it('captures nothing when the flag is already what it is set to', () => {
      setLogScale(ctx, 'x', false)

      expect(ctx.historyManager.canUndo).toBe(false)
    })
  })

  describe('setConsiderGraphTilt', () => {
    it('flips back when undone', () => {
      setConsiderGraphTilt(ctx, true)

      ctx.historyManager.undo()

      expect(ctx.axisSetRepository.activeAxisSet.considerGraphTilt).toBe(false)
    })

    it('captures nothing when unchanged', () => {
      setConsiderGraphTilt(ctx, false)

      expect(ctx.historyManager.canUndo).toBe(false)
    })
  })

  describe('setPointMode', () => {
    it('restores the calibration mode when undone', () => {
      setPointMode(ctx, POINT_MODE.FOUR_POINTS)
      expect(ctx.axisSetRepository.activeAxisSet.pointMode).toBe(
        POINT_MODE.FOUR_POINTS,
      )

      ctx.historyManager.undo()

      expect(ctx.axisSetRepository.activeAxisSet.pointMode).toBe(
        POINT_MODE.TWO_POINTS,
      )
    })

    it('captures nothing when the mode is already selected', () => {
      setPointMode(ctx, POINT_MODE.TWO_POINTS)

      expect(ctx.historyManager.canUndo).toBe(false)
    })
  })

  describe('addAxisSet', () => {
    it('removes the axis set again when undone', () => {
      addAxisSet(ctx)
      expect(ctx.axisSetRepository.axisSets).toHaveLength(2)

      ctx.historyManager.undo()

      expect(ctx.axisSetRepository.axisSets).toHaveLength(1)
      expect(ctx.axisSetRepository.activeAxisSetId).toBe(1)
    })

    it('captures once, not once for the add and once for the switch', () => {
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      addAxisSet(ctx)

      expect(capture).toHaveBeenCalledTimes(1)
    })

    it('binds the active dataset to the new axis set', () => {
      addAxisSet(ctx)

      expect(ctx.datasetRepository.activeDataset.axisSetId).toBe(2)
    })
  })

  describe('activateAxisSet', () => {
    it('restores the dataset-to-axis-set binding when undone', () => {
      addAxisSet(ctx)
      // INFO: the state to come back to — dataset 1 calibrated against axis
      // set 2, which is what addAxisSet() above left behind.
      expect(ctx.datasetRepository.activeDataset.axisSetId).toBe(2)

      activateAxisSet(ctx, 1)
      expect(ctx.datasetRepository.activeDataset.axisSetId).toBe(1)

      ctx.historyManager.undo()

      expect(ctx.datasetRepository.activeDataset.axisSetId).toBe(2)
      expect(ctx.axisSetRepository.activeAxisSetId).toBe(2)
    })

    it('captures exactly once', () => {
      addAxisSet(ctx)
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      activateAxisSet(ctx, 1)

      expect(capture).toHaveBeenCalledTimes(1)
    })

    it('captures nothing for an axis set that does not exist', () => {
      activateAxisSet(ctx, 99)

      expect(ctx.historyManager.canUndo).toBe(false)
    })
  })

  describe('removeAxisSet', () => {
    it('brings back the axis set and the datasets that pointed at it', () => {
      addAxisSet(ctx)
      calibrate(ctx)
      const coordsBefore = coordsOf(ctx)
      expect(ctx.datasetRepository.activeDataset.axisSetId).toBe(2)

      removeAxisSet(ctx, 2, 1)
      expect(ctx.axisSetRepository.axisSets).toHaveLength(1)
      expect(ctx.datasetRepository.activeDataset.axisSetId).toBe(1)

      ctx.historyManager.undo()

      expect(ctx.axisSetRepository.axisSets).toHaveLength(2)
      expect(ctx.datasetRepository.activeDataset.axisSetId).toBe(2)
      expect(coordsOf(ctx)).toStrictEqual(coordsBefore)
    })

    it('captures once for the removal AND the re-binding', () => {
      addAxisSet(ctx)
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      removeAxisSet(ctx, 2, 1)

      expect(capture).toHaveBeenCalledTimes(1)
    })

    it('captures nothing when the target or the alternative is unknown', () => {
      addAxisSet(ctx)
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      removeAxisSet(ctx, 99, 1)
      removeAxisSet(ctx, 2, 99)
      removeAxisSet(ctx, 2, 2)

      expect(capture).not.toHaveBeenCalled()
      expect(ctx.axisSetRepository.axisSets).toHaveLength(2)
    })
  })
})

// INFO: placing a calibration coordinate used to be the ONLY step of the
// calibration that was not a use case — a host had to reach through the
// repository into the domain model (`activeAxisSet.addAxisCoord()`), which
// captured nothing and threw a bare Error on overflow.
describe('addAxisCoord', () => {
  let ctx: DigitizerContext

  beforeEach(() => {
    ctx = createDigitizerContext()
  })

  it('captures one entry per placed coordinate', () => {
    const capture = jest.spyOn(ctx.historyManager, 'capture')

    addAxisCoord(ctx, { xPx: 10, yPx: 90 })
    addAxisCoord(ctx, { xPx: 90, yPx: 10 })

    expect(capture).toHaveBeenCalledTimes(2)
  })

  it('undoes back to an uncalibrated axis set', () => {
    addAxisCoord(ctx, { xPx: 10, yPx: 90 })
    addAxisCoord(ctx, { xPx: 90, yPx: 10 })
    expect(ctx.axisSetRepository.activeAxisSet.nextAxis).toBeNull()

    ctx.historyManager.undo()
    expect(ctx.axisSetRepository.activeAxisSet.nextAxis?.name).toBe('x2y2')

    ctx.historyManager.undo()
    expect(ctx.axisSetRepository.activeAxisSet.hasAtLeastOneAxis).toBe(false)
  })

  it('fills x1 AND y1 with the first coordinate in TWO_POINTS mode, and derives the rectangle from the second', () => {
    addAxisCoord(ctx, { xPx: 10, yPx: 90 })
    const axisSet = ctx.axisSetRepository.activeAxisSet
    expect(axisSet.x1.coord).toStrictEqual({ xPx: 10, yPx: 90 })
    expect(axisSet.y1.coord).toStrictEqual({ xPx: 10, yPx: 90 })

    addAxisCoord(ctx, { xPx: 90, yPx: 10 })
    expect(axisSet.x2y2.coord).toStrictEqual({ xPx: 90, yPx: 10 })
    expect(axisSet.x2.coord).toStrictEqual({ xPx: 90, yPx: 90 })
    expect(axisSet.y2.coord).toStrictEqual({ xPx: 10, yPx: 10 })
  })

  it('fills one axis per call in FOUR_POINTS mode', () => {
    setPointMode(ctx, POINT_MODE.FOUR_POINTS)
    const axisSet = ctx.axisSetRepository.activeAxisSet

    const order: string[] = []
    for (let i = 0; i < 4; i++) {
      order.push(String(axisSet.nextAxis?.name))
      // INFO: non-zero on purpose — an axis at (0, 0) counts as unfilled.
      addAxisCoord(ctx, { xPx: 10 + i, yPx: 20 + i })
    }

    expect(order).toStrictEqual(['x1', 'x2', 'y1', 'y2'])
    expect(axisSet.nextAxis).toBeNull()
    expect(axisSet.x1.coord).toStrictEqual({ xPx: 10, yPx: 20 })
    expect(axisSet.x2.coord).toStrictEqual({ xPx: 11, yPx: 21 })
    expect(axisSet.y1.coord).toStrictEqual({ xPx: 12, yPx: 22 })
    expect(axisSet.y2.coord).toStrictEqual({ xPx: 13, yPx: 23 })
  })

  it('throws a DigitizerError and captures nothing once the axis set is full', () => {
    calibrate(ctx)
    const capture = jest.spyOn(ctx.historyManager, 'capture')

    let thrown: unknown
    try {
      addAxisCoord(ctx, { xPx: 50, yPx: 50 })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(DigitizerError)
    expect((thrown as DigitizerError).code).toBe('AXIS_SET_ALREADY_CALIBRATED')
    expect(capture).not.toHaveBeenCalled()
  })
})
