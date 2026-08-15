import { ProjectServiceInterface } from './projectServiceInterface'
import { ProjectDTO } from '@/application/dto/projectDTO'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'
import { DatasetRepositoryInterface } from '@/domain/repositories/datasetRepository/datasetRepositoryInterface'
import { CanvasStatePort } from './canvasStatePort'
import { SerializeProjectUseCase } from '@plot-digitizer/core'
import { ManualMode } from '@/@types/types'
import JSZip from 'jszip'

export class ProjectService implements ProjectServiceInterface {
  private axisSetRepository: AxisSetRepositoryInterface
  private datasetRepository: DatasetRepositoryInterface
  private canvasHandler: CanvasStatePort
  // INFO: Phase 3 (docs/design/plot-digitizer-architecture.md) — the
  // ProjectDTO ⇄ domain-model conversion itself now lives in core
  // (SerializeProjectUseCase). This class keeps only the DOM/I-O parts:
  // grabbing the uploaded image, ZIP packaging, and File/Blob handling.
  private serializeProjectUseCase = new SerializeProjectUseCase()

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
    const projectData: ProjectDTO = this.serializeProjectUseCase.toProjectDTO({
      version: '1.11.2', // TODO: Get from package.json
      axisSets: this.axisSetRepository.axisSets,
      activeAxisSetId: this.axisSetRepository.activeAxisSetId,
      datasets: this.datasetRepository.datasets,
      activeDatasetId: this.datasetRepository.activeDataset.id,
      canvasState: {
        scale: this.canvasHandler.scale,
        manualMode: this.canvasHandler.manualMode,
      },
    })

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

    const restored = this.serializeProjectUseCase.fromProjectDTO(projectData)

    // Clear existing data
    this.axisSetRepository.clearAllAxisSets()
    this.datasetRepository.clearAllDatasets()

    // Restore axis sets
    for (const axisSet of restored.axisSets) {
      this.axisSetRepository.axisSets.push(axisSet)
    }

    // Set active axis set
    this.axisSetRepository.setActiveAxisSet(restored.activeAxisSetId)

    // Restore datasets
    for (const dataset of restored.datasets) {
      this.datasetRepository.datasets.push(dataset)
    }

    // Set active dataset
    this.datasetRepository.setActiveDataset(restored.activeDatasetId)

    // Restore canvas handler state
    this.canvasHandler.scale = restored.canvasState.scale
    this.canvasHandler.manualMode = restored.canvasState
      .manualMode as ManualMode

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
