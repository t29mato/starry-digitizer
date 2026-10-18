import { TRACE_ACTION, traceCurveAt } from './curveTraceOperations'
import {
  createDigitizerContext,
  DigitizerContext,
} from '@/application/digitizerContext'
import { PixelSource } from '@/application/ports/pixelSource'
import { MANUAL_MODE } from '@/constants'

// A 200×60 white image with a red horizontal line (y = 30..31, x = 20..180)
function source(withMask = false): PixelSource {
  const width = 200
  const height = 60
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255)
  for (let x = 20; x <= 180; x++) {
    for (const y of [30, 31]) {
      pixels.set([220, 20, 20, 255], (y * width + x) * 4)
    }
  }
  const mask = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < 100; x++)
      mask.set([255, 255, 0, 255], (y * width + x) * 4)
  }
  return {
    width,
    height,
    getImagePixels: () => pixels,
    getMaskPixels: () => mask,
    hasMask: withMask,
  }
}

describe('traceCurveAt', () => {
  let ctx: DigitizerContext
  let actions: string[]

  beforeEach(() => {
    ctx = createDigitizerContext()
    actions = []
    ctx.historyManager.subscribe((change) => {
      if (change.type === 'capture') actions.push(change.action ?? '')
    })
    ctx.extractor.setColorDistancePct(5)
  })

  test('adds the traced points as ONE undo step named points.trace', () => {
    ctx.datasetRepository.activeDataset.addPoint(5, 5)
    const outcome = traceCurveAt(ctx, { xPx: 100, yPx: 31 }, source())
    expect(TRACE_ACTION).toBe('points.trace')
    expect(actions).toEqual(['points.trace'])
    expect(outcome.added).toBeGreaterThan(10)
    expect(outcome.colorHex).toBe('#dc1414')
    expect(outcome.stops).toEqual(['end', 'end'])
    const dataset = ctx.datasetRepository.activeDataset
    expect(dataset.points).toHaveLength(1 + outcome.added)
    // the whole trace is selected, the earlier point is not
    expect(dataset.activePointIds).toHaveLength(outcome.added)
    expect(dataset.activePointIds).not.toContain(dataset.points[0].id)
    expect(ctx.curveTrace.lastOutcome).toEqual(outcome)

    ctx.historyManager.undo()
    expect(ctx.datasetRepository.activeDataset.points).toHaveLength(1)
    ctx.historyManager.redo()
    expect(ctx.datasetRepository.activeDataset.points).toHaveLength(
      1 + outcome.added,
    )
  })

  test('respects the drawn mask and the spacing setting', () => {
    ctx.curveTrace.setSpacingPx(20)
    const outcome = traceCurveAt(ctx, { xPx: 50, yPx: 31 }, source(true))
    expect(outcome.stops?.[1]).toBe('mask')
    const xs = ctx.datasetRepository.activeDataset.points.map((p) => p.xPx)
    expect(Math.max(...xs)).toBeLessThanOrEqual(101)
    expect(xs.length).toBeLessThanOrEqual(6)
  })

  test('a click on the background adds nothing and captures nothing', () => {
    const outcome = traceCurveAt(ctx, { xPx: 100, yPx: 5 }, source())
    expect(outcome.added).toBe(0)
    expect(outcome.error).toBeDefined()
    expect(actions).toEqual([])
    expect(ctx.historyManager.canUndo).toBe(false)
    expect(ctx.datasetRepository.activeDataset.points).toHaveLength(0)
  })

  test('the Color Settings colour can be followed instead of the click', () => {
    ctx.extractor.setColorPicker('#0000ffff')
    ctx.curveTrace.setColorSource('picker')
    const outcome = traceCurveAt(ctx, { xPx: 100, yPx: 31 }, source())
    expect(outcome.added).toBe(0)
    expect(outcome.colorHex).toBe('#0000ff')
  })

  test('settings are clamped', () => {
    ctx.curveTrace.setMaxGapPx(1e6)
    ctx.curveTrace.setSpacingPx(0)
    expect(ctx.curveTrace.maxGapPx).toBe(100)
    expect(ctx.curveTrace.spacingPx).toBe(1)
  })

  test('a project saved in Trace mode reopens in Add mode', () => {
    ctx.canvasHandler.setManualMode(MANUAL_MODE.TRACE)
    expect(ctx.projectService.toProjectDTO().canvasHandler?.manualMode).toBe(
      MANUAL_MODE.ADD,
    )
  })
})
