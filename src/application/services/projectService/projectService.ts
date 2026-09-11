import { computed, reactive } from '@vue/reactivity'
import type { ComputedRef } from '@vue/reactivity'
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
import type JSZip from 'jszip'

// INFO: jszip is loaded on demand, not at module scope. It is ~100 kB min and
// only the ZIP round trip needs it — a host that passes ProjectDTO + image
// through the API (which is what `features.zipExportImport: false` means, and
// what Starrydata2 v4 does) must not pay for it. `import type` above keeps the
// types without emitting a static import. The promise is cached so repeated
// exports do not re-resolve the module.
let jszipModule: Promise<typeof JSZip> | undefined
function loadJSZip(): Promise<typeof JSZip> {
  if (!jszipModule) {
    jszipModule = import('jszip').then((mod) => mod.default)
  }
  return jszipModule
}

// INFO: reading a value is the entire point of the call; the arguments are
// thrown away. Used by trackProjectState() below, where a bare `axisSet.name`
// statement would read as dead code (and lint as one).
function touch(...values: unknown[]): void {
  void values
}

export class ProjectService implements ProjectServiceInterface {
  private axisSetRepository: AxisSetRepositoryInterface
  private datasetRepository: DatasetRepositoryInterface
  private canvasHandler: CanvasHandlerInterface

  // INFO: the same repositories again, but as the reactive() proxies the
  // DigitizerContext hands out. `revision` is a computed, and a computed only
  // records a dependency on state it reads THROUGH a proxy — the raw
  // instances this service is constructed with notify nobody. reactive()
  // caches by target, so these are the very proxies `ctx.datasetRepository`
  // resolves to and not a second copy: a mutation made by a use case, a panel
  // or restoreProject() is seen here, whichever of the two references it went
  // through. (Only a mutation applied to a raw instance obtained outside the
  // context escapes this — the same blind spot the UI's own re-rendering has,
  // see digitizerContext.ts.)
  private observedAxisSetRepository: AxisSetRepositoryInterface
  private observedDatasetRepository: DatasetRepositoryInterface
  private observedCanvasHandler: CanvasHandlerInterface

  // INFO: the counter is a plain field, incremented by the computed below and
  // never read reactively — bumping it inside its own evaluation would
  // otherwise invalidate that evaluation forever.
  private revisionCounter = 0
  // INFO: the ComputedRef is reached through a function, not held in a field.
  // reactive() UNWRAPS refs stored in properties, so `this.revisionRef.value`
  // read through the context's proxy would be `(a number).value` — undefined.
  // A closure over the ref is invisible to the proxy.
  private readRevision: () => number

  constructor(
    axisSetRepository: AxisSetRepositoryInterface,
    datasetRepository: DatasetRepositoryInterface,
    canvasHandler: CanvasHandlerInterface,
  ) {
    this.axisSetRepository = axisSetRepository
    this.datasetRepository = datasetRepository
    this.canvasHandler = canvasHandler

    this.observedAxisSetRepository = reactive(
      axisSetRepository,
    ) as AxisSetRepositoryInterface
    this.observedDatasetRepository = reactive(
      datasetRepository,
    ) as DatasetRepositoryInterface
    this.observedCanvasHandler = reactive(
      canvasHandler,
    ) as CanvasHandlerInterface

    // INFO: a computed rather than a counter every mutation site has to
    // remember to bump. Vue re-evaluates this exactly when one of the values
    // trackProjectState() read has actually changed, so a new operation added
    // anywhere in the library — or a host writing to a domain object directly
    // — is picked up without anyone having to know `revision` exists. A
    // forgotten bump is precisely the silent "the host never saved that edit"
    // bug this is meant to remove.
    //
    // Evaluation is lazy: the counter moves on the first read AFTER a change,
    // so a burst of mutations between two reads costs one step, and reading
    // twice with nothing in between returns the same number.
    const revisionRef: ComputedRef<number> = computed(() => {
      this.trackProjectState()
      this.revisionCounter += 1
      return this.revisionCounter
    })
    this.readRevision = () => revisionRef.value
  }

  get revision(): number {
    return this.readRevision()
  }

  /**
   * Read — and only read — every value `toProjectDTO()` puts into the DTO, so
   * that the computed above depends on all of them and on nothing else.
   *
   * MUST MIRROR toProjectDTO()/converters.ts: a field added to the DTO
   * without a read here would change the project without changing `revision`.
   * The mirror is written out by hand rather than by calling toProjectDTO()
   * itself because that is what makes the notification cheap — this walk
   * allocates nothing, while the DTO copies every point object on every
   * mutation, which is the cost hosts were paying (and re-stringifying) per
   * tick before `revision` existed.
   */
  private trackProjectState(): void {
    const axisSetRepository = this.observedAxisSetRepository
    const datasetRepository = this.observedDatasetRepository
    const canvasHandler = this.observedCanvasHandler

    touch(axisSetRepository.activeAxisSetId)
    axisSetRepository.axisSets.forEach((axisSet) => {
      touch(
        axisSet.id,
        axisSet.name,
        axisSet.xIsLogScale,
        axisSet.yIsLogScale,
        axisSet.considerGraphTilt,
        axisSet.pointMode,
        axisSet.isVisible,
      )
      // INFO: x2y2 is deliberately absent — it is derived at runtime and not
      // part of AxisSetDTO (see fromAxisSetDTO).
      ;[axisSet.x1, axisSet.x2, axisSet.y1, axisSet.y2].forEach((axis) => {
        touch(axis.name, axis.value, axis.coord.xPx, axis.coord.yPx)
      })
    })

    touch(datasetRepository.activeDatasetId)
    datasetRepository.datasets.forEach((dataset) => {
      touch(dataset.id, dataset.name, dataset.axisSetId, dataset.externalId)
      dataset.points.forEach((point) => {
        touch(point.id, point.xPx, point.yPx)
      })
      // INFO: forEach(touch) reads every element AND the array itself, which
      // is what a push/filter has to invalidate.
      dataset.visiblePointIds.forEach(touch)
      dataset.manuallyAddedPointIds.forEach(touch)
    })

    touch(canvasHandler.scale, canvasHandler.manualMode)
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

    // INFO: display-only state, and only the part of it that is portable.
    // `dto.canvasHandler` is absent when the writer never had one (major 1
    // files) — migrateProject leaves it undefined rather than inventing
    // defaults, so "no canvas state saved" stays distinguishable from "canvas
    // state saved".
    //
    // `canvasHandler.scale` is NOT restored on purpose:
    //   - it is the fit factor of the image against the canvas frame that was
    //     on screen when the project was saved, so it is meaningless as soon
    //     as the frame has another size (another window, another host layout);
    //   - assigning it here cannot resize anything (resize() lives on the
    //     handler and is not called by an assignment), so the canvases keep
    //     the size the real fit gave them while `scale` — which CanvasPoints,
    //     CanvasAxisSet and Interpolator all draw with — says something else.
    //     That is exactly how the overlays ended up drawn at scale 1 over a
    //     correctly fitted image.
    // The fit is recomputed after the restore instead; see
    // digitizerOperations.loadProject().
    if (dto.canvasHandler) {
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
    const JSZipClass = await loadJSZip()
    const zip = new JSZipClass()

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
    // INFO: outside the try below on purpose — a failure to fetch the jszip
    // chunk is not "this ZIP is invalid", and must not be reported as such.
    const JSZipClass = await loadJSZip()

    let zip: JSZip
    try {
      zip = await JSZipClass.loadAsync(zipFile)
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
