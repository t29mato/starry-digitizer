import { ProjectServiceInterface } from './projectServiceInterface'
import { ProjectDTO } from '@/application/dto/projectDTO'
import { AxisSetDTO } from '@/application/dto/axisSetDTO'
import { DatasetDTO } from '@/application/dto/datasetDTO'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'
import { DatasetRepositoryInterface } from '@/domain/repositories/datasetRepository/datasetRepositoryInterface'
import { CanvasStatePort } from './canvasStatePort'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { Dataset } from '@/domain/models/dataset/dataset'
import JSZip from 'jszip'

export class ProjectService implements ProjectServiceInterface {
  private axisSetRepository: AxisSetRepositoryInterface
  private datasetRepository: DatasetRepositoryInterface
  private canvasHandler: CanvasStatePort

  constructor(
    axisSetRepository: AxisSetRepositoryInterface,
    datasetRepository: DatasetRepositoryInterface,
    canvasHandler: CanvasStatePort,
  ) {
    this.axisSetRepository = axisSetRepository
    this.datasetRepository = datasetRepository
    this.canvasHandler = canvasHandler
  }

  async exportProject(): Promise<Blob> {
    // Get image data from canvasHandler or canvas element
    let imageData = this.canvasHandler.uploadImageUrl

    if (!imageData) {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      if (!canvas) {
        throw new Error('No canvas found. Please upload an image first.')
      }
      imageData = canvas.toDataURL('image/png')
    }

    // Build project data (without image)
    const projectData: ProjectDTO = {
      version: '1.11.2', // TODO: Get from package.json
      timestamp: new Date().toISOString(),
      axisSets: this.axisSetRepository.axisSets.map(
        (axisSet): AxisSetDTO => ({
          id: axisSet.id,
          name: axisSet.name,
          // Extract AxisData (DTO) from AxisInterface (Entity)
          x1: {
            name: axisSet.x1.name,
            value: axisSet.x1.value,
            coord: axisSet.x1.coord,
          },
          x2: {
            name: axisSet.x2.name,
            value: axisSet.x2.value,
            coord: axisSet.x2.coord,
          },
          y1: {
            name: axisSet.y1.name,
            value: axisSet.y1.value,
            coord: axisSet.y1.coord,
          },
          y2: {
            name: axisSet.y2.name,
            value: axisSet.y2.value,
            coord: axisSet.y2.coord,
          },
          xIsLogScale: axisSet.xIsLogScale,
          yIsLogScale: axisSet.yIsLogScale,
          considerGraphTilt: axisSet.considerGraphTilt,
          pointMode: axisSet.pointMode,
          isVisible: axisSet.isVisible,
        }),
      ),
      activeAxisSetId: this.axisSetRepository.activeAxisSetId,
      datasets: this.datasetRepository.datasets.map(
        (dataset): DatasetDTO => ({
          id: dataset.id,
          name: dataset.name,
          axisSetId: dataset.axisSetId,
          points: dataset.points,
          visiblePointIds: dataset.visiblePointIds,
          manuallyAddedPointIds: dataset.manuallyAddedPointIds,
        }),
      ),
      activeDatasetId: this.datasetRepository.activeDataset.id,
      canvasHandler: {
        scale: this.canvasHandler.scale,
        manualMode: this.canvasHandler.manualMode,
      },
    }

    // Create ZIP file
    const zip = new JSZip()

    // Add project.json
    zip.file('project.json', JSON.stringify(projectData, null, 2))

    // Add image file (convert base64 to blob)
    const imageBlob = await this.base64ToBlob(imageData)
    zip.file('image.png', imageBlob)

    // Generate ZIP file
    return await zip.generateAsync({ type: 'blob' })
  }

