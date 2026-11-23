import { configureResearchEvents } from './researchEventOperations'
import {
  buildEditLog,
  endReview,
  loadAutoExtraction,
} from './autoExtractionOperations'
import { goToLowConfidencePoint } from './confidenceReviewOperations'
import { applyAutoCalibration } from './autoCalibrationOperations'
import { applyServerExtraction } from './serverExtractionOperations'
import { runAutoDigitize } from './autoDigitizeOperations'
import { configureAutoService } from './autoFeatureOperations'
import { recordExport } from './researchEventOperations'
import {
  parseCalibrationResponse,
  parseExtractionResponse,
} from '@/application/services/autoService/autoServiceWire'
import { addPoint, deletePoint } from './pointOperations'
import {
  createDigitizerContext,
  DigitizerContext,
} from '@/application/digitizerContext'
import { ResearchEvent } from '@/application/services/researchEvents/researchEvents'

// INFO: a document whose labels and source are the kind of thing that must
// NOT reach a research event (sample names, user ids, image data). No
// `image.url`: jsdom cannot decode one, and the image is not what is tested.
const doc = {
  version: 1,
  axes: {
    x: {
      scale: 'linear',
      ticks: [
        { px: 100, value: 0 },
        { px: 300, value: 10 },
      ],
    },
    y: {
      scale: 'linear',
      ticks: [
        { px: 400, value: 0 },
        { px: 200, value: 10 },
      ],
    },
  },
  series: [
    {
      label: 'Sample-Bi2Te3-yamada',
      points_px: [
        [150, 350],
        [250, 250],
      ],
      scores: [0.9, 0.1],
    },
    { label: 'Sample-B', points_px: [[123, 321]] },
  ],
  source: {
    extractor: 'markernet-v2',
    user: 'yamada@example.org',
    thumbnail: 'data:image/png;base64,SECRETIMAGE',
  },
}

