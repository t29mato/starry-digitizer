import {
  AUTO_DIGITIZE_ACTION,
  autoDigitizeAxesProblem,
  runAutoDigitize,
} from './autoDigitizeOperations'
import { configureAutoService } from './autoFeatureOperations'
import { parseCalibrationResponse } from '@/application/services/autoService/autoServiceWire'
import {
  createDigitizerContext,
  DigitizerContext,
} from '@/application/digitizerContext'
import { AutoService } from '@/application/services/autoService/autoService'
import { DigitizerError } from '@/application/errors'

const PNG = 'data:image/png;base64,aGVsbG8='

const calibration = (xConfidence = 0.9) => ({
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
          confidence: xConfidence,
        },
        y: {
          status: 'ok',
          scale: 'linear',
          ticks: [
            { value: 0, px: 399.5 },
            { value: 50, px: 224.5 },
            { value: 100, px: 49.5 },
          ],
          confidence: 0.9,
        },
      },
    },
  ],
})

const extraction = {
  method: 'lineformer',
  series: [
    {
      label: 'line 1',
      points: [
        [109.5, 299.5],
        [209.5, 199.5],
      ],
    },
    { label: 'line 2', points: [[309.5, 99.5]] },
  ],
}

type Setup = {
  ctx: DigitizerContext
  service: AutoService & {
    calibrate: jest.Mock
    extract: jest.Mock
  }
}

const setup = async (
  features: string[] = ['auto_axis', 'lineformer', 'markernet'],
): Promise<Setup> => {
  const ctx = createDigitizerContext()
  const service = {
    capabilities: async () => features,
    calibrate: jest.fn(async () => calibration()),
    extract: jest.fn(async () => extraction),
  }
  await configureAutoService(ctx, service)
  ctx.canvasHandler.setUploadImageUrl(PNG)
  return { ctx, service }
}

/** What Undo has to bring back: no axes, one empty dataset. */
function expectPristine(ctx: DigitizerContext): void {
  expect(ctx.axisSetRepository.activeAxisSet.hasAtLeastOneAxis).toBe(false)
  expect(ctx.datasetRepository.datasets).toHaveLength(1)
  expect(ctx.datasetRepository.activeDataset.points).toHaveLength(0)
}

