import { expect, describe, it, beforeEach, jest } from '@jest/globals'
import {
  applyImage,
  loadProject,
  replaceImage,
  reset,
} from './digitizerOperations'
import { DigitizerContext } from '@/application/digitizerContext'
import { ProjectService } from '@/application/services/projectService/projectService'
import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import { HistoryManager } from '@/application/services/historyManager/historyManager'
import { AxisSetRepository } from '@/domain/repositories/axisSetRepository/axisSetRepository'
import { DatasetRepository } from '@/domain/repositories/datasetRepository/datasetRepository'
import { Dataset } from '@/domain/models/dataset/dataset'
import { createEmptyProject } from '@/application/dto/projectDTO'
import { DigitizerError } from '@/application/errors'
import { MANUAL_MODE, MASK_MODE, POINT_MODE } from '@/constants'

const DATA_URL = 'data:image/png;base64,iVBORw0KGgo='

const buildContext = () => {
  const axisSetRepository = new AxisSetRepository()
  const datasetRepository = new DatasetRepository()

  const canvasHandler = {
    scale: 1,
    manualMode: MANUAL_MODE.UNSET,
    maskMode: MASK_MODE.UNSET,
    isCursorOnCanvas: false,
    // INFO: mode / cursor state is only reachable through the setters on the
    // real CanvasHandler, so the stub mirrors them onto its own fields.
    setManualMode: jest.fn((mode: number) => {
      canvasHandler.manualMode = mode as typeof canvasHandler.manualMode
    }),
    setMaskMode: jest.fn((mode: number) => {
      canvasHandler.maskMode = mode as typeof canvasHandler.maskMode
    }),
    setIsCursorOnCanvas: jest.fn((value: boolean) => {
      canvasHandler.isCursorOnCanvas = value
    }),
    colorSwatches: ['#ffffff'],
    initializeImageElement: jest.fn(() => Promise.resolve()),
    drawFitSizeImage: jest.fn(),
    setUploadImageUrl: jest.fn(),
    clearImage: jest.fn(),
  }
  const interpolator = {
    isActive: false,
    clearPreview: jest.fn(),
    resizeCanvas: jest.fn(),
  }
  const extractor = { setSwatches: jest.fn() }
  const historyManager = new HistoryManager(
    axisSetRepository,
    datasetRepository,
  )
  jest.spyOn(historyManager, 'clear')

  const projectService = new ProjectService(
    axisSetRepository,
    datasetRepository,
    canvasHandler as never,
  )
  jest.spyOn(projectService, 'restoreProject')

  const ctx = {
    axisSetRepository,
    datasetRepository,
    canvasHandler,
    interpolator,
    extractor,
    confirmer: {},
    valueFormat: { effectiveDigits: 4 },
    projectService,
    historyManager,
  }

  return { ctx: ctx as unknown as DigitizerContext, ...ctx }
}

type Ctx = ReturnType<typeof buildContext>

