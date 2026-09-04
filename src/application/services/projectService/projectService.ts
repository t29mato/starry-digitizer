import { ProjectServiceInterface } from './projectServiceInterface'
import {
  ProjectDTO,
  PROJECT_DTO_VERSION,
  migrateProject,
} from '@/application/dto/projectDTO'
import {
  toAxisSetDTO,
  fromAxisSetDTO,
  toDatasetDTO,
  fromDatasetDTO,
} from '@/application/dto/converters'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'
import { DatasetRepositoryInterface } from '@/domain/repositories/datasetRepository/datasetRepositoryInterface'
import { CanvasHandlerInterface } from '@/application/services/canvasHandler/canvasHandlerInterface'
import { DigitizerError } from '@/application/errors'
import JSZip from 'jszip'

export class ProjectService implements ProjectServiceInterface {
  private axisSetRepository: AxisSetRepositoryInterface
  private datasetRepository: DatasetRepositoryInterface
  private canvasHandler: CanvasHandlerInterface

  constructor(
    axisSetRepository: AxisSetRepositoryInterface,
    datasetRepository: DatasetRepositoryInterface,
    canvasHandler: CanvasHandlerInterface,
  ) {
    this.axisSetRepository = axisSetRepository
    this.datasetRepository = datasetRepository
    this.canvasHandler = canvasHandler
  }

  toProjectDTO(): ProjectDTO {
    return {
      version: PROJECT_DTO_VERSION,
      timestamp: new Date().toISOString(),
      axisSets: this.axisSetRepository.axisSets.map(toAxisSetDTO),
      activeAxisSetId: this.axisSetRepository.activeAxisSetId,
      datasets: this.datasetRepository.datasets.map(toDatasetDTO),
      // INFO: activeDatasetId 0 means "view all datasets" and must survive
      // the round trip, so read the id directly instead of activeDataset.id
      activeDatasetId: this.datasetRepository.activeDatasetId,
      canvasHandler: {
        scale: this.canvasHandler.scale,
        manualMode: this.canvasHandler.manualMode,
      },
    }
  }

  restoreProject(project: ProjectDTO): void {
    // INFO: both the ZIP path and the host-API path go through here, so
    // migration/validation happens exactly once, regardless of the source.
    const dto = migrateProject(project)

    this.axisSetRepository.clearAllAxisSets()
    this.datasetRepository.clearAllDatasets()

    dto.axisSets.forEach((axisSetDTO) => {
      this.axisSetRepository.addAxisSet(fromAxisSetDTO(axisSetDTO))
    })
    if (this.axisSetRepository.axisSets.length === 0) {
      this.axisSetRepository.createNewAxisSet()
    }
    const activeAxisSetExists = this.axisSetRepository.axisSets.some(
      (a) => a.id === dto.activeAxisSetId,
    )
    this.axisSetRepository.setActiveAxisSet(
      activeAxisSetExists
        ? dto.activeAxisSetId
        : this.axisSetRepository.axisSets[0].id,
    )

    dto.datasets.forEach((datasetDTO) => {
      this.datasetRepository.addDataset(fromDatasetDTO(datasetDTO))
    })
    if (this.datasetRepository.datasets.length === 0) {
      this.datasetRepository.createNewDataset()
    }
    const activeDatasetExists =
      dto.activeDatasetId === 0 ||
      this.datasetRepository.datasets.some((d) => d.id === dto.activeDatasetId)
    this.datasetRepository.setActiveDataset(
      activeDatasetExists
        ? dto.activeDatasetId
        : this.datasetRepository.datasets[0].id,
    )

    // INFO: display-only state; migrateProject guarantees defaults
    if (dto.canvasHandler) {
      this.canvasHandler.scale = dto.canvasHandler.scale
      this.canvasHandler.setManualMode(dto.canvasHandler.manualMode)
    }
  }

  async exportProject(): Promise<Blob> {
    // INFO: uploadImageUrl is set by digitizerOperations.applyImage for every
    // image path, so an empty value means no image was ever loaded. The old
    // document.querySelector('canvas') fallback also picked the wrong canvas
    // once two digitizers shared a page.
    const imageData = this.canvasHandler.uploadImageUrl

    if (!imageData) {
      throw new DigitizerError('EXPORT_FAILED', 'No image loaded')
    }

    const projectData = this.toProjectDTO()

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
      throw new DigitizerError(
        'ZIP_INVALID',
        'Please select a valid .zip project file',
      )
    }

    // Security check: file size limit (100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024
    if (zipFile.size > MAX_FILE_SIZE) {
      throw new DigitizerError('ZIP_INVALID', 'File size exceeds 100MB limit')
    }

    // Load ZIP file
    let zip: JSZip
    try {
      zip = await JSZip.loadAsync(zipFile)
    } catch (error) {
      throw new DigitizerError('ZIP_INVALID', 'Failed to read ZIP file', error)
    }

    // Security check: validate file names (no path traversal)
    const fileNames = Object.keys(zip.files)
    for (const fileName of fileNames) {
      if (fileName.includes('..') || fileName.startsWith('/')) {
        throw new DigitizerError(
          'ZIP_INVALID',
          'Invalid file path detected in ZIP',
        )
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
        throw new DigitizerError(
          'ZIP_INVALID',
          `Unexpected file in ZIP: ${fileName}`,
        )
      }
    }

    // Extract project.json
    const projectJsonFile = zip.file('project.json')
    if (!projectJsonFile) {
      throw new DigitizerError('ZIP_INVALID', 'project.json not found in ZIP')
    }

    const projectJsonContent = await projectJsonFile.async('text')
    let parsed: unknown
    try {
      parsed = JSON.parse(projectJsonContent)
    } catch (error) {
      throw new DigitizerError(
        'PROJECT_INVALID',
        'project.json is not valid JSON',
        error,
      )
    }
    const projectData = migrateProject(parsed)

    // Extract image file
    const imageFile =
      zip.file('image.png') || zip.file('image.jpg') || zip.file('image.jpeg')
    if (!imageFile) {
      throw new DigitizerError('ZIP_INVALID', 'Image file not found in ZIP')
    }

    const imageBlob = await imageFile.async('blob')

    // Security check: validate image file size (uncompressed)
    const MAX_IMAGE_SIZE = 50 * 1024 * 1024 // 50MB
    if (imageBlob.size > MAX_IMAGE_SIZE) {
      throw new DigitizerError('ZIP_INVALID', 'Image file exceeds 50MB limit')
    }

    const imageData = await this.blobToBase64(imageBlob)

    return { projectData, imageData }
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
