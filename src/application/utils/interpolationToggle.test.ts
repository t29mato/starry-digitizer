import { expect, describe, it, beforeEach, jest } from '@jest/globals'
import { Dataset } from '@/domain/models/dataset/dataset'
import { DatasetRepository } from '@/domain/repositories/datasetRepository/datasetRepository'
import { DigitizerContext } from '@/application/digitizerContext'
import { LOCAL_STORAGE_GLOBAL_KEY } from '@/constants'

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

  const ctx = {
    datasetRepository,
    interpolator,
  } as unknown as DigitizerContext

  return { ctx, datasetRepository, interpolator }
}

describe('toggleInterpolation', () => {
  let c: ReturnType<typeof buildContext>

  beforeEach(() => {
    localStorage.clear()
    c = buildContext()
  })

  it('activates the interpolator and updates the preview when turned on', () => {
    toggleInterpolation(c.ctx, true)

    expect(c.interpolator.setIsActive).toHaveBeenCalledWith(true)
    expect(c.interpolator.updatePreview).toHaveBeenCalled()
    expect(c.interpolator.clearPreview).not.toHaveBeenCalled()
  })

  it('persists the active state to localStorage', () => {
    toggleInterpolation(c.ctx, true)

    const stored = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_GLOBAL_KEY) ?? '{}',
    )
    expect(stored.isInterpolatorActive).toBe('true')
  })

  it('persists the inactive state to localStorage', () => {
    toggleInterpolation(c.ctx, false)

    const stored = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_GLOBAL_KEY) ?? '{}',
    )
    expect(stored.isInterpolatorActive).toBe('false')
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
})
