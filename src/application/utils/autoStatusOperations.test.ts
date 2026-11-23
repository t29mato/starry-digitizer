import {
  configureAutoService,
  outsideHoursNote,
  refreshAutoStatus,
  supportedHoursText,
  watchAutoStatus,
  withOutsideHoursNote,
} from './autoFeatureOperations'
import { createDigitizerContext } from '@/application/digitizerContext'
import { AutoService } from '@/application/services/autoService/autoService'
import {
  parseAutoStatusResponse,
  parseExtractionMethodsResponse,
} from '@/application/services/autoService/autoServiceWire'

// INFO: the wpd-auto backend's `auto` object (hours.py `status()`)
const OUTSIDE = {
  available: false,
  hours: '09:00-17:00',
  timezone: 'Asia/Tokyo',
  next_change: '2026-11-24T09:00:00+09:00',
}

const METHODS_BODY = {
  methods: [
    {
      id: 'markernet',
      label: 'MarkerNet',
      description: 'markers',
      available: true,
      unavailable_reason: null,
      license: 'non-commercial',
      attribution: 'PlotQA (CC BY 4.0)',
      params: [],
    },
    {
      id: 'lineformer',
      label: 'LineFormer',
      description: 'lines',
      available: false,
      unavailable_reason: 'service_unavailable',
      license: null,
      attribution: null,
      params: [],
    },
    { id: 'broken' },
  ],
  auto: OUTSIDE,
}

const service = (extra: Partial<AutoService> = {}): AutoService => ({
  capabilities: async () => ['markernet'],
  calibrate: jest.fn(),
  extract: jest.fn(),
  ...extra,
})

describe('extract/methods and auto/status answers', () => {
  test('methods keep the documented fields and drop odd entries', () => {
    const { methods, hours } = parseExtractionMethodsResponse(METHODS_BODY)
    expect(methods.map((m) => m.id)).toEqual(['markernet', 'lineformer'])
    expect(methods[1]).toMatchObject({
      available: false,
      unavailableReason: 'service_unavailable',
      license: null,
    })
    expect(hours).toEqual({
      available: false,
      hours: '09:00-17:00',
      timezone: 'Asia/Tokyo',
      nextChange: '2026-11-24T09:00:00+09:00',
    })
  })

  test('no methods array is an odd answer', () => {
    expect(() => parseExtractionMethodsResponse({})).toThrow(/methods/)
  })

  test('a backend without hours has no `auto`', () => {
    expect(parseAutoStatusResponse({ auto: null })).toBeNull()
    expect(parseAutoStatusResponse({ auto: OUTSIDE })?.available).toBe(false)
  })
})

describe('refreshAutoStatus', () => {
  test('configuring a service also reads the methods and the hours', async () => {
    const ctx = createDigitizerContext()
    await configureAutoService(
      ctx,
      service({ methods: async () => METHODS_BODY }),
    )
    expect(ctx.autoFeatures.methodInfo('lineformer')?.unavailableReason).toBe(
      'service_unavailable',
    )
    expect(ctx.autoFeatures.outsideHours).toBe(true)
  })

  test('status() alone gives the hours', async () => {
    const ctx = createDigitizerContext()
    await configureAutoService(
      ctx,
      service({
        status: async () => ({ auto: { ...OUTSIDE, available: true } }),
      }),
    )
    expect(ctx.autoFeatures.methods).toEqual([])
    expect(ctx.autoFeatures.hours?.available).toBe(true)
    expect(ctx.autoFeatures.outsideHours).toBe(false)
  })

  test('a failure leaves the details empty, silently, and the features alone', async () => {
    const ctx = createDigitizerContext()
    await configureAutoService(
      ctx,
      service({ methods: () => Promise.reject(new Error('502')) }),
    )
    expect(ctx.autoFeatures.methods).toEqual([])
    expect(ctx.autoFeatures.hours).toBeNull()
    expect(ctx.autoFeatures.features).toEqual(['markernet'])
  })

  test('an answer for a replaced service is dropped', async () => {
    const ctx = createDigitizerContext()
    let answer: (body: unknown) => void = () => {}
    ctx.autoFeatures.setService(
      service({ methods: () => new Promise((resolve) => (answer = resolve)) }),
    )
    const pending = refreshAutoStatus(ctx)
    ctx.autoFeatures.setService(service())
    answer(METHODS_BODY)
    await pending
    expect(ctx.autoFeatures.methods).toEqual([])
  })
})