describe('research events (host hook)', () => {
  let ctx: DigitizerContext
  let events: ResearchEvent[]

  beforeEach(() => {
    ctx = createDigitizerContext()
    events = []
  })

  const load = () => loadAutoExtraction(ctx, doc)

  test('off by default: nothing is built or counted without a listener', async () => {
    // INFO: the proof is the counter — emit() returns before numbering
    // when nobody listens, so a listener set afterwards starts at seq 1
    addPoint(ctx, { xPx: 10, yPx: 10 })
    ctx.historyManager.undo()
    expect(ctx.researchEvents.isEnabled).toBe(false)
    jest
      .spyOn(ctx.canvasHandler, 'scrollToCoord')
      .mockImplementation(() => undefined)
    await load()
    goToLowConfidencePoint(ctx, 1)
    buildEditLog(ctx)
    endReview(ctx)

    configureResearchEvents(ctx, (e) => events.push(e))
    addPoint(ctx, { xPx: 10, yPx: 10 })
    expect(events.map((e) => e.seq)).toEqual([1])
  })

  test('edits, undo and redo are passed on by name', () => {
    configureResearchEvents(ctx, (e) => events.push(e))

    const id = addPoint(ctx, { xPx: 10, yPx: 10 })
    deletePoint(ctx, id)
    ctx.historyManager.undo()
    ctx.historyManager.redo()

    expect(
      events.map((e) => [e.type, 'action' in e ? e.action : null]),
    ).toEqual([
      ['edit', 'point.add'],
      ['edit', 'point.delete'],
      ['undo', null],
      ['redo', null],
    ])
    expect(events.map((e) => e.seq)).toEqual([1, 2, 3, 4])
    expect(events.every((e) => e.review_t_ms === null)).toBe(true)
  })

  test('a review: import, Review Points, export and end', async () => {
    configureResearchEvents(ctx, (e) => events.push(e))
    jest
      .spyOn(ctx.canvasHandler, 'scrollToCoord')
      .mockImplementation(() => undefined)

    await load()
    goToLowConfidencePoint(ctx, 1)
    deletePoint(ctx, ctx.datasetRepository.activeDataset.activePointIds[0])
    goToLowConfidencePoint(ctx, 1)
    buildEditLog(ctx)
    endReview(ctx)

    expect(events.map((e) => e.type)).toEqual([
      'review.start',
      'review.step',
      'edit',
      'review.step',
      'review.export',
      'review.end',
    ])
    expect(events[0]).toMatchObject({ series: 2, points: 3, warnings: 0 })
    expect(events[1]).toMatchObject({
      direction: 1,
      found: true,
      score: 0.1,
      threshold: 0.5,
    })
    expect(events[3]).toMatchObject({ found: false, score: null })
    expect(events[4]).toMatchObject({
      summary: {
        points: { initial: 3, deleted: 1 },
        events: { total: 1 },
      },
    })
    expect(events.every((e) => typeof e.review_t_ms === 'number')).toBe(true)
  })

  test('no image data, coordinates, names or source in any event', async () => {
    configureResearchEvents(ctx, (e) => events.push(e))
    jest
      .spyOn(ctx.canvasHandler, 'scrollToCoord')
      .mockImplementation(() => undefined)

    await load()
    goToLowConfidencePoint(ctx, 1)
    addPoint(ctx, { xPx: 77, yPx: 88 })
    ctx.datasetRepository.activeDataset.name = 'renamed-by-user'
    buildEditLog(ctx)
    endReview(ctx)

    // INFO: times are numbers that could collide with a coordinate below
    const text = JSON.stringify(
      events.map((e) => ({
        ...e,
        review_t_ms: null,
        elapsed_ms: null,
        at: null,
      })),
    )
    ;[
      'SECRETIMAGE',
      'data:',
      'yamada',
      'Sample-',
      'renamed-by-user',
      'markernet-v2',
      '"px"',
      'xPx',
      '"details"',
      // INFO: the edit log's `final` document (an object); the summary's
      // `final` counts are numbers and fine
      '"final":{',
      '"source"',
    ].forEach((needle) => expect(text).not.toContain(needle))
    // INFO: and no point coordinate leaks as a bare number either
    ;['150', '350', '250', '123', '321', '77', '88'].forEach((n) =>
      expect(text).not.toMatch(new RegExp(`[:\\[,]${n}[,\\]}]`)),
    )
  })

  test('configureResearchEvents(ctx, null) stops the events', () => {
    const listener = jest.fn()
    configureResearchEvents(ctx, listener)
    configureResearchEvents(ctx, null)

    addPoint(ctx, { xPx: 1, yPx: 1 })

    expect(listener).not.toHaveBeenCalled()
  })

  test('two contexts do not share a listener', () => {
    const other = createDigitizerContext()
    const listener = jest.fn()
    configureResearchEvents(ctx, listener)

    addPoint(other, { xPx: 1, yPx: 1 })

    expect(listener).not.toHaveBeenCalled()
  })

  // INFO: the automatic features and exports report what happened, counted
  // — the host reads coordinates off the context itself if it wants them
  test('Auto-place, Extract, Auto digitize and exports: counts and fixed names only', async () => {
    configureResearchEvents(ctx, (e) => events.push(e))
    ctx.canvasHandler.setUploadImageUrl('data:image/png;base64,aGVsbG8=')
    const proposal = parseCalibrationResponse({
      status: 'ok',
      frames: [
        {
          box: { x0: 9.5, y0: 9.5, x1: 99.5, y1: 99.5 },
          axes: {
            x: {
              status: 'ok',
              scale: 'linear',
              ticks: [
                { value: 0, px: 9.5 },
                { value: 10, px: 99.5 },
              ],
              confidence: 0.8,
            },
            y: {
              status: 'ok',
              scale: 'log',
              ticks: [
                { value: 1, px: 99.5 },
                { value: 100, px: 9.5 },
              ],
            },
          },
        },
      ],
    })
    applyAutoCalibration(ctx, proposal)
    const ids = applyServerExtraction(
      ctx,
      parseExtractionResponse({
        series: [{ label: 'Sample-yamada', points: [[20.5, 30.5]] }],
      }),
      'markernet',
    )
    recordExport(ctx, 'copy', 'dataset', ctx.datasetRepository.datasets)
    await configureAutoService(ctx, {
      capabilities: async () => ['auto_axis', 'markernet'],
      calibrate: async () => {
        throw new Error('down')
      },
      extract: async () => ({ series: [] }),
    })
    await runAutoDigitize(ctx, { method: 'markernet' })

    const auto = events.filter((e) => e.type !== 'edit')
    expect(auto).toEqual([
      expect.objectContaining({
        type: 'auto_place.apply',
        action: 'axis.auto-place',
        axes: ['x', 'y'],
        status: 'ok',
        x: {
          ok: true,
          scale: 'linear',
          ticks: 2,
          confidence: 0.8,
          failure: null,
        },
        y: {
          ok: true,
          scale: 'log',
          ticks: 2,
          confidence: null,
          failure: null,
        },
      }),
      expect.objectContaining({
        type: 'extraction.apply',
        method: 'markernet',
        source: 'extract',
        action: 'extract.server',
        series: 1,
        points: 1,
        datasets: ids,
        replaced: 0,
      }),
      expect.objectContaining({
        type: 'export',
        kind: 'copy',
        scope: 'dataset',
        datasets: 1,
        points: 1,
      }),
      expect.objectContaining({
        type: 'auto_digitize.end',
        method: 'markernet',
        status: 'failed',
        stopped_at: 'axes',
        applied_axes: [],
        series: 0,
        points: 0,
        undo_steps: 0,
      }),
    ])
    const text = JSON.stringify(events)
    expect(text).not.toContain('yamada')
    expect(text).not.toContain('20.5')
    expect(text).not.toContain('aGVsbG8')
  })
})
