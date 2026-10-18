import {
  RESEARCH_EVENT_FORMAT,
  RESEARCH_EVENT_VERSION,
  ResearchEvent,
  ResearchEvents,
} from './researchEvents'

const t0 = new Date('2026-10-18T00:00:00.000Z')

describe('ResearchEvents', () => {
  test('off by default: without a listener nothing is built', () => {
    const events = new ResearchEvents()
    const build = jest.fn(() => ({ type: 'review.end' as const }))

    events.emit(build)

    expect(events.isEnabled).toBe(false)
    expect(build).not.toHaveBeenCalled()
  })

  test('fills in the base fields and counts per instance', () => {
    let importedAt: string | null = null
    let now = t0
    const events = new ResearchEvents(
      () => importedAt,
      () => now,
    )
    const received: ResearchEvent[] = []
    events.setListener((e) => received.push(e))

    events.emit({ type: 'edit', action: 'point.add' })
    importedAt = t0.toISOString()
    now = new Date(t0.getTime() + 1500)
    events.emit({ type: 'undo' })

    expect(received).toEqual([
      {
        format: RESEARCH_EVENT_FORMAT,
        version: RESEARCH_EVENT_VERSION,
        seq: 1,
        at: '2026-10-18T00:00:00.000Z',
        review_t_ms: null,
        type: 'edit',
        action: 'point.add',
      },
      {
        format: RESEARCH_EVENT_FORMAT,
        version: RESEARCH_EVENT_VERSION,
        seq: 2,
        at: '2026-10-18T00:00:01.500Z',
        review_t_ms: 1500,
        type: 'undo',
      },
    ])
  })

  test('a payload cannot override the base fields', () => {
    const events = new ResearchEvents()
    const received: ResearchEvent[] = []
    events.setListener((e) => received.push(e))

    events.emit({ type: 'redo', seq: 99, format: 'x' } as never)

    expect(received[0]).toMatchObject({
      seq: 1,
      format: RESEARCH_EVENT_FORMAT,
    })
  })

  test('hands over a frozen copy, not live objects', () => {
    const events = new ResearchEvents()
    const received: ResearchEvent[] = []
    events.setListener((e) => received.push(e))
    const summary = {
      points: { initial: 1 },
      events: { total: 0, undo: 0, redo: 0 },
    }

    events.emit({
      type: 'review.export',
      elapsed_ms: 10,
      summary: summary as never,
    })
    summary.points.initial = 42

    const event = received[0] as Extract<
      ResearchEvent,
      { type: 'review.export' }
    >
    expect(event.summary.points.initial).toBe(1)
    expect(Object.isFrozen(event)).toBe(true)
    expect(Object.isFrozen(event.summary.points)).toBe(true)
  })

  test('a throwing listener is logged and does not propagate', () => {
    const events = new ResearchEvents()
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    events.setListener(() => {
      throw new Error('host bug')
    })

    expect(() => events.emit({ type: 'undo' })).not.toThrow()
    expect(error).toHaveBeenCalledTimes(1)
    error.mockRestore()
  })

  test('setListener(null) turns it off again', () => {
    const events = new ResearchEvents()
    const listener = jest.fn()
    events.setListener(listener)
    events.setListener(null)

    events.emit({ type: 'undo' })

    expect(events.isEnabled).toBe(false)
    expect(listener).not.toHaveBeenCalled()
  })
})
