import { expect, describe, it, beforeEach, jest } from '@jest/globals'
import { POINT_MODE } from '@/constants'

const mockExportProject = jest.fn()
const mockDownloadZip = jest.fn()
const mockLoadProject = jest.fn()
const mockInitializeImageElement = jest.fn()
const mockDrawFitSizeImage = jest.fn()
const mockSetUploadImageUrl = jest.fn()
const mockSetActiveDataset = jest.fn()

jest.mock('@/instanceStore/applicationServiceInstances', () => ({
  projectService: {
    exportProject: (...args: unknown[]) => mockExportProject(...args),
    downloadZip: (...args: unknown[]) => mockDownloadZip(...args),
    loadProject: (...args: unknown[]) => mockLoadProject(...args),
  },
  canvasHandler: {
    initializeImageElement: (...args: unknown[]) =>
      mockInitializeImageElement(...args),
    drawFitSizeImage: (...args: unknown[]) => mockDrawFitSizeImage(...args),
    setUploadImageUrl: (...args: unknown[]) => mockSetUploadImageUrl(...args),
  },
}))

// INFO: datasetRepository.datasets is reassigned (not just mutated) by
// loadProjectFromFile, so the mock exposes it as a plain writable property
// rather than a getter, mirroring how the real repository singleton behaves.
jest.mock('@/instanceStore/repositoryInatances', () => ({
  datasetRepository: {
    datasets: [] as unknown[],
    setActiveDataset: (...args: unknown[]) => mockSetActiveDataset(...args),
  },
  axisSetRepository: {
    axisSets: [] as { pointMode: number }[],
  },
}))

import {
  saveProjectAndDownload,
  loadProjectFromFile,
  triggerLoadProjectDialog,
} from './projectFileOperations'
import {
  datasetRepository,
  axisSetRepository,
} from '@/instanceStore/repositoryInatances'

describe('projectFileOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    datasetRepository.datasets = []
    axisSetRepository.axisSets = []
  })

  describe('saveProjectAndDownload', () => {
    it('exports and downloads the project on success', async () => {
      const blob = new Blob()
      mockExportProject.mockResolvedValue(blob)

      const result = await saveProjectAndDownload()

      expect(mockExportProject).toHaveBeenCalled()
      expect(mockDownloadZip).toHaveBeenCalledWith(blob)
      expect(result).toEqual({ success: true })
    })

    it('returns an error message when export fails', async () => {
      mockExportProject.mockRejectedValue(new Error('disk full'))

      const result = await saveProjectAndDownload()

      expect(mockDownloadZip).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('disk full')
    })
  })

  describe('loadProjectFromFile', () => {
    const file = new File(['zip-bytes'], 'project.zip')

    it('restores canvas/dataset/axisSet state on success', async () => {
      mockLoadProject.mockResolvedValue('data:image/png;base64,xxx')
      datasetRepository.datasets = [
        { id: 1, name: 'dataset 1', points: [] },
        { id: 2, name: 'dataset 2', points: [{ id: 1, xPx: 0, yPx: 0 }] },
      ]
      axisSetRepository.axisSets = [{ pointMode: POINT_MODE.TWO_POINTS }]

      const result = await loadProjectFromFile(file)

      expect(mockLoadProject).toHaveBeenCalledWith(file)
      expect(mockInitializeImageElement).toHaveBeenCalledWith(
        'data:image/png;base64,xxx',
      )
      expect(mockDrawFitSizeImage).toHaveBeenCalled()
      expect(mockSetUploadImageUrl).toHaveBeenCalledWith(
        'data:image/png;base64,xxx',
      )
      // INFO: the empty placeholder "dataset 1" is dropped once a real
      // dataset came in from the loaded project
      expect(datasetRepository.datasets).toHaveLength(1)
      expect(datasetRepository.datasets[0].name).toBe('dataset 2')
      expect(mockSetActiveDataset).toHaveBeenCalledWith(0)
      expect(axisSetRepository.axisSets[0].pointMode).toBe(
        POINT_MODE.FOUR_POINTS,
      )
      expect(result).toEqual({ success: true })
    })

    it('keeps the placeholder dataset when it is the only one', async () => {
      mockLoadProject.mockResolvedValue('data:image/png;base64,xxx')
      datasetRepository.datasets = [{ id: 1, name: 'dataset 1', points: [] }]

      await loadProjectFromFile(file)

      expect(datasetRepository.datasets).toHaveLength(1)
    })

    it('returns an error message when loading fails', async () => {
      mockLoadProject.mockRejectedValue(new Error('bad zip'))

      const result = await loadProjectFromFile(file)

      expect(mockInitializeImageElement).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('bad zip')
    })
  })

  describe('triggerLoadProjectDialog', () => {
    it('resolves with an error when no file is selected', async () => {
      let capturedInput: HTMLInputElement | undefined
      const originalClick = HTMLInputElement.prototype.click
      HTMLInputElement.prototype.click = function (this: HTMLInputElement) {
        capturedInput = this
      }

      try {
        const promise = triggerLoadProjectDialog()
        capturedInput?.dispatchEvent(new Event('change'))

        const result = await promise
        expect(result).toEqual({
          success: false,
          errorMessage: 'No file selected',
        })
      } finally {
        HTMLInputElement.prototype.click = originalClick
      }
    })

    it('resolves as unsuccessful without an error message on cancel', async () => {
      let capturedInput: HTMLInputElement | undefined
      const originalClick = HTMLInputElement.prototype.click
      HTMLInputElement.prototype.click = function (this: HTMLInputElement) {
        capturedInput = this
      }

      try {
        const promise = triggerLoadProjectDialog()
        capturedInput?.dispatchEvent(new Event('cancel'))

        const result = await promise
        expect(result).toEqual({ success: false })
      } finally {
        HTMLInputElement.prototype.click = originalClick
      }
    })
  })
})