describe('outsideHoursNote', () => {
  test('only outside the hours', async () => {
    const ctx = createDigitizerContext()
    expect(outsideHoursNote(ctx)).toBe('')
    ctx.autoFeatures.setStatus(null, parseAutoStatusResponse({ auto: OUTSIDE }))
    expect(outsideHoursNote(ctx)).toBe(
      'Automatic features are supported 09:00–17:00 (Asia/Tokyo); outside those hours some of them are off.',
    )
    ctx.autoFeatures.setStatus(
      null,
      parseAutoStatusResponse({ auto: { ...OUTSIDE, available: true } }),
    )
    expect(outsideHoursNote(ctx)).toBe('')
  })
})

describe('withOutsideHoursNote', () => {
  test('a full stop between a bare backend detail and the note (seen in a browser, 2026-11-24)', () => {
    const ctx = createDigitizerContext()
    ctx.autoFeatures.setStatus(null, parseAutoStatusResponse({ auto: OUTSIDE }))
    expect(
      withOutsideHoursNote(
        ctx,
        'The auto service failed (HTTP 503, method_unavailable: weights_missing) — WPD_AUTO_MARKERNET_WEIGHTS is not set',
      ),
    ).toBe(
      'The auto service failed (HTTP 503, method_unavailable: weights_missing) — WPD_AUTO_MARKERNET_WEIGHTS is not set. Automatic features are supported 09:00–17:00 (Asia/Tokyo); outside those hours some of them are off.',
    )
    expect(withOutsideHoursNote(ctx, 'Timed out. ')).toBe(
      'Timed out. Automatic features are supported 09:00–17:00 (Asia/Tokyo); outside those hours some of them are off.',
    )
  })

  test('the message alone inside the hours', () => {
    const ctx = createDigitizerContext()
    expect(withOutsideHoursNote(ctx, 'It failed')).toBe('It failed')
    ctx.autoFeatures.setStatus(
      null,
      parseAutoStatusResponse({ auto: { ...OUTSIDE, available: true } }),
    )
    expect(withOutsideHoursNote(ctx, 'It failed')).toBe('It failed')
  })
})

describe('supportedHoursText', () => {
  test('inside and outside the hours alike; nothing without hours', () => {
    expect(supportedHoursText(parseAutoStatusResponse({ auto: OUTSIDE }))).toBe(
      'Automatic features are supported 09:00–17:00 (Asia/Tokyo). Manual digitizing works at any time.',
    )
    expect(
      supportedHoursText(
        parseAutoStatusResponse({ auto: { ...OUTSIDE, available: true } }),
      ),
    ).toBe(
      'Automatic features are supported 09:00–17:00 (Asia/Tokyo). Manual digitizing works at any time.',
    )
    expect(supportedHoursText(null)).toBe('')
    expect(
      supportedHoursText(
        parseAutoStatusResponse({ auto: { ...OUTSIDE, hours: null } }),
      ),
    ).toBe('')
  })
})

describe('watchAutoStatus', () => {
  afterEach(() => jest.useRealTimers())

  test('asks again every interval, and just after the next change when that is sooner', async () => {
    jest.useFakeTimers()
    const ctx = createDigitizerContext()
    const capabilities = jest.fn(async () => ['markernet'])
    ctx.autoFeatures.setService(service({ capabilities }))
    const now = Date.parse('2026-11-24T08:59:00+09:00')
    ctx.autoFeatures.setStatus(null, parseAutoStatusResponse({ auto: OUTSIDE }))
    const stop = watchAutoStatus(ctx, 5 * 60 * 1000, () => now)
    // INFO: 60 s to 09:00 + 5 s
    await jest.advanceTimersByTimeAsync(64000)
    expect(capabilities).not.toHaveBeenCalled()
    await jest.advanceTimersByTimeAsync(1000)
    expect(capabilities).toHaveBeenCalledTimes(1)
    stop()
    await jest.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(capabilities).toHaveBeenCalledTimes(1)
  })

  test('asks again when the tab is shown', async () => {
    const ctx = createDigitizerContext()
    const capabilities = jest.fn(async () => ['markernet'])
    ctx.autoFeatures.setService(service({ capabilities }))
    const stop = watchAutoStatus(ctx)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(capabilities).toHaveBeenCalledTimes(1)
    stop()
  })
})
