import { expect, describe, it, beforeEach, jest } from '@jest/globals'
import {
  activateDataset,
  addDataset,
  clearDatasetPoints,
  removeAllDatasets,
  removeDataset,
  viewAllDatasets,
} from './datasetOperations'
import { DigitizerContext } from '@/application/digitizerContext'
import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import { HistoryManager } from '@/application/services/historyManager/historyManager'
import { Interpolator } from '@/application/services/interpolator/interpolator'
import { InterpolatorCanvasInterface } from '@/application/services/interpolator/interpolatorCanvasInterface'
import { AxisSetRepository } from '@/domain/repositories/axisSetRepository/axisSetRepository'
import { DatasetRepository } from '@/domain/repositories/datasetRepository/datasetRepository'
import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'
import { MASK_MODE } from '@/constants'

// INFO: the interpolator is the REAL one here, not a spy that records a call.
// Both regression tests below are about what Interpolator.clearPreview()
// actually does to `datasetRepository.activeDataset` (it deletes every id in
// `manuallyAddedPointIds`), so replacing it with a stub would hide the bug.
// Only its canvas port is stubbed — the guide canvas is owned by
// presentation.
const buildInterpolatorCanvas = (): InterpolatorCanvasInterface => ({
  setGuideCanvas: jest.fn(),
  setMagnifierCanvas: jest.fn(),
  hasCanvas: jest.fn(() => false),
  clearGuideCanvasContext: jest.fn(),
  clearMagnifierCanvasContext: jest.fn(),
  drawInterpolationLine: jest.fn(),
  resize: jest.fn(),
})

const buildContext = () => {
  const axisSetRepository = new AxisSetRepository()
  const datasetRepository = new DatasetRepository()

  const canvasHandler = {
    scale: 1,
    originalWidth: 100,
    originalHeight: 100,
    maskMode: MASK_MODE.UNSET as number,
    hasCanvases: true,
    clearMask: jest.fn(),
    setMaskMode: jest.fn((mode: number) => {
      canvasHandler.maskMode = mode
    }),
  }

  const interpolator = new Interpolator(
    buildInterpolatorCanvas(),
    datasetRepository,
    canvasHandler as never,
  )

  const historyManager = new HistoryManager(
    axisSetRepository,
    datasetRepository,
  )

  const ctx = {
    axisSetRepository,
    datasetRepository,
    canvasHandler,
    interpolator,
    historyManager,
  }

  return { ctx: ctx as unknown as DigitizerContext, ...ctx }
}

type Ctx = ReturnType<typeof buildContext>

/** Add a point and mark it as manually added, the way the plot handler does. */
const addManualPoint = (dataset: DatasetInterface, xPx: number, yPx: number) => {
  dataset.addPoint(xPx, yPx)
  dataset.addManuallyAddedPointId(dataset.lastPointId)
}