describe('Auto digitize', () => {
  test('applies the axes and makes the drafts, as ONE undo step', async () => {
    const { ctx, service } = await setup()
    const captures: (string | undefined)[] = []
    ctx.historyManager.subscribe((change) => {
      if (change.type === 'capture') captures.push(change.action)
    })
    const steps: string[] = []

    const outcome = await runAutoDigitize(ctx, {
      method: 'lineformer',
      onStep: (step) => steps.push(step),
    })

    expect(outcome.status).toBe('done')
    expect(outcome.stoppedAt).toBeNull()
    expect(outcome.appliedAxes).toEqual(['x', 'y'])
    expect(outcome.extraction).toEqual({
      seriesCount: 2,
      pointCount: 3,
      datasetIds: [1, 2],
      replacedDraftCount: 0,
      hasScores: false,
    })
    expect(outcome.undoSteps).toBe(1)
    expect(steps).toEqual(['axes', 'extract'])
    expect(captures).toEqual([AUTO_DIGITIZE_ACTION])

    // INFO: the extraction looks inside the frame Auto-place found
    expect(service.extract).toHaveBeenCalledWith(expect.any(Blob), {
      method: 'lineformer',
      params: undefined,
      area: { x0: 99.5, y0: 49.5, x1: 499.5, y1: 399.5 },
    })
    const axisSet = ctx.axisSetRepository.activeAxisSet
    expect(axisSet.x1.value).toBe(0)
    expect(axisSet.x2.value).toBe(10)
    expect(ctx.datasetRepository.datasets.map((d) => d.name)).toEqual([
      'line 1 (lineformer)',
      'line 2 (lineformer)',
    ])

    ctx.historyManager.undo()
    expectPristine(ctx)
    expect(ctx.historyManager.canUndo).toBe(false)

    ctx.historyManager.redo()
    expect(ctx.datasetRepository.datasets).toHaveLength(2)
    expect(ctx.axisSetRepository.activeAxisSet.hasAtLeastOneAxis).toBe(true)
  })

  test('runs only the chosen method (no fallback)', async () => {
    const { ctx, service } = await setup()
    service.extract.mockResolvedValueOnce({ method: 'markernet', series: [] })

    const outcome = await runAutoDigitize(ctx, { method: 'markernet' })

    expect(service.extract).toHaveBeenCalledTimes(1)
    expect(service.extract.mock.calls[0][1].method).toBe('markernet')
    expect(outcome.status).toBe('no_points')
  })

  test('the calibration request fails: nothing changes, nothing to undo', async () => {
    const { ctx, service } = await setup()
    service.calibrate.mockRejectedValueOnce(new Error('503'))

    const outcome = await runAutoDigitize(ctx, { method: 'lineformer' })

    expect(outcome.status).toBe('failed')
    expect(outcome.stoppedAt).toBe('axes')
    expect(outcome.error).toBeInstanceOf(DigitizerError)
    expect(outcome.reason).toMatch(/^Reading the axes failed/)
    expect(outcome.undoSteps).toBe(0)
    expect(service.extract).not.toHaveBeenCalled()
    expectPristine(ctx)
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  test('an axis that was not read: stops, and leaves the proposal for Auto-place', async () => {
    const { ctx, service } = await setup()
    const body = calibration()
    const axes: Record<string, unknown> = body.frames[0].axes
    axes.y = {
      status: 'failed',
      scale: null,
      ticks: [],
      confidence: 0,
      failure_reason: 'too_few_labels',
    }
    service.calibrate.mockResolvedValueOnce(body)

    const outcome = await runAutoDigitize(ctx, { method: 'lineformer' })

    expect(outcome.status).toBe('stopped')
    expect(outcome.stoppedAt).toBe('axes')
    expect(outcome.reason).toBe(
      'The axes were not applied (y axis: too few tick labels read).',
    )
    expect(service.extract).not.toHaveBeenCalled()
    expect(ctx.autoFeatures.proposal).not.toBeNull()
    expectPristine(ctx)
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  test('a low-confidence axis: stops before applying anything', async () => {
    const { ctx, service } = await setup()
    service.calibrate.mockResolvedValueOnce(calibration(0.3))

    const outcome = await runAutoDigitize(ctx, { method: 'lineformer' })

    expect(outcome.status).toBe('stopped')
    expect(outcome.reason).toContain('x axis: low confidence (0.30)')
    expectPristine(ctx)
  })

  test('the extraction fails: the axes stay, and one Undo removes them', async () => {
    const { ctx, service } = await setup()
    service.extract.mockRejectedValueOnce(new Error('busy'))

    const outcome = await runAutoDigitize(ctx, { method: 'lineformer' })

    expect(outcome.status).toBe('failed')
    expect(outcome.stoppedAt).toBe('extract')
    expect(outcome.appliedAxes).toEqual(['x', 'y'])
    expect(outcome.reason).toMatch(
      /^The axes were applied, but the extraction failed/,
    )
    expect(outcome.undoSteps).toBe(1)
    expect(ctx.axisSetRepository.activeAxisSet.hasAtLeastOneAxis).toBe(true)

    ctx.historyManager.undo()
    expectPristine(ctx)
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  test('nothing found: the axes stay, no drafts', async () => {
    const { ctx, service } = await setup()
    service.extract.mockResolvedValueOnce({ method: 'lineformer', series: [] })

    const outcome = await runAutoDigitize(ctx, { method: 'lineformer' })

    expect(outcome.status).toBe('no_points')
    expect(outcome.stoppedAt).toBe('extract')
    expect(ctx.datasetRepository.datasets).toHaveLength(1)
    ctx.historyManager.undo()
    expectPristine(ctx)
  })

  test('cancelled during the extraction: the late answer is dropped', async () => {
    const { ctx, service } = await setup()
    const controller = new AbortController()
    service.extract.mockImplementationOnce(async () => {
      controller.abort()
      return extraction
    })

    const outcome = await runAutoDigitize(ctx, {
      method: 'lineformer',
      signal: controller.signal,
    })

    expect(outcome.status).toBe('cancelled')
    expect(outcome.stoppedAt).toBe('extract')
    expect(ctx.datasetRepository.datasets).toHaveLength(1)
    ctx.historyManager.undo()
    expectPristine(ctx)
  })

  test('cancelled during the calibration: nothing changes', async () => {
    const { ctx, service } = await setup()
    const controller = new AbortController()
    service.calibrate.mockImplementationOnce(async () => {
      controller.abort()
      return calibration()
    })

    const outcome = await runAutoDigitize(ctx, {
      method: 'lineformer',
      signal: controller.signal,
    })

    expect(outcome.status).toBe('cancelled')
    expect(outcome.stoppedAt).toBe('axes')
    expect(service.extract).not.toHaveBeenCalled()
    expectPristine(ctx)
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  test('an edit while waiting: the drafts become a step of their own', async () => {
    const { ctx, service } = await setup()
    service.extract.mockImplementationOnce(async () => {
      ctx.historyManager.capture('point.add')
      ctx.datasetRepository.activeDataset.addPoint(1, 1)
      return extraction
    })

    const outcome = await runAutoDigitize(ctx, { method: 'lineformer' })

    expect(outcome.status).toBe('done')
    expect(outcome.undoSteps).toBe(2)
    ctx.historyManager.undo() // the drafts
    ctx.historyManager.undo() // the point
    ctx.historyManager.undo() // the axes
    expectPristine(ctx)
  })

  test('refuses when the chosen method is not allowed', async () => {
    const { ctx, service } = await setup(['auto_axis', 'markernet'])

    const outcome = await runAutoDigitize(ctx, { method: 'lineformer' })

    expect(outcome.status).toBe('failed')
    expect(service.calibrate).not.toHaveBeenCalled()
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  test('refuses without Auto-place', async () => {
    const { ctx, service } = await setup(['lineformer'])

    const outcome = await runAutoDigitize(ctx, { method: 'lineformer' })

    expect(outcome.status).toBe('failed')
    expect(service.calibrate).not.toHaveBeenCalled()
  })
})

describe('autoDigitizeAxesProblem', () => {
  test('null when both axes are usable', () => {
    expect(
      autoDigitizeAxesProblem(parseCalibrationResponse(calibration())),
    ).toBeNull()
  })

  test('names the axis and the threshold can be set', () => {
    const proposal = parseCalibrationResponse(calibration(0.6))
    expect(autoDigitizeAxesProblem(proposal)).toBeNull()
    expect(autoDigitizeAxesProblem(proposal, 0.7)).toBe(
      'x axis: low confidence (0.60)',
    )
  })
})