describe('applyImage', () => {
  let c: Ctx

  beforeEach(() => {
    c = buildContext()
  })

  it('decodes the source and draws it on the canvas', async () => {
    const result = await applyImage(c.ctx, DATA_URL)

    expect(result).toBe(DATA_URL)
    expect(c.canvasHandler.initializeImageElement).toHaveBeenCalledWith(
      DATA_URL,
    )
    expect(c.canvasHandler.drawFitSizeImage).toHaveBeenCalled()
    expect(c.canvasHandler.setUploadImageUrl).toHaveBeenCalledWith(DATA_URL)
    expect(c.extractor.setSwatches).toHaveBeenCalledWith(['#ffffff'])
    expect(c.interpolator.resizeCanvas).toHaveBeenCalled()
  })

  it('leaves axis sets, datasets and history alone', async () => {
    c.datasetRepository.activeDataset.addPoint(10, 20)
    c.axisSetRepository.activeAxisSet.addAxisCoord({ xPx: 5, yPx: 5 })
    c.historyManager.capture()

    await applyImage(c.ctx, DATA_URL)

    expect(c.datasetRepository.activeDataset.points).toHaveLength(1)
    expect(c.axisSetRepository.activeAxisSet.x1.coord).toEqual({
      xPx: 5,
      yPx: 5,
    })
    expect(c.historyManager.canUndo).toBe(true)
  })

  it('clears the interpolation preview only while the interpolator is active', async () => {
    await applyImage(c.ctx, DATA_URL)
    expect(c.interpolator.clearPreview).not.toHaveBeenCalled()

    c.interpolator.isActive = true
    await applyImage(c.ctx, DATA_URL)
    expect(c.interpolator.clearPreview).toHaveBeenCalled()
  })

  it('wraps a canvas decode failure in IMAGE_LOAD_FAILED', async () => {
    c.canvasHandler.initializeImageElement.mockRejectedValueOnce(
      new Error('broken image') as never,
    )

    try {
      await applyImage(c.ctx, DATA_URL)
    } catch (error) {
      expect(error).toBeInstanceOf(DigitizerError)
      expect((error as DigitizerError).code).toBe('IMAGE_LOAD_FAILED')
      return
    }
    throw new Error('expected applyImage to reject')
  })
})

describe('replaceImage', () => {
  let c: Ctx

  beforeEach(() => {
    c = buildContext()
  })

  it('applies the image and starts over with fresh data', async () => {
    c.axisSetRepository.activeAxisSet.addAxisCoord({ xPx: 5, yPx: 5 })
    c.datasetRepository.activeDataset.addPoint(10, 20)
    c.datasetRepository.createNewDataset()
    c.historyManager.capture()

    const result = await replaceImage(c.ctx, DATA_URL)

    expect(result).toBe(DATA_URL)
    expect(c.canvasHandler.initializeImageElement).toHaveBeenCalledWith(
      DATA_URL,
    )
    expect(c.canvasHandler.drawFitSizeImage).toHaveBeenCalled()
    expect(c.canvasHandler.setUploadImageUrl).toHaveBeenCalledWith(DATA_URL)

    // INFO: axis coordinates belong to the old image, so they are dropped
    expect(c.axisSetRepository.activeAxisSet.x1.coord).toEqual({
      xPx: -999,
      yPx: -999,
    })
    expect(c.datasetRepository.datasets).toHaveLength(1)
    expect(c.datasetRepository.datasets[0].points).toHaveLength(0)
    expect(c.datasetRepository.activeDatasetId).toBe(
      c.datasetRepository.lastDatasetId,
    )
    expect(c.historyManager.clear).toHaveBeenCalled()
    expect(c.historyManager.canUndo).toBe(false)
  })

  it('clears the coordinates of every axis set, not just the active one', async () => {
    c.axisSetRepository.createNewAxisSet()
    c.axisSetRepository.axisSets.forEach((axisSet) =>
      axisSet.addAxisCoord({ xPx: 5, yPx: 5 }),
    )

    await replaceImage(c.ctx, DATA_URL)

    c.axisSetRepository.axisSets.forEach((axisSet) => {
      expect(axisSet.x1.coord).toEqual({ xPx: -999, yPx: -999 })
    })
  })
})