// ---------------------------------------------------------------------------
// Regression 1: clearing one row's points must not touch another row
// ---------------------------------------------------------------------------
// The transcribed version ran `interpolator.clearPreview()` unconditionally.
// clearPreview() is hard-wired to `datasetRepository.activeDataset`, so
// pressing "clear points" on row B while row A was being edited deleted A's
// confirmed manually-added points.
describe('clearDatasetPoints', () => {
  let c: Ctx

  beforeEach(() => {
    c = buildContext()
  })

  const setUpTwoDatasets = () => {
    const a = c.datasetRepository.datasets[0]
    addManualPoint(a, 10, 10)
    addManualPoint(a, 20, 20)

    c.datasetRepository.createNewDataset()
    const b = c.datasetRepository.lastDataset
    b.addPoint(30, 30)
    b.addPoint(40, 40)

    // A stays active — the user is plotting on it.
    c.datasetRepository.setActiveDataset(a.id)
    return { a, b }
  }

  it("leaves the active dataset's manually added points alone when another dataset is cleared", () => {
    c.interpolator.setIsActive(true)
    const { a, b } = setUpTwoDatasets()

    clearDatasetPoints(c.ctx, b.id)

    expect(b.points).toHaveLength(0)
    // INFO: the regression. Before the fix these two dropped to 0 because
    // clearPreview() walked the ACTIVE dataset (A), not the target (B).
    expect(a.points).toHaveLength(2)
    expect(a.manuallyAddedPointIds).toHaveLength(2)
    expect(c.datasetRepository.activeDatasetId).toBe(a.id)
  })

  it('still clears the preview when the cleared dataset is the active one', () => {
    c.interpolator.setIsActive(true)
    const { a } = setUpTwoDatasets()
    a.addTempPoint(11, 11)

    clearDatasetPoints(c.ctx, a.id)

    expect(a.points).toHaveLength(0)
    expect(a.tempPoints).toHaveLength(0)
    expect(a.manuallyAddedPointIds).toHaveLength(0)
  })

  it('does not touch the preview while the interpolator is off', () => {
    const { a, b } = setUpTwoDatasets()
    const clearPreview = jest.spyOn(c.interpolator, 'clearPreview')

    clearDatasetPoints(c.ctx, b.id)

    expect(clearPreview).not.toHaveBeenCalled()
    expect(a.points).toHaveLength(2)
  })

  it('captures an undo snapshot and ignores an unknown id', () => {
    const { b } = setUpTwoDatasets()

    clearDatasetPoints(c.ctx, 999)
    expect(c.historyManager.canUndo).toBe(false)
    expect(b.points).toHaveLength(2)

    clearDatasetPoints(c.ctx, b.id)
    expect(c.historyManager.canUndo).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Regression 2: deleting the active row is also a dataset switch
// ---------------------------------------------------------------------------
// `datasetRepository.removeDataset()` promotes a neighbouring row to active by
// itself. The transcribed version stopped there, so the mask painted for the
// deleted row stayed on the canvas and the axis set stayed on the deleted
// row's — the next extraction ran inside the wrong region and calibrated
// against the wrong axes.
describe('removeDataset', () => {
  let c: Ctx

  beforeEach(() => {
    c = buildContext()
  })

  /** dataset 1 -> axis set 1, dataset 2 -> axis set 2, dataset 2 active. */
  const setUpTwoCalibratedDatasets = () => {
    c.axisSetRepository.createNewAxisSet()
    c.datasetRepository.createNewDataset()
    const second = c.datasetRepository.lastDataset
    second.setAxisSetId(c.axisSetRepository.axisSets[1].id)

    activateDataset(c.ctx, second.id)
    c.canvasHandler.clearMask.mockClear()
    c.canvasHandler.setMaskMode.mockClear()

    return { first: c.datasetRepository.datasets[0], second }
  }

  it('clears the mask and adopts the new row axis set when the active row is deleted', () => {
    const { first, second } = setUpTwoCalibratedDatasets()
    // INFO: the user painted a mask for the row that is about to disappear.
    c.canvasHandler.setMaskMode(MASK_MODE.PEN)
    c.canvasHandler.setMaskMode.mockClear()

    removeDataset(c.ctx, second.id)

    expect(c.datasetRepository.activeDatasetId).toBe(first.id)
    // INFO: the regression — both of these were skipped before the fix.
    expect(c.axisSetRepository.activeAxisSetId).toBe(first.axisSetId)
    expect(c.canvasHandler.clearMask).toHaveBeenCalled()
    expect(c.canvasHandler.maskMode).toBe(MASK_MODE.UNSET)
  })

  it('leaves the mask and the axis set alone when a non-active row is deleted', () => {
    const { first, second } = setUpTwoCalibratedDatasets()

    removeDataset(c.ctx, first.id)

    expect(c.datasetRepository.activeDatasetId).toBe(second.id)
    expect(c.axisSetRepository.activeAxisSetId).toBe(second.axisSetId)
    expect(c.canvasHandler.clearMask).not.toHaveBeenCalled()
    expect(c.canvasHandler.setMaskMode).not.toHaveBeenCalled()
  })

  it('captures an undo snapshot and ignores an unknown id', () => {
    const { second } = setUpTwoCalibratedDatasets()

    removeDataset(c.ctx, 999)
    expect(c.historyManager.canUndo).toBe(false)
    expect(c.datasetRepository.datasets).toHaveLength(2)

    removeDataset(c.ctx, second.id)
    expect(c.historyManager.canUndo).toBe(true)
    expect(c.datasetRepository.datasets).toHaveLength(1)
  })

  it('clears the preview before the removal, while the deleted row is still active', () => {
    const { second } = setUpTwoCalibratedDatasets()
    c.interpolator.setIsActive(true)
    const seen: number[] = []
    jest.spyOn(c.interpolator, 'clearPreview').mockImplementation(() => {
      seen.push(c.datasetRepository.activeDatasetId)
    })

    removeDataset(c.ctx, second.id)

    expect(seen).toEqual([second.id])
  })
})

describe('removeAllDatasets', () => {
  let c: Ctx

  beforeEach(() => {
    c = buildContext()
  })

  // INFO: same shape as the removeDataset bug, with a twist that would defeat
  // an id comparison: removeAllDatasets() always ends on setActiveDataset(1),
  // so when row 1 was already active the id does not change — but the object
  // behind it is a new, empty dataset back on the default axis set.
  it('clears the mask and adopts the fresh row even though its id is unchanged', () => {
    c.axisSetRepository.createNewAxisSet()
    const secondAxisSetId = c.axisSetRepository.axisSets[1].id
    c.axisSetRepository.setActiveAxisSet(secondAxisSetId)
    c.datasetRepository.activeDataset.setAxisSetId(secondAxisSetId)
    c.datasetRepository.activeDataset.addPoint(10, 10)
    c.canvasHandler.setMaskMode(MASK_MODE.PEN)
    c.canvasHandler.setMaskMode.mockClear()

    removeAllDatasets(c.ctx)

    expect(c.datasetRepository.datasets).toHaveLength(1)
    expect(c.datasetRepository.activeDatasetId).toBe(1)
    expect(c.datasetRepository.activeDataset.points).toHaveLength(0)
    // INFO: the regression — the fresh row is back on axis set 1, and the
    // mask painted for the old row must not survive it.
    expect(c.axisSetRepository.activeAxisSetId).toBe(1)
    expect(c.canvasHandler.clearMask).toHaveBeenCalled()
    expect(c.canvasHandler.maskMode).toBe(MASK_MODE.UNSET)
  })

  it('captures an undo snapshot', () => {
    c.datasetRepository.activeDataset.addPoint(10, 10)

    removeAllDatasets(c.ctx)

    expect(c.historyManager.canUndo).toBe(true)
    c.historyManager.undo()
    expect(c.datasetRepository.datasets[0].points).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// The call order that makes the switch safe
// ---------------------------------------------------------------------------
describe('activateDataset', () => {
  let c: Ctx

  beforeEach(() => {
    c = buildContext()
  })

  it('clears the preview BEFORE the switch, while the previous row is still active', () => {
    c.datasetRepository.createNewDataset()
    c.interpolator.setIsActive(true)
    const seen: number[] = []
    jest.spyOn(c.interpolator, 'clearPreview').mockImplementation(() => {
      seen.push(c.datasetRepository.activeDatasetId)
    })

    activateDataset(c.ctx, 2)

    // INFO: clearPreview() always works on `activeDataset`. Seeing id 2 here
    // would mean the destination's own points were the ones being wiped.
    expect(seen).toEqual([1])
  })

  it("keeps the destination's manually added points", () => {
    c.interpolator.setIsActive(true)
    c.datasetRepository.createNewDataset()
    const destination = c.datasetRepository.lastDataset
    addManualPoint(destination, 30, 30)
    addManualPoint(destination, 40, 40)

    activateDataset(c.ctx, destination.id)

    expect(destination.points).toHaveLength(2)
    expect(destination.manuallyAddedPointIds).toHaveLength(2)
  })

  it('adopts the axis set of the row it switches to and clears the mask', () => {
    c.axisSetRepository.createNewAxisSet()
    const secondAxisSetId = c.axisSetRepository.axisSets[1].id
    c.datasetRepository.createNewDataset()
    c.datasetRepository.lastDataset.setAxisSetId(secondAxisSetId)

    activateDataset(c.ctx, c.datasetRepository.lastDatasetId)

    expect(c.datasetRepository.activeDatasetId).toBe(2)
    expect(c.axisSetRepository.activeAxisSetId).toBe(secondAxisSetId)
    expect(c.canvasHandler.clearMask).toHaveBeenCalled()
    expect(c.canvasHandler.maskMode).toBe(MASK_MODE.UNSET)
  })

  it('does not capture an undo snapshot: switching rows changes no data', () => {
    c.datasetRepository.createNewDataset()

    activateDataset(c.ctx, 2)

    expect(c.historyManager.canUndo).toBe(false)
  })
})

describe('addDataset', () => {
  let c: Ctx

  beforeEach(() => {
    c = buildContext()
  })

  it('appends a row on the active axis set, activates it and captures history', () => {
    c.axisSetRepository.createNewAxisSet()
    const secondAxisSetId = c.axisSetRepository.axisSets[1].id
    c.axisSetRepository.setActiveAxisSet(secondAxisSetId)

    addDataset(c.ctx)

    expect(c.datasetRepository.datasets).toHaveLength(2)
    expect(c.datasetRepository.activeDatasetId).toBe(
      c.datasetRepository.lastDatasetId,
    )
    expect(c.datasetRepository.lastDataset.axisSetId).toBe(secondAxisSetId)
    expect(c.axisSetRepository.activeAxisSetId).toBe(secondAxisSetId)
    expect(c.canvasHandler.clearMask).toHaveBeenCalled()
    expect(c.historyManager.canUndo).toBe(true)
  })
})

describe('viewAllDatasets', () => {
  let c: Ctx

  beforeEach(() => {
    c = buildContext()
  })

  it('switches to the view-all pseudo id and clears the mask', () => {
    c.canvasHandler.setMaskMode(MASK_MODE.PEN)

    viewAllDatasets(c.ctx)

    expect(c.datasetRepository.activeDatasetId).toBe(0)
    expect(c.datasetRepository.isViewAllMode).toBe(true)
    expect(c.canvasHandler.clearMask).toHaveBeenCalled()
    expect(c.canvasHandler.maskMode).toBe(MASK_MODE.UNSET)
  })

  it('leaves the active axis set alone: "view all" is not one row calibration', () => {
    c.axisSetRepository.createNewAxisSet()
    const secondAxisSetId = c.axisSetRepository.axisSets[1].id
    c.axisSetRepository.setActiveAxisSet(secondAxisSetId)

    viewAllDatasets(c.ctx)

    expect(c.axisSetRepository.activeAxisSetId).toBe(secondAxisSetId)
  })
})

// ---------------------------------------------------------------------------
// A host that mounts panels one by one really has a moment where the dataset
// list is up and CanvasMain is not. CanvasHandler.clearMask() reaches the mask
// canvas through a getter that throws while nothing is attached.
// ---------------------------------------------------------------------------
describe('with no canvases attached', () => {
  const buildContextWithRealCanvasHandler = () => {
    const c = buildContext()
    const canvasHandler = new CanvasHandler()
    const ctx = { ...c.ctx, canvasHandler } as unknown as DigitizerContext
    return { ...c, ctx, canvasHandler }
  }

  it('unattached CanvasHandler.clearMask() does throw — this is what is being guarded', () => {
    expect(() => new CanvasHandler().clearMask()).toThrow()
  })

  it('activateDataset does not throw and still leaves the mask mode unset', () => {
    const { ctx, canvasHandler, datasetRepository } =
      buildContextWithRealCanvasHandler()
    datasetRepository.createNewDataset()
    canvasHandler.setMaskMode(MASK_MODE.PEN)

    expect(() => activateDataset(ctx, 2)).not.toThrow()
    expect(canvasHandler.maskMode).toBe(MASK_MODE.UNSET)
    expect(datasetRepository.activeDatasetId).toBe(2)
  })

  it('addDataset, removeDataset, removeAllDatasets and viewAllDatasets do not throw', () => {
    const { ctx, datasetRepository } = buildContextWithRealCanvasHandler()

    expect(() => addDataset(ctx)).not.toThrow()
    expect(() =>
      removeDataset(ctx, datasetRepository.activeDatasetId),
    ).not.toThrow()
    expect(() => removeAllDatasets(ctx)).not.toThrow()
    expect(() => viewAllDatasets(ctx)).not.toThrow()
  })
})
