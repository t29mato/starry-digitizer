import {
  applyAutoCalibration,
  discardAutoCalibration,
  requestAutoCalibration,
} from './autoCalibrationOperations'
import {
  configureAutoService,
  isImageChangedError,
} from './autoFeatureOperations'
import {
  createDigitizerContext,
  DigitizerContext,
} from '@/application/digitizerContext'
import { AutoService } from '@/application/services/autoService/autoService'
import { POINT_MODE } from '@/constants'

const PNG = 'data:image/png;base64,aGVsbG8='

const body = {
  status: 'ok',
  frames: [
    {
      box: { x0: 99.5, y0: 49.5, x1: 499.5, y1: 399.5 },
      y_side: 'left',
      axes: {
        x: {
          status: 'ok',
          scale: 'linear',
          ticks: [
            { value: 0, px: 99.5 },
            { value: 5, px: 299.5 },
            { value: 10, px: 499.5 },
          ],
          confidence: 0.9,
        },
        y: {
          status: 'ok',
          scale: 'log',
          ticks: [
            { value: 1, px: 399.5 },
            { value: 10, px: 224.5 },
            { value: 100, px: 49.5 },
          ],
          confidence: 0.9,
        },
      },
    },
  ],
}

const setup = async (
  answer: unknown = body,
): Promise<{ ctx: DigitizerContext; service: AutoService }> => {
  const ctx = createDigitizerContext()
  const service: AutoService = {
    capabilities: async () => ['auto_axis'],
    calibrate: jest.fn(async () => answer),
    extract: jest.fn(),
  }
  await configureAutoService(ctx, service)
  ctx.canvasHandler.setUploadImageUrl(PNG)
  return { ctx, service }
}

describe('axis Auto-place', () => {
  test('a request only proposes; the axes are untouched until applied', async () => {
    const { ctx, service } = await setup()
    const proposal = await requestAutoCalibration(ctx)

    expect(service.calibrate).toHaveBeenCalledWith(expect.any(Blob))
    expect(proposal.status).toBe('ok')
    expect(ctx.autoFeatures.proposal).toEqual(proposal)
    expect(ctx.autoFeatures.proposalAxisSetId).toBe(
      ctx.axisSetRepository.activeAxisSetId,
    )
    expect(ctx.axisSetRepository.activeAxisSet.hasAtLeastOneAxis).toBe(false)
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  test('applying places the four reference points on the axis lines, as one undo step', async () => {
    const { ctx } = await setup()
    await requestAutoCalibration(ctx)
    expect(applyAutoCalibration(ctx)).toEqual(['x', 'y'])

    const axisSet = ctx.axisSetRepository.activeAxisSet
    // INFO: backend px + 0.5 (pixel centres), x on the frame's bottom edge,
    // y on its left edge
    expect(axisSet.x1.coord.xPx).toBeCloseTo(100)
    expect(axisSet.x2.coord.xPx).toBeCloseTo(500)
    expect(axisSet.x1.coord.yPx).toBeCloseTo(400)
    expect([axisSet.x1.value, axisSet.x2.value]).toEqual([0, 10])
    expect(axisSet.y1.coord).toEqual({ xPx: 100, yPx: expect.any(Number) })
    expect(axisSet.y1.coord.yPx).toBeCloseTo(400)
    expect(axisSet.y2.coord.yPx).toBeCloseTo(50)
    expect([axisSet.y1.value, axisSet.y2.value]).toEqual([1, 100])
    expect(axisSet.xIsLogScale).toBe(false)
    expect(axisSet.yIsLogScale).toBe(true)
    expect(axisSet.pointMode).toBe(POINT_MODE.FOUR_POINTS)
    expect(axisSet.plotArea).toEqual({
      xPx: 100,
      yPx: 50,
      widthPx: 400,
      heightPx: 350,
    })
    expect(ctx.autoFeatures.proposal).toBeNull()

    ctx.historyManager.undo()
    expect(ctx.axisSetRepository.activeAxisSet.hasAtLeastOneAxis).toBe(false)
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  test('a partial proposal applies only the usable axis', async () => {
    const partial = JSON.parse(JSON.stringify(body))
    partial.frames[0].axes.y = {
      status: 'failed',
      failure_reason: 'no_labels_read',
    }
    const { ctx } = await setup(partial)
    await requestAutoCalibration(ctx)
    expect(applyAutoCalibration(ctx)).toEqual(['x'])
    expect(ctx.axisSetRepository.activeAxisSet.hasXAxis).toBe(true)
    expect(ctx.axisSetRepository.activeAxisSet.y1.coord.xPx).toBeLessThan(0)
  })

  test('nothing usable: nothing applied, nothing captured', async () => {
    const { ctx } = await setup({ status: 'failed', frames: [] })
    await requestAutoCalibration(ctx)
    expect(applyAutoCalibration(ctx)).toEqual([])
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  // INFO: a new image dropping it is covered in digitizerOperations.test.ts
  test('discard drops the proposal', async () => {
    const { ctx } = await setup()
    await requestAutoCalibration(ctx)
    discardAutoCalibration(ctx)
    expect(ctx.autoFeatures.proposal).toBeNull()
  })

  test('without the feature the request is refused', async () => {
    const ctx = createDigitizerContext()
    ctx.canvasHandler.setUploadImageUrl(PNG)
    await expect(requestAutoCalibration(ctx)).rejects.toMatchObject({
      code: 'AUTO_SERVICE_FAILED',
    })
  })
})

describe('Auto-place: the image changes while it runs', () => {
  test('a late proposal is dropped, and the signal reaches the service', async () => {
    const ctx = createDigitizerContext()
    let resolve: (value: unknown) => void = () => undefined
    let seen: AbortSignal | undefined
    const service: AutoService = {
      capabilities: async () => ['auto_axis'],
      calibrate: jest.fn((_image, options?: { signal?: AbortSignal }) => {
        seen = options?.signal
        return new Promise((r) => (resolve = r))
      }),
      extract: jest.fn(),
    }
    await configureAutoService(ctx, service)
    ctx.canvasHandler.setUploadImageUrl(PNG)

    const controller = new AbortController()
    const running = requestAutoCalibration(ctx, controller.signal)
    expect(seen).toBe(controller.signal)
    ctx.canvasHandler.setUploadImageUrl('data:image/png;base64,b3RoZXI=')
    resolve(body)

    expect(isImageChangedError(await running.catch((e) => e))).toBe(true)
    expect(ctx.autoFeatures.proposal).toBeNull()
  })
})