describe('loadProject', () => {
  let c: Ctx

  beforeEach(() => {
    c = buildContext()
  })

  const projectWithTwoAxisSets = () => {
    const project = createEmptyProject()
    project.axisSets.push({
      ...project.axisSets[0],
      id: 2,
      name: 'XY Axes 2',
      pointMode: POINT_MODE.TWO_POINTS,
    })
    project.datasets[0].externalId = 'sample-3'
    return project
  }

  it('restores the DTO through projectService', async () => {
    const project = projectWithTwoAxisSets()

    await loadProject(c.ctx, project)

    expect(c.projectService.restoreProject).toHaveBeenCalledWith(project)
    expect(c.datasetRepository.datasets[0].externalId).toBe('sample-3')
  })

  it('shows calibrated axis sets in four-points mode and leaves uncalibrated ones alone', async () => {
    const project = projectWithTwoAxisSets()
    // INFO: only the first axis set has a coordinate; the second is the
    // untouched default (as in the empty project used on a fresh mount)
    // (replace the axis object: the fixture's second set shares it by spread)
    project.axisSets[0].x1 = {
      ...project.axisSets[0].x1,
      coord: { xPx: 10, yPx: 20 },
    }

    await loadProject(c.ctx, project)

    expect(c.axisSetRepository.axisSets).toHaveLength(2)
    expect(c.axisSetRepository.axisSets[0].pointMode).toBe(
      POINT_MODE.FOUR_POINTS,
    )
    expect(c.axisSetRepository.axisSets[1].pointMode).toBe(
      POINT_MODE.TWO_POINTS,
    )
  })

  it('clears the undo history and resizes the interpolation canvas', async () => {
    c.historyManager.capture()

    await loadProject(c.ctx, createEmptyProject())

    expect(c.historyManager.clear).toHaveBeenCalled()
    expect(c.historyManager.canUndo).toBe(false)
    expect(c.interpolator.resizeCanvas).toHaveBeenCalled()
  })

  it('does not load an image when none is given', async () => {
    await loadProject(c.ctx, createEmptyProject())

    expect(c.canvasHandler.initializeImageElement).not.toHaveBeenCalled()
    expect(c.canvasHandler.setUploadImageUrl).not.toHaveBeenCalled()
    // INFO: the fit IS asked for on this path too (see the re-fit after the
    // restore), and it is a no-op while no image is loaded — CanvasHandler
    // returns before touching the canvases or the scale. See
    // canvasHandler.scale.test.ts, "leaves the scale alone and owes nothing
    // when no image is loaded".
    expect(c.canvasHandler.drawFitSizeImage).toHaveBeenCalled()
  })

  it('applies the image before restoring when one is given', async () => {
    await loadProject(c.ctx, createEmptyProject(), DATA_URL)

    expect(c.canvasHandler.initializeImageElement).toHaveBeenCalledWith(
      DATA_URL,
    )
    expect(c.canvasHandler.setUploadImageUrl).toHaveBeenCalledWith(DATA_URL)
    expect(c.projectService.restoreProject).toHaveBeenCalled()
  })

  it('re-fits after the restore, not before it', async () => {
    const order: string[] = []
    c.canvasHandler.drawFitSizeImage.mockImplementation(() => {
      order.push('fit')
    })
    jest.spyOn(c.projectService, 'restoreProject').mockImplementation(() => {
      order.push('restore')
    })

    await loadProject(c.ctx, createEmptyProject(), DATA_URL)

    // INFO: applyImage() fits first, then the restore runs, then the fit is
    // recomputed so the canvas size and canvasHandler.scale agree.
    expect(order).toEqual(['fit', 'restore', 'fit'])
  })
})

