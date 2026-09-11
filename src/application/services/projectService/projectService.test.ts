import { expect, describe, it, beforeEach } from '@jest/globals'
import { effect } from '@vue/reactivity'
import { ProjectService } from './projectService'
import {
  DigitizerContext,
  createDigitizerContext,
} from '@/application/digitizerContext'
import {
  addDataset,
  removeDataset,
  renameDataset,
  setDatasetExternalId,
} from '@/application/utils/datasetOperations'
import {
  setAxisValues,
  setLogScale,
  setPointMode,
} from '@/application/utils/axisSetOperations'
import { AxisSetRepository } from '@/domain/repositories/axisSetRepository/axisSetRepository'
import { DatasetRepository } from '@/domain/repositories/datasetRepository/datasetRepository'
import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { Dataset } from '@/domain/models/dataset/dataset'
import { PROJECT_DTO_VERSION, ProjectDTO } from '@/application/dto/projectDTO'
import { DigitizerError } from '@/application/errors'
import { MANUAL_MODE, POINT_MODE } from '@/constants'
import JSZip from 'jszip'

const TRANSPARENT_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

const axisDTO = (name: string, value: number, xPx: number, yPx: number) => ({
  name,
  value,
  coord: { xPx, yPx },
})

/** A valid, fully populated DTO at the given schema version. */
const buildProjectDTO = (version: string = PROJECT_DTO_VERSION) => ({
  version,
  timestamp: '2024-01-01T00:00:00.000Z',
  axisSets: [
    {
      id: 1,
      name: 'AxisSet 1',
      x1: axisDTO('x1', 0, 10, 10),
      x2: axisDTO('x2', 100, 110, 10),
      y1: axisDTO('y1', 0, 10, 110),
      y2: axisDTO('y2', 100, 10, 10),
      xIsLogScale: true,
      yIsLogScale: false,
      considerGraphTilt: true,
      pointMode: POINT_MODE.FOUR_POINTS,
      isVisible: true,
    },
    {
      id: 2,
      name: 'AxisSet 2',
      x1: axisDTO('x1', 0, 20, 20),
      x2: axisDTO('x2', 200, 220, 20),
      y1: axisDTO('y1', 0, 20, 220),
      y2: axisDTO('y2', 200, 20, 20),
      xIsLogScale: false,
      yIsLogScale: true,
      considerGraphTilt: false,
      pointMode: POINT_MODE.TWO_POINTS,
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
      externalId: 'sample-7',
    },
  ],
  activeDatasetId: 2,
  canvasHandler: { scale: 2.5, manualMode: MANUAL_MODE.EDIT },
})

const buildZipFile = async (
  projectData: unknown,
  fileName = 'test-project.zip',
): Promise<File> => {
  const zip = new JSZip()
  zip.file('project.json', JSON.stringify(projectData))
  zip.file('image.png', 'fake-image-data')
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return new File([zipBlob], fileName)
}

const expectDigitizerError = async (
  promise: Promise<unknown>,
  code: string,
) => {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(DigitizerError)
    expect((error as DigitizerError).code).toBe(code)
    return error as DigitizerError
  }
  throw new Error('expected the promise to reject')
}

