import { ReviewSession } from './reviewSession'
import { ReviewState } from '@/application/utils/editLogDiff'
import { AUTO_EXTRACTION_VERSION } from '@/application/dto/autoExtractionDTO'

const state = (): ReviewState => ({
  axes: {
    calibrated: false,
    x1: { xPx: -999, yPx: -999, value: 0 },
    x2: { xPx: -999, yPx: -999, value: 1 },
    y1: { xPx: -999, yPx: -999, value: 0 },
    y2: { xPx: -999, yPx: -999, value: 1 },
    xIsLogScale: false,
    yIsLogScale: false,
  },
  series: [
    {
      label: 'A',
      points: [{ id: 1, xPx: 1, yPx: 1, origin: { series: 0, index: 0 } }],
    },
  ],
})

const final = { version: AUTO_EXTRACTION_VERSION, series: [] } as const
const t0 = new Date('2026-10-09T00:00:00.000Z')
const at = (ms: number) => new Date(t0.getTime() + ms)

describe('ReviewSession', () => {
  test('inactive until started; records nothing while inactive', () => {
    const session = new ReviewSession()
    session.record('point.add')
    expect(session.isActive).toBe(false)
    expect(session.toDTO()).toBeNull()
    expect(session.diff(state())).toBeNull()
    expect(session.buildEditLog(state(), { ...final, series: [] })).toBeNull()
  })

  test('keeps its own copy of the initial state', () => {
    const session = new ReviewSession()
    const initial = state()
    session.start(initial, null, null, [], t0)
    initial.series[0].points[0].xPx = 99
    expect(session.data?.initialState.series[0].points[0].xPx).toBe(1)
  })

  test('builds an edit log with timing, events and the diff', () => {
    const session = new ReviewSession()
    session.start(state(), { extractor: 'llm' }, null, ['w'], t0)
    session.record('point.delete', at(1000))
    session.record('undo', at(2000))
    session.record('redo', at(3000))

    const current = state()
    current.series[0].points[0].xPx = 4
    const log = session.buildEditLog(current, { ...final, series: [] }, at(5000))

    expect(log).toMatchObject({
      format: 'starry-digitizer/edit-log',
      version: 1,
      source: { extractor: 'llm' },
      imported_at: '2026-10-09T00:00:00.000Z',
      exported_at: '2026-10-09T00:00:05.000Z',
      elapsed_ms: 5000,
      move_tolerance_px: 0.5,
      events: [
        { t_ms: 1000, action: 'point.delete' },
        { t_ms: 2000, action: 'undo' },
        { t_ms: 3000, action: 'redo' },
      ],
    })
    expect(log?.summary.events).toEqual({ total: 3, undo: 1, redo: 1 })
    expect(log?.summary.points.moved).toBe(1)
    expect(session.diff(current)?.summary.points.moved).toBe(1)
  })

  test('round-trips through toDTO/restore and clears', () => {
    const session = new ReviewSession()
    session.start(state(), null, null, [], t0)
    session.record('point.add', at(10))
    const dto = session.toDTO()

    const restored = new ReviewSession()
    restored.restore(dto)
    expect(restored.data).toEqual(session.data)

    restored.restore(undefined)
    expect(restored.isActive).toBe(false)
    session.clear()
    expect(session.isActive).toBe(false)
  })
})