// INFO: the reported bug, end to end over the real CanvasHandler: the image
// is drawn at the fit factor of the current frame while the points, axis
// markers and interpolation guide are drawn with `canvasHandler.scale`. After
// loadProject() the two must agree, whatever the saved DTO says.
describe('loadProject: canvas scale', () => {
  const IMAGE_WIDTH = 400
  const IMAGE_HEIGHT = 200
  const WRAPPER_WIDTH = 800
  const WRAPPER_HEIGHT = 600
  // INFO: mirrors drawFitSizeImage() — min(800/400, 600/200) - 0.01
  const EXPECTED_FIT_SCALE = 2 - 0.01

  const buildContextWithRealCanvas = () => {
    const c = buildContext()
    const canvasHandler = new CanvasHandler()

    const wrapper = document.createElement('div')
    // INFO: jsdom does no layout, so offsetWidth/Height have to be defined.
    Object.defineProperty(wrapper, 'offsetWidth', {
      value: WRAPPER_WIDTH,
      configurable: true,
    })
    Object.defineProperty(wrapper, 'offsetHeight', {
      value: WRAPPER_HEIGHT,
      configurable: true,
    })
    canvasHandler.attachCanvases({
      wrapper,
      imageCanvas: document.createElement('canvas'),
      maskCanvas: document.createElement('canvas'),
      tempMaskCanvas: document.createElement('canvas'),
    })
    // INFO: a real <img> only reports a size once it has decoded.
    canvasHandler.imageElement.width = IMAGE_WIDTH
    canvasHandler.imageElement.height = IMAGE_HEIGHT
    canvasHandler.setUploadImageUrl(DATA_URL)

    const projectService = new ProjectService(
      c.axisSetRepository,
      c.datasetRepository,
      canvasHandler,
    )
    const ctx = {
      ...c.ctx,
      canvasHandler,
      projectService,
    } as unknown as DigitizerContext

    return { ctx, canvasHandler }
  }

  it('ends with the scale that fits the CURRENT frame', async () => {
    const { ctx, canvasHandler } = buildContextWithRealCanvas()

    await loadProject(ctx, createEmptyProject())

    expect(canvasHandler.scale).toBeCloseTo(EXPECTED_FIT_SCALE)
    expect(canvasHandler.imageCanvas.element.width).toBe(
      Math.trunc(IMAGE_WIDTH * EXPECTED_FIT_SCALE),
    )
    // INFO: what the overlays multiply by has to match what the image was
    // drawn at, or they drift apart (the smaller the frame, the further).
    expect(canvasHandler.imageCanvas.element.width / IMAGE_WIDTH).toBeCloseTo(
      canvasHandler.scale,
    )
  })

  it('ignores the scale saved in the DTO', async () => {
    const { ctx, canvasHandler } = buildContextWithRealCanvas()
    const project = createEmptyProject()
    // INFO: a scale saved against a completely different frame.
    project.canvasHandler = { scale: 0.5, manualMode: MANUAL_MODE.UNSET }

    await loadProject(ctx, project)

    expect(canvasHandler.scale).toBeCloseTo(EXPECTED_FIT_SCALE)
  })
})

describe('reset', () => {
  let c: Ctx

  beforeEach(() => {
    c = buildContext()
  })

  it('restores the empty project and clears the canvas image', () => {
    c.axisSetRepository.activeAxisSet.addAxisCoord({ xPx: 5, yPx: 5 })
    const extra = new Dataset('dataset 2', [{ id: 1, xPx: 1, yPx: 2 }], 2)
    c.datasetRepository.addDataset(extra)
    c.historyManager.capture()

    reset(c.ctx)

    expect(c.projectService.restoreProject).toHaveBeenCalledWith(
      expect.objectContaining({ version: createEmptyProject().version }),
    )
    expect(c.axisSetRepository.axisSets).toHaveLength(1)
    expect(c.axisSetRepository.activeAxisSet.x1.coord).toEqual({
      xPx: -999,
      yPx: -999,
    })
    expect(c.datasetRepository.datasets).toHaveLength(1)
    expect(c.datasetRepository.datasets[0].points).toHaveLength(0)
    expect(c.canvasHandler.clearImage).toHaveBeenCalled()
    expect(c.historyManager.clear).toHaveBeenCalled()
    expect(c.historyManager.canUndo).toBe(false)
  })

  it('clears the interpolation preview only while the interpolator is active', () => {
    reset(c.ctx)
    expect(c.interpolator.clearPreview).not.toHaveBeenCalled()

    c.interpolator.isActive = true
    reset(c.ctx)
    expect(c.interpolator.clearPreview).toHaveBeenCalled()
  })
})