describe('ProjectService', () => {
  let projectService: ProjectService
  let axisSetRepository: AxisSetRepository
  let datasetRepository: DatasetRepository
  let canvasHandler: CanvasHandler

  beforeEach(() => {
    axisSetRepository = new AxisSetRepository()
    datasetRepository = new DatasetRepository()
    canvasHandler = new CanvasHandler()

    // INFO: avoids reaching for a real <canvas> during exportProject()
    canvasHandler.uploadImageUrl = TRANSPARENT_PNG

    projectService = new ProjectService(
      axisSetRepository,
      datasetRepository,
      canvasHandler,
    )
  })

  describe('toProjectDTO', () => {
    it('stamps the current schema version', () => {
      expect(projectService.toProjectDTO().version).toBe(PROJECT_DTO_VERSION)
      expect(PROJECT_DTO_VERSION).toBe('2.0.0')
    })

    it('snapshots axis sets, datasets and canvas state', () => {
      const dataset = new Dataset(
        'Test Dataset',
        [{ id: 1, xPx: 100, yPx: 200 }],
        2,
      )
      dataset.externalId = 'sample-1'
      datasetRepository.addDataset(dataset)
      canvasHandler.scale = 1.5
      canvasHandler.setManualMode(MANUAL_MODE.ADD)

      const dto = projectService.toProjectDTO()

      expect(dto.axisSets).toHaveLength(1)
      expect(dto.datasets).toHaveLength(2)
      expect(dto.datasets[1].name).toBe('Test Dataset')
      expect(dto.datasets[1].points).toEqual([{ id: 1, xPx: 100, yPx: 200 }])
      expect(dto.datasets[1].externalId).toBe('sample-1')
      expect(dto.canvasHandler).toEqual({
        scale: 1.5,
        manualMode: MANUAL_MODE.ADD,
      })
    })

    it('omits externalId for datasets that do not have one', () => {
      expect(projectService.toProjectDTO().datasets[0]).not.toHaveProperty(
        'externalId',
      )
    })

    it('keeps activeDatasetId 0 ("view all") instead of resolving it to a dataset', () => {
      datasetRepository.setActiveDataset(0)

      expect(projectService.toProjectDTO().activeDatasetId).toBe(0)
    })
  })

  describe('restoreProject', () => {
    it('fully restores axis sets, datasets and canvas state', () => {
      projectService.restoreProject(buildProjectDTO() as ProjectDTO)

      expect(axisSetRepository.axisSets).toHaveLength(2)
      expect(axisSetRepository.axisSets[0].name).toBe('AxisSet 1')
      expect(axisSetRepository.axisSets[0].xIsLogScale).toBe(true)
      expect(axisSetRepository.axisSets[0].considerGraphTilt).toBe(true)
      expect(axisSetRepository.axisSets[0].pointMode).toBe(
        POINT_MODE.FOUR_POINTS,
      )
      expect(axisSetRepository.axisSets[1].isVisible).toBe(false)
      expect(axisSetRepository.activeAxisSetId).toBe(2)

      expect(datasetRepository.datasets).toHaveLength(2)
      expect(datasetRepository.datasets[0].points).toHaveLength(2)
      expect(datasetRepository.datasets[0].visiblePointIds).toEqual([1, 2])
      expect(datasetRepository.datasets[0].manuallyAddedPointIds).toEqual([1])
      expect(datasetRepository.datasets[1].externalId).toBe('sample-7')
      expect(datasetRepository.activeDatasetId).toBe(2)

      // INFO: manualMode is portable, `scale` is not — see below.
      expect(canvasHandler.manualMode).toBe(MANUAL_MODE.EDIT)
    })

    it('clears all existing data before restoring', () => {
      axisSetRepository.createNewAxisSet()
      axisSetRepository.createNewAxisSet()
      datasetRepository.createNewDataset()
      datasetRepository.createNewDataset()
      expect(axisSetRepository.axisSets).toHaveLength(3)
      expect(datasetRepository.datasets).toHaveLength(3)

      const dto = buildProjectDTO() as ProjectDTO
      dto.axisSets = [dto.axisSets[0]]
      dto.activeAxisSetId = 1
      dto.datasets = [dto.datasets[0]]
      dto.activeDatasetId = 1

      projectService.restoreProject(dto)

      expect(axisSetRepository.axisSets).toHaveLength(1)
      expect(datasetRepository.datasets).toHaveLength(1)
      expect(axisSetRepository.axisSets[0].name).toBe('AxisSet 1')
      expect(datasetRepository.datasets[0].name).toBe('Dataset 1')
    })

    // INFO: the regression this guards (the reported bug). loadProject() fits
    // the image FIRST, so `scale` already holds the correct fit factor by the
    // time restoreProject() runs. Resetting it to the fabricated default of a
    // DTO that never carried canvas state left the canvases at the fit size
    // and every overlay drawn at 1.
    it('leaves the canvas scale alone for a DTO with no canvasHandler', () => {
      canvasHandler.scale = 0.855
      canvasHandler.setManualMode(MANUAL_MODE.DELETE)
      const dto = buildProjectDTO() as Record<string, unknown>
      delete dto.canvasHandler

      projectService.restoreProject(dto as unknown as ProjectDTO)

      expect(datasetRepository.datasets).toHaveLength(2)
      expect(canvasHandler.scale).toBe(0.855)
      // INFO: no canvasHandler block at all, so there is no manual mode to
      // restore either — whatever was on screen stays on screen.
      expect(canvasHandler.manualMode).toBe(MANUAL_MODE.DELETE)
    })

    // INFO: `scale` is the fit factor against the frame that was on screen
    // when the project was saved, so it is not portable and is deliberately
    // dropped even when the DTO does carry one. Assigning it here could not
    // resize the canvases anyway.
    it('does not restore the canvas scale even when the DTO carries one', () => {
      canvasHandler.scale = 0.855
      const dto = buildProjectDTO() as ProjectDTO
      dto.canvasHandler = { scale: 0.5, manualMode: MANUAL_MODE.ADD }

      projectService.restoreProject(dto)

      expect(canvasHandler.scale).toBe(0.855)
    })

    it('restores manualMode when the DTO carries a canvasHandler', () => {
      canvasHandler.setManualMode(MANUAL_MODE.DELETE)
      const dto = buildProjectDTO() as ProjectDTO
      dto.canvasHandler = { scale: 0.5, manualMode: MANUAL_MODE.ADD }

      projectService.restoreProject(dto)

      expect(canvasHandler.manualMode).toBe(MANUAL_MODE.ADD)
    })

    it('accepts a legacy 1.11.2 project', () => {
      const dto = buildProjectDTO('1.11.2') as ProjectDTO

      projectService.restoreProject(dto)

      expect(datasetRepository.datasets).toHaveLength(2)
      expect(axisSetRepository.axisSets).toHaveLength(2)
    })

    it('throws DTO_VERSION_UNSUPPORTED for a newer major version', () => {
      const dto = buildProjectDTO('3.0.0') as ProjectDTO

      expect(() => projectService.restoreProject(dto)).toThrow(DigitizerError)
      try {
        projectService.restoreProject(dto)
      } catch (error) {
        expect((error as DigitizerError).code).toBe('DTO_VERSION_UNSUPPORTED')
      }
    })

    it('falls back to the first axis set / dataset when the active id is unknown', () => {
      const dto = buildProjectDTO() as ProjectDTO
      dto.activeAxisSetId = 99
      dto.activeDatasetId = 99

      projectService.restoreProject(dto)

      expect(axisSetRepository.activeAxisSetId).toBe(1)
      expect(datasetRepository.activeDatasetId).toBe(1)
    })
  })

  describe('toProjectDTO / restoreProject round trip', () => {
    const withoutTimestamp = (dto: ProjectDTO) => {
      const { timestamp: _timestamp, ...rest } = dto
      return rest
    }

    it('round-trips the whole application state', () => {
      const axisSet = new AxisSet(
        new Axis('x1', 1, { xPx: 0, yPx: 0 }),
        new Axis('x2', 10, { xPx: 1000, yPx: 0 }),
        new Axis('y1', 1, { xPx: 0, yPx: 1000 }),
        new Axis('y2', 10, { xPx: 0, yPx: 0 }),
        new Axis('x2y2', -1, { xPx: -999, yPx: -999 }),
        2,
        'XY Axes 2',
      )
      axisSet.xIsLogScale = true
      axisSet.considerGraphTilt = true
      axisSetRepository.addAxisSet(axisSet)
      axisSetRepository.setActiveAxisSet(2)

      const dataset = new Dataset(
        'Dataset 2',
        [
          { id: 1, xPx: 11, yPx: 22 },
          { id: 2, xPx: 33, yPx: 44 },
        ],
        2,
      )
      dataset.axisSetId = 2
      dataset.visiblePointIds = [1, 2]
      dataset.manuallyAddedPointIds = [2]
      dataset.externalId = 'sample-99'
      datasetRepository.addDataset(dataset)
      datasetRepository.setActiveDataset(2)

      canvasHandler.scale = 1.75
      canvasHandler.setManualMode(MANUAL_MODE.ADD)

      const first = projectService.toProjectDTO()
      projectService.restoreProject(first)
      const second = projectService.toProjectDTO()

      expect(withoutTimestamp(second)).toEqual(withoutTimestamp(first))
      expect(second.datasets[1].externalId).toBe('sample-99')
    })

    it('round-trips the "view all" active dataset id', () => {
      datasetRepository.setActiveDataset(0)

      const first = projectService.toProjectDTO()
      projectService.restoreProject(first)

      expect(datasetRepository.activeDatasetId).toBe(0)
      expect(projectService.toProjectDTO().activeDatasetId).toBe(0)
    })
  })

  describe('exportProject', () => {
    it('exports the project as a ZIP blob containing project.json and image.png', async () => {
      const zipBlob = await projectService.exportProject()

      expect(zipBlob).toBeInstanceOf(Blob)
      expect(zipBlob.type).toBe('application/zip')

      const zip = await JSZip.loadAsync(zipBlob)
      expect(zip.file('project.json')).toBeTruthy()
      expect(zip.file('image.png')).toBeTruthy()
    })

    it('writes the current DTO into project.json', async () => {
      const dataset = new Dataset(
        'Test Dataset',
        [{ id: 1, xPx: 100, yPx: 200 }],
        2,
      )
      datasetRepository.addDataset(dataset)
      canvasHandler.scale = 1.5

      const zip = await JSZip.loadAsync(await projectService.exportProject())
      const projectData = JSON.parse(
        await zip.file('project.json')!.async('text'),
      )

      expect(projectData.version).toBe(PROJECT_DTO_VERSION)
      expect(projectData.axisSets).toHaveLength(1)
      expect(projectData.datasets).toHaveLength(2)
      expect(projectData.datasets[1].name).toBe('Test Dataset')
      expect(projectData.canvasHandler.scale).toBe(1.5)
    })

    it('fails with EXPORT_FAILED when no image has been loaded', async () => {
      canvasHandler.uploadImageUrl = ''

      const error = await expectDigitizerError(
        projectService.exportProject(),
        'EXPORT_FAILED',
      )
      expect(error.message).toBe('No image loaded')
    })
  })

  describe('importProject', () => {
    it('imports a project from a valid ZIP file', async () => {
      const zipFile = await buildZipFile(buildProjectDTO())

      const result = await projectService.importProject(zipFile)

      expect(result.imageData).toBeDefined()
      expect(result.projectData.version).toBe(PROJECT_DTO_VERSION)
      expect(result.projectData.axisSets).toHaveLength(2)
      expect(result.projectData.datasets).toHaveLength(2)
      expect(result.projectData.datasets[1].externalId).toBe('sample-7')
    })

    it('migrates a legacy project found in the ZIP', async () => {
      const zipFile = await buildZipFile(buildProjectDTO('1.11.2'))

      const result = await projectService.importProject(zipFile)

      expect(result.projectData.version).toBe(PROJECT_DTO_VERSION)
    })

    it('rejects non-ZIP files with ZIP_INVALID', async () => {
      const textFile = new File(['not a zip'], 'test.txt')

      const error = await expectDigitizerError(
        projectService.importProject(textFile),
        'ZIP_INVALID',
      )
      expect(error.message).toContain('valid .zip project file')
    })

    it('rejects files exceeding the size limit with ZIP_INVALID', async () => {
      const largeFile = new File(
        [new Uint8Array(101 * 1024 * 1024)],
        'large.zip',
      )

      const error = await expectDigitizerError(
        projectService.importProject(largeFile),
        'ZIP_INVALID',
      )
      expect(error.message).toContain('100MB limit')
    })

    it('rejects a ZIP with a path traversal attempt', async () => {
      const zip = new JSZip()
      zip.file('../evil.json', 'malicious content')
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      const error = await expectDigitizerError(
        projectService.importProject(new File([zipBlob], 'evil.zip')),
        'ZIP_INVALID',
      )
      expect(error.message).toContain('Invalid file path detected in ZIP')
    })

    it('rejects a ZIP with unexpected files', async () => {
      const zip = new JSZip()
      zip.file('project.json', '{}')
      zip.file('image.png', 'fake-image')
      zip.file('malware.exe', 'evil')
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      const error = await expectDigitizerError(
        projectService.importProject(new File([zipBlob], 'suspicious.zip')),
        'ZIP_INVALID',
      )
      expect(error.message).toContain('Unexpected file in ZIP: malware.exe')
    })

    it('rejects a ZIP without project.json with ZIP_INVALID', async () => {
      const zip = new JSZip()
      zip.file('image.png', 'fake-image')
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      await expectDigitizerError(
        projectService.importProject(new File([zipBlob], 'no-json.zip')),
        'ZIP_INVALID',
      )
    })

    it('rejects a ZIP without an image with ZIP_INVALID', async () => {
      const zip = new JSZip()
      zip.file('project.json', JSON.stringify(buildProjectDTO()))
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      await expectDigitizerError(
        projectService.importProject(new File([zipBlob], 'no-image.zip')),
        'ZIP_INVALID',
      )
    })

    it('rejects a project.json that is not valid JSON with PROJECT_INVALID', async () => {
      const zip = new JSZip()
      zip.file('project.json', '{ not json')
      zip.file('image.png', 'fake-image')
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      await expectDigitizerError(
        projectService.importProject(new File([zipBlob], 'broken.zip')),
        'PROJECT_INVALID',
      )
    })

    it('rejects a project.json with an unusable shape with PROJECT_INVALID', async () => {
      const zipFile = await buildZipFile({ version: '2.0.0' })

      await expectDigitizerError(
        projectService.importProject(zipFile),
        'PROJECT_INVALID',
      )
    })

    it('rejects a project.json from a newer schema with DTO_VERSION_UNSUPPORTED', async () => {
      const zipFile = await buildZipFile(buildProjectDTO('3.0.0'))

      await expectDigitizerError(
        projectService.importProject(zipFile),
        'DTO_VERSION_UNSUPPORTED',
      )
    })

    it('round-trips an exported project back into the repositories', async () => {
      const dataset = new Dataset('Round Trip', [{ id: 1, xPx: 7, yPx: 8 }], 2)
      dataset.externalId = 'sample-rt'
      datasetRepository.addDataset(dataset)

      const zipBlob = await projectService.exportProject()
      const { projectData } = await projectService.importProject(
        new File([zipBlob], 'round-trip.zip'),
      )

      datasetRepository.clearAllDatasets()
      projectService.restoreProject(projectData)

      expect(datasetRepository.datasets).toHaveLength(2)
      expect(datasetRepository.datasets[1].name).toBe('Round Trip')
      expect(datasetRepository.datasets[1].externalId).toBe('sample-rt')
    })
  })
})

