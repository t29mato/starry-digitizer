import { expect, describe, it, beforeEach, jest } from '@jest/globals'
import { Dataset } from '@/domain/models/dataset/dataset'
import { DatasetRepository } from '@/domain/repositories/datasetRepository/datasetRepository'
import { DigitizerContext } from '@/application/digitizerContext'

import { toggleInterpolation } from './interpolationToggle'

// INFO: datasetRepository holds a real Dataset (not a plain mock) —
// toggleInterpolation and forceRenderCanvasPoints both call several of its
// methods (addPoint/addManuallyAddedPointId/clearPoint) whose interplay is
// exactly what's under test here.
const buildContext = () => {
  const datasetRepository = new DatasetRepository()
  datasetRepository.clearAllDatasets()
  datasetRepository.addDataset(new Dataset('dataset 1', [], 1))
  datasetRepository.setActiveDataset(1)

  const interpolator = {
    setIsActive: jest.fn(),
    updatePreview: jest.fn(),
    clearPreview: jest.fn(),
  }

  // INFO: a stub rather than a real HistoryManager — what is under test here
  // is WHETHER the toggle captures, not what a snapshot contains (that is
  // covered end-to-end in components/undoGranularity.test.ts).
  const historyManager = {
    capture: jest.fn(),
  }

  const ctx = {
    datasetRepository,
    interpolator,
    historyManager,
  } as unknown as DigitizerContext

  return { ctx, datasetRepository, interpolator, historyManager }
}

describe('toggleInterpolation', () => {
  let c: ReturnType<typeof buildContext>

  beforeEach(() => {
    c = buildContext()
  })

  it('activates the interpolator and updates the preview when turned on', () => {
    toggleInterpolation(c.ctx, true)

    expect(c.interpolator.setIsActive).toHaveBeenCalledWith(true)
    expect(c.interpolator.updatePreview).toHaveBeenCalled()
    expect(c.interpolator.clearPreview).not.toHaveBeenCalled()
  })

  // INFO: was two cases asserting that the toggle wrote to
  // localStorage['starryDigitizer']. The library no longer persists anything:
  // that key was process-wide, so two digitizers on a page shared it, and the
  // library has no identity that survives a reload to key it by. Persisting
  // this belongs to the host (the standalone app does it now).
  it('does not touch localStorage', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem')

    toggleInterpolation(c.ctx, true)
    toggleInterpolation(c.ctx, false)

    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })

  it('re-materializes manually-added points as real points when turned off', () => {
    const dataset = c.datasetRepository.activeDataset
    dataset.addPoint(10, 20)
    const manualPointId = dataset.lastPointId
    dataset.addManuallyAddedPointId(manualPointId)

    toggleInterpolation(c.ctx, false)

    expect(c.interpolator.setIsActive).toHaveBeenCalledWith(false)
    expect(c.interpolator.clearPreview).toHaveBeenCalled()
    expect(c.interpolator.updatePreview).not.toHaveBeenCalled()
    // INFO: the original manual point plus its re-added copy, plus the
    // forceRenderCanvasPoints() HACK's own add-then-clear leaves the count
    // back at 2 (original + re-added)
    expect(dataset.manuallyAddedPointIds).toHaveLength(2)
  })

  it('leaves the dataset alone when there are no manually-added points', () => {
    const dataset = c.datasetRepository.activeDataset
    dataset.addPoint(10, 20)

    toggleInterpolation(c.ctx, false)

    expect(dataset.manuallyAddedPointIds).toHaveLength(0)
    expect(dataset.points).toHaveLength(1)
  })

  // INFO: turning the switch off DELETES every anchor point and re-adds a copy
  // under a new id at the end of `points` — a change to the exported rows, so
  // it has to be undoable. Without the capture a ⌘Z right after the switch
  // undoes whatever the user did BEFORE it, silently.
  it('captures once before re-materializing the anchor points', () => {
    const dataset = c.datasetRepository.activeDataset
    dataset.addPoint(10, 20)
    dataset.addManuallyAddedPointId(dataset.lastPointId)

    toggleInterpolation(c.ctx, false)

    expect(c.historyManager.capture).toHaveBeenCalledTimes(1)
  })

  // INFO: the counterpart. Turning interpolation ON only writes tempPoints,
  // which no snapshot holds, so an entry there would cost the user a ⌘Z press
  // that appears to do nothing.
  it('captures nothing when turned on', () => {
    toggleInterpolation(c.ctx, true)

    expect(c.historyManager.capture).not.toHaveBeenCalled()
  })

  it('captures nothing when turning off with no anchor points to restore', () => {
    c.datasetRepository.activeDataset.addPoint(10, 20)

    toggleInterpolation(c.ctx, false)

    expect(c.historyManager.capture).not.toHaveBeenCalled()
  })
})
