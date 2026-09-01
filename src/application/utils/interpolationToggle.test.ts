import { expect, describe, it, beforeEach, jest } from '@jest/globals'
import { Dataset } from '@/domain/models/dataset/dataset'
import { LOCAL_STORAGE_GLOBAL_KEY } from '@/constants'

const mockSetIsActive = jest.fn()
const mockUpdatePreview = jest.fn()
const mockClearPreview = jest.fn()

jest.mock('@/instanceStore/applicationServiceInstances', () => ({
  interpolator: {
    setIsActive: (...args: unknown[]) => mockSetIsActive(...args),
    updatePreview: (...args: unknown[]) => mockUpdatePreview(...args),
    clearPreview: (...args: unknown[]) => mockClearPreview(...args),
  },
}))

// INFO: datasetRepository.activeDataset needs to be a real Dataset instance
// (not a plain mock) — toggleInterpolation and forceRenderCanvasPoints both
// call several of its methods (addPoint/addManuallyAddedPointId/clearPoint)
// whose interplay is exactly what's under test here.
jest.mock('@/instanceStore/repositoryInatances', () => ({
  datasetRepository: { activeDataset: undefined },
}))

import { toggleInterpolation } from './interpolationToggle'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

describe('toggleInterpolation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    datasetRepository.activeDataset = new Dataset('dataset 1', [], 1)
  })

  it('activates the interpolator and updates the preview when turned on', () => {
    toggleInterpolation(true)

    expect(mockSetIsActive).toHaveBeenCalledWith(true)
    expect(mockUpdatePreview).toHaveBeenCalled()
    expect(mockClearPreview).not.toHaveBeenCalled()
  })

  it('persists the active state to localStorage', () => {
    toggleInterpolation(true)

    const stored = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_GLOBAL_KEY) ?? '{}',
    )
    expect(stored.isInterpolatorActive).toBe('true')
  })

  it('re-materializes manually-added points as real points when turned off', () => {
    const dataset = datasetRepository.activeDataset
    dataset.addPoint(10, 20)
    const manualPointId = dataset.lastPointId
    dataset.addManuallyAddedPointId(manualPointId)

    toggleInterpolation(false)

    expect(mockSetIsActive).toHaveBeenCalledWith(false)
    expect(mockClearPreview).toHaveBeenCalled()
    expect(mockUpdatePreview).not.toHaveBeenCalled()
    // INFO: the original manual point plus its re-added copy, plus the
    // forceRenderCanvasPoints() HACK's own add-then-clear leaves the count
    // back at 2 (original + re-added)
    expect(dataset.manuallyAddedPointIds).toHaveLength(2)
  })
})