// ---------------------------------------------------------------------------
// revision
//
// INFO: built through createDigitizerContext() rather than `new
// ProjectService(...)` like the suites above, and every mutation below goes
// through `ctx`. That is not incidental: `revision` is a computed, and a
// computed sees a mutation only when it was made through the same reactive()
// proxy the context hands out. Testing it on raw instances would test
// something no host can observe.
// ---------------------------------------------------------------------------
describe('ProjectService.revision', () => {
  let ctx: DigitizerContext

  /** Read it, do `mutate`, read it again. */
  const around = (mutate: () => void): { before: number; after: number } => {
    const before = ctx.projectService.revision
    mutate()
    return { before, after: ctx.projectService.revision }
  }

  const expectBump = (mutate: () => void) => {
    const { before, after } = around(mutate)
    expect(after).toBeGreaterThan(before)
  }

  beforeEach(() => {
    ctx = createDigitizerContext()
  })

  it('does not move while nothing happens', () => {
    expect(ctx.projectService.revision).toBe(ctx.projectService.revision)
  })

  it('moves when a point is plotted', () => {
    expectBump(() => ctx.datasetRepository.activeDataset.addPoint(10, 20))
  })

  it('moves when a point is dragged — the point object is mutated in place', () => {
    ctx.datasetRepository.activeDataset.addPoint(10, 20)

    expectBump(() => {
      ctx.datasetRepository.activeDataset.points[0].xPx = 11
    })
  })

  // INFO: the four the host reported as missed by historyManager.subscribe().
  it('moves when a dataset is renamed', () => {
    expectBump(() => renameDataset(ctx, ctx.datasetRepository.activeDatasetId, 'renamed'))
  })

  it('moves when an axis value is set', () => {
    expectBump(() => setAxisValues(ctx, { x1: 42 }))
  })

  it('moves when a log scale is toggled', () => {
    expectBump(() => setLogScale(ctx, 'x', true))
  })

  it('moves when the point mode changes', () => {
    expectBump(() => setPointMode(ctx, POINT_MODE.FOUR_POINTS))
  })

  it('moves when a dataset is linked to a host record', () => {
    expectBump(() =>
      setDatasetExternalId(ctx, ctx.datasetRepository.activeDatasetId, 'sample-1'),
    )
  })

  it('moves when a dataset is added and when one is removed', () => {
    let addedId = 0
    expectBump(() => {
      addedId = addDataset(ctx)
    })
    expectBump(() => removeDataset(ctx, addedId))
  })

  it('moves on undo and again on redo', () => {
    addDataset(ctx)

    expectBump(() => ctx.historyManager.undo())
    expectBump(() => ctx.historyManager.redo())
  })

  it('moves when a project is restored', () => {
    expectBump(() => ctx.projectService.restoreProject(buildProjectDTO()))
  })

  it('does not move for a no-op', () => {
    setLogScale(ctx, 'x', true)
    setAxisValues(ctx, { x1: 42 })

    const { before, after } = around(() => {
      // INFO: all three are guarded as "already what it would be set to", so
      // nothing is written and the computed is never invalidated. A `revision`
      // that moved here would send the host off to serialise the project for
      // nothing, on every keystroke that retypes the same value.
      setLogScale(ctx, 'x', true)
      setAxisValues(ctx, { x1: 42 })
      renameDataset(
        ctx,
        ctx.datasetRepository.activeDatasetId,
        ctx.datasetRepository.activeDataset.name,
      )
    })

    expect(after).toBe(before)
  })

  it('only ever moves forwards, undo included', () => {
    const seen = [ctx.projectService.revision]
    ctx.datasetRepository.activeDataset.addPoint(1, 2)
    seen.push(ctx.projectService.revision)
    addDataset(ctx)
    seen.push(ctx.projectService.revision)
    ctx.historyManager.undo()
    seen.push(ctx.projectService.revision)

    expect(seen).toStrictEqual([...seen].sort((a, b) => a - b))
    expect(new Set(seen).size).toBe(seen.length)
  })

  // INFO: what a host actually writes. `effect` is what core re-exports for a
  // non-Vue host, and it must re-run without anyone polling. How MANY times it
  // re-runs is not asserted: `effect` has no scheduler, so one use case that
  // writes two fields re-runs it twice — which is exactly why the debounce
  // stays the host's (and StarryDigitizer.vue's) business.
  it('re-runs a subscriber without the project being serialised', () => {
    const revisions: number[] = []
    effect(() => {
      revisions.push(ctx.projectService.revision)
    })
    const afterSubscribing = revisions.length

    ctx.datasetRepository.activeDataset.addPoint(10, 20)
    renameDataset(ctx, ctx.datasetRepository.activeDatasetId, 'watched')

    expect(afterSubscribing).toBe(1)
    expect(revisions.length).toBeGreaterThan(afterSubscribing)
    expect(revisions).toStrictEqual([...revisions].sort((a, b) => a - b))
    expect(revisions[revisions.length - 1]).toBe(ctx.projectService.revision)
  })
})
