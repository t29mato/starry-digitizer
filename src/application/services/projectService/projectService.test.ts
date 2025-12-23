import { expect, describe, it, beforeEach, jest } from '@jest/globals'
import { ProjectService } from './projectService'
import { AxisSetRepository } from '@/domain/repositories/axisSetRepository/axisSetRepository'
import { DatasetRepository } from '@/domain/repositories/datasetRepository/datasetRepository'
import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { Dataset } from '@/domain/models/dataset/dataset'
import JSZip from 'jszip'

describe('ProjectService', () => {
  let projectService: ProjectService
  let axisSetRepository: AxisSetRepository
  let datasetRepository: DatasetRepository
  let canvasHandler: CanvasHandler

  beforeEach(() => {
    // Create fresh instances for each test
    axisSetRepository = new AxisSetRepository()
    datasetRepository = new DatasetRepository()
    canvasHandler = new CanvasHandler()

    // Mock uploadImageUrl to avoid canvas dependency
    canvasHandler.uploadImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    projectService = new ProjectService(
      axisSetRepository,
      datasetRepository,
      canvasHandler,
    )
  })

  describe('exportProject', () => {
    it('should export project as ZIP blob', async () => {
      const zipBlob = await projectService.exportProject()

      expect(zipBlob).toBeInstanceOf(Blob)
      expect(zipBlob.type).toBe('application/zip')

      // Verify ZIP contents
      const zip = await JSZip.loadAsync(zipBlob)
      expect(zip.file('project.json')).toBeTruthy()
      expect(zip.file('image.png')).toBeTruthy()
    })

    it('should include correct project data in ZIP', async () => {
      // Add test data
      const dataset = new Dataset('Test Dataset', [], 2)
      dataset.points = [{ id: 1, xPx: 100, yPx: 200 }]
      datasetRepository.addDataset(dataset)

      const zipBlob = await projectService.exportProject()
      const zip = await JSZip.loadAsync(zipBlob)
      const projectJsonFile = zip.file('project.json')
      const projectJson = await projectJsonFile!.async('text')
      const projectData = JSON.parse(projectJson)

      expect(projectData.version).toBe('1.11.2')
      expect(projectData.axisSets).toHaveLength(1)
      expect(projectData.datasets).toHaveLength(2)
      expect(projectData.datasets[1].name).toBe('Test Dataset')
      expect(projectData.datasets[1].points).toEqual([{ id: 1, xPx: 100, yPx: 200 }])
    })

    it('should include canvas handler state', async () => {
      canvasHandler.scale = 1.5
      canvasHandler.manualMode = 'single-point'

      const zipBlob = await projectService.exportProject()
      const zip = await JSZip.loadAsync(zipBlob)
      const projectJsonFile = zip.file('project.json')
      const projectJson = await projectJsonFile!.async('text')
      const projectData = JSON.parse(projectJson)

      expect(projectData.canvasHandler.scale).toBe(1.5)
      expect(projectData.canvasHandler.manualMode).toBe('single-point')
    })
  })

  describe('importProject', () => {
    it('should import project from valid ZIP file', async () => {
      // Create a test ZIP
      const zip = new JSZip()
      const projectData = {
        version: '1.11.2',
        timestamp: new Date().toISOString(),
        axisSets: [{
          id: 1,
          name: 'Test AxisSet',
          x1: { name: 'x1', value: 0, coord: { xPx: 10, yPx: 10 } },
          x2: { name: 'x2', value: 100, coord: { xPx: 110, yPx: 10 } },
          y1: { name: 'y1', value: 0, coord: { xPx: 10, yPx: 110 } },
          y2: { name: 'y2', value: 100, coord: { xPx: 10, yPx: 10 } },
          xIsLogScale: false,
          yIsLogScale: false,
          considerGraphTilt: false,
          pointMode: 'auto',
          isVisible: true,
        }],
        activeAxisSetId: 1,
        datasets: [{
          id: 1,
          name: 'Test Dataset',
          axisSetId: 1,
          points: [{ id: 1, xPx: 50, yPx: 50 }],
          visiblePointIds: [1],
          manuallyAddedPointIds: [],
        }],
        activeDatasetId: 1,
        canvasHandler: {
          scale: 1.0,
          manualMode: 'auto',
        },
      }

      zip.file('project.json', JSON.stringify(projectData))
      zip.file('image.png', 'fake-image-data')

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipFile = new File([zipBlob], 'test-project.zip')

      const result = await projectService.importProject(zipFile)

      expect(result.projectData).toBeDefined()
      expect(result.imageData).toBeDefined()
      expect(result.projectData.axisSets).toHaveLength(1)
      expect(result.projectData.datasets).toHaveLength(1)
      expect(result.projectData.datasets[0].name).toBe('Test Dataset')
    })

    it('should reject non-ZIP files', async () => {
      const textFile = new File(['not a zip'], 'test.txt')

      await expect(projectService.importProject(textFile)).rejects.toThrow(
        'Please select a valid .zip project file',
      )
    })

    it('should reject files exceeding size limit', async () => {
      // Create a large blob (>100MB)
      const largeData = new Uint8Array(101 * 1024 * 1024)
      const largeFile = new File([largeData], 'large.zip')

      await expect(projectService.importProject(largeFile)).rejects.toThrow(
        'File size exceeds 100MB limit',
      )
    })

    it('should reject ZIP with path traversal attempt', async () => {
      const zip = new JSZip()
      zip.file('../evil.json', 'malicious content')
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipFile = new File([zipBlob], 'evil.zip')

      await expect(projectService.importProject(zipFile)).rejects.toThrow(
        'Invalid file path detected in ZIP',
      )
    })

    it('should reject ZIP with unexpected files', async () => {
      const zip = new JSZip()
      zip.file('project.json', '{}')
      zip.file('image.png', 'fake-image')
      zip.file('malware.exe', 'evil')
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipFile = new File([zipBlob], 'suspicious.zip')

      await expect(projectService.importProject(zipFile)).rejects.toThrow(
        'Unexpected file in ZIP: malware.exe',
      )
    })
  })

  describe('loadProject', () => {
    it('should fully restore project state from ZIP file', async () => {
      // Create test data
      const zip = new JSZip()
      const projectData = {
        version: '1.11.2',
        timestamp: new Date().toISOString(),
        axisSets: [
          {
            id: 1,
            name: 'AxisSet 1',
            x1: { name: 'x1', value: 0, coord: { xPx: 10, yPx: 10 } },
            x2: { name: 'x2', value: 100, coord: { xPx: 110, yPx: 10 } },
            y1: { name: 'y1', value: 0, coord: { xPx: 10, yPx: 110 } },
            y2: { name: 'y2', value: 100, coord: { xPx: 10, yPx: 10 } },
            xIsLogScale: true,
            yIsLogScale: false,
            considerGraphTilt: true,
            pointMode: 'manual',
            isVisible: true,
          },
          {
            id: 2,
            name: 'AxisSet 2',
            x1: { name: 'x1', value: 0, coord: { xPx: 20, yPx: 20 } },
            x2: { name: 'x2', value: 200, coord: { xPx: 220, yPx: 20 } },
            y1: { name: 'y1', value: 0, coord: { xPx: 20, yPx: 220 } },
            y2: { name: 'y2', value: 200, coord: { xPx: 20, yPx: 20 } },
            xIsLogScale: false,
            yIsLogScale: true,
            considerGraphTilt: false,
            pointMode: 'auto',
            isVisible: false,
          },
        ],
        activeAxisSetId: 2,
        datasets: [
          {
            id: 1,
            name: 'Dataset 1',
            axisSetId: 1,
            points: [
              { id: 1, xPx: 50, yPx: 50 },
              { id: 2, xPx: 60, yPx: 60 },
            ],
            visiblePointIds: [1, 2],
            manuallyAddedPointIds: [1],
          },
          {
            id: 2,
            name: 'Dataset 2',
            axisSetId: 2,
            points: [{ id: 1, xPx: 100, yPx: 100 }],
            visiblePointIds: [1],
            manuallyAddedPointIds: [],
          },
        ],
        activeDatasetId: 2,
        canvasHandler: {
          scale: 2.5,
          manualMode: 'single-point',
        },
      }

      zip.file('project.json', JSON.stringify(projectData))
      zip.file('image.png', 'test-image-data')

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipFile = new File([zipBlob], 'test.zip')

      // Add some existing data that should be cleared
      axisSetRepository.createNewAxisSet()
      datasetRepository.createNewDataset()

      expect(axisSetRepository.axisSets).toHaveLength(2)
      expect(datasetRepository.datasets).toHaveLength(2)

      // Load project
      const imageData = await projectService.loadProject(zipFile)

      // Verify repositories were cleared
      expect(axisSetRepository.axisSets).toHaveLength(2)
      expect(datasetRepository.datasets).toHaveLength(2)

      // Verify axis sets restored correctly
      expect(axisSetRepository.axisSets[0].id).toBe(1)
      expect(axisSetRepository.axisSets[0].name).toBe('AxisSet 1')
      expect(axisSetRepository.axisSets[0].xIsLogScale).toBe(true)
      expect(axisSetRepository.axisSets[0].yIsLogScale).toBe(false)
      expect(axisSetRepository.axisSets[0].considerGraphTilt).toBe(true)
      expect(axisSetRepository.axisSets[0].pointMode).toBe('manual')
      expect(axisSetRepository.axisSets[0].isVisible).toBe(true)

      expect(axisSetRepository.axisSets[1].id).toBe(2)
      expect(axisSetRepository.axisSets[1].xIsLogScale).toBe(false)
      expect(axisSetRepository.axisSets[1].yIsLogScale).toBe(true)
      expect(axisSetRepository.axisSets[1].isVisible).toBe(false)

      expect(axisSetRepository.activeAxisSetId).toBe(2)

      // Verify datasets restored correctly
      expect(datasetRepository.datasets[0].id).toBe(1)
      expect(datasetRepository.datasets[0].name).toBe('Dataset 1')
      expect(datasetRepository.datasets[0].axisSetId).toBe(1)
      expect(datasetRepository.datasets[0].points).toHaveLength(2)
      expect(datasetRepository.datasets[0].visiblePointIds).toEqual([1, 2])
      expect(datasetRepository.datasets[0].manuallyAddedPointIds).toEqual([1])

      expect(datasetRepository.datasets[1].id).toBe(2)
      expect(datasetRepository.datasets[1].points).toHaveLength(1)

      expect(datasetRepository.activeDatasetId).toBe(2)

      // Verify canvas handler state restored
      expect(canvasHandler.scale).toBe(2.5)
      expect(canvasHandler.manualMode).toBe('single-point')

      // Verify image data returned
      expect(imageData).toBeDefined()
      expect(typeof imageData).toBe('string')
    })

    it('should clear all existing data before loading', async () => {
      // Setup existing data
      axisSetRepository.createNewAxisSet()
      axisSetRepository.createNewAxisSet()
      datasetRepository.createNewDataset()
      datasetRepository.createNewDataset()

      expect(axisSetRepository.axisSets).toHaveLength(3)
      expect(datasetRepository.datasets).toHaveLength(3)

      // Create minimal project
      const zip = new JSZip()
      const projectData = {
        version: '1.11.2',
        timestamp: new Date().toISOString(),
        axisSets: [{
          id: 1,
          name: 'Single AxisSet',
          x1: { name: 'x1', value: 0, coord: { xPx: 0, yPx: 0 } },
          x2: { name: 'x2', value: 1, coord: { xPx: 1, yPx: 0 } },
          y1: { name: 'y1', value: 0, coord: { xPx: 0, yPx: 1 } },
          y2: { name: 'y2', value: 1, coord: { xPx: 0, yPx: 0 } },
          xIsLogScale: false,
          yIsLogScale: false,
          considerGraphTilt: false,
          pointMode: 'auto',
          isVisible: true,
        }],
        activeAxisSetId: 1,
        datasets: [{
          id: 1,
          name: 'Single Dataset',
          axisSetId: 1,
          points: [],
          visiblePointIds: [],
          manuallyAddedPointIds: [],
        }],
        activeDatasetId: 1,
        canvasHandler: { scale: 1.0, manualMode: 'auto' },
      }

      zip.file('project.json', JSON.stringify(projectData))
      zip.file('image.png', 'image')

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipFile = new File([zipBlob], 'minimal.zip')

      await projectService.loadProject(zipFile)

      // Verify only loaded data exists
      expect(axisSetRepository.axisSets).toHaveLength(1)
      expect(datasetRepository.datasets).toHaveLength(1)
      expect(axisSetRepository.axisSets[0].name).toBe('Single AxisSet')
      expect(datasetRepository.datasets[0].name).toBe('Single Dataset')
    })
  })
})