  async importProject(
    zipFile: File,
  ): Promise<{ projectData: ProjectDTO; imageData: string }> {
    if (!zipFile.name.endsWith('.zip')) {
      throw new Error('Please select a valid .zip project file')
    }

    // Security check: file size limit (100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024
    if (zipFile.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 100MB limit')
    }

    // Load ZIP file
    const zip = await JSZip.loadAsync(zipFile)

    // Security check: validate file names (no path traversal)
    const fileNames = Object.keys(zip.files)
    for (const fileName of fileNames) {
      if (fileName.includes('..') || fileName.startsWith('/')) {
        throw new Error('Invalid file path detected in ZIP')
      }
    }

    // Security check: only allow specific files
    const allowedFiles = [
      'project.json',
      'image.png',
      'image.jpg',
      'image.jpeg',
    ]
    for (const fileName of fileNames) {
      if (!allowedFiles.includes(fileName)) {
        throw new Error(`Unexpected file in ZIP: ${fileName}`)
      }
    }

    // Extract project.json
    const projectJsonFile = zip.file('project.json')
    if (!projectJsonFile) {
      throw new Error('project.json not found in ZIP')
    }

    const projectJsonContent = await projectJsonFile.async('text')
    const projectData: ProjectDTO = JSON.parse(projectJsonContent)

    // Validate project data
    if (!projectData.version || !projectData.axisSets) {
      throw new Error('Invalid project file format')
    }

    // Extract image file
    const imageFile =
      zip.file('image.png') || zip.file('image.jpg') || zip.file('image.jpeg')
    if (!imageFile) {
      throw new Error('Image file not found in ZIP')
    }

    const imageBlob = await imageFile.async('blob')

    // Security check: validate image file size (uncompressed)
    const MAX_IMAGE_SIZE = 50 * 1024 * 1024 // 50MB
    if (imageBlob.size > MAX_IMAGE_SIZE) {
      throw new Error('Image file exceeds 50MB limit')
    }

    const imageData = await this.blobToBase64(imageBlob)

    return { projectData, imageData }
  }

  downloadZip(zipBlob: Blob, filename?: string): void {
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download =
      filename ||
      `sd-${new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, '')
        .replace('T', '-')}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async loadProject(zipFile: File): Promise<string> {
    // Import project data from ZIP
    const { projectData, imageData } = await this.importProject(zipFile)

    // Clear existing data
    this.axisSetRepository.clearAllAxisSets()
    this.datasetRepository.clearAllDatasets()

    // Restore axis sets from DTO
    for (const axisSetDTO of projectData.axisSets) {
      const axisSet = new AxisSet(
        new Axis('x1', axisSetDTO.x1.value, axisSetDTO.x1.coord),
        new Axis('x2', axisSetDTO.x2.value, axisSetDTO.x2.coord),
        new Axis('y1', axisSetDTO.y1.value, axisSetDTO.y1.coord),
        new Axis('y2', axisSetDTO.y2.value, axisSetDTO.y2.coord),
        new Axis('x2y2', -1, { xPx: -999, yPx: -999 }),
        axisSetDTO.id,
        axisSetDTO.name,
      )
      axisSet.xIsLogScale = axisSetDTO.xIsLogScale
      axisSet.yIsLogScale = axisSetDTO.yIsLogScale
      axisSet.considerGraphTilt = axisSetDTO.considerGraphTilt
      axisSet.pointMode = axisSetDTO.pointMode
      axisSet.isVisible = axisSetDTO.isVisible

      this.axisSetRepository.axisSets.push(axisSet)
    }

    // Set active axis set
    this.axisSetRepository.setActiveAxisSet(projectData.activeAxisSetId)

    // Restore datasets from DTO
    for (const datasetDTO of projectData.datasets) {
      const dataset = new Dataset(
        datasetDTO.name,
        datasetDTO.points,
        datasetDTO.id,
      )
      dataset.axisSetId = datasetDTO.axisSetId
      dataset.visiblePointIds = datasetDTO.visiblePointIds
      dataset.manuallyAddedPointIds = datasetDTO.manuallyAddedPointIds
      this.datasetRepository.datasets.push(dataset)
    }

    // Set active dataset
    this.datasetRepository.setActiveDataset(projectData.activeDatasetId)

    // Restore canvas handler state
    this.canvasHandler.scale = projectData.canvasHandler.scale
    this.canvasHandler.manualMode = projectData.canvasHandler.manualMode

    return imageData
  }

  private base64ToBlob(base64: string): Promise<Blob> {
    return fetch(base64).then((res) => res.blob())
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }
}
