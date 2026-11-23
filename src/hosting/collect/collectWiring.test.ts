import { nextTick } from 'vue'
import {
  createDigitizerContext,
  DigitizerContext,
} from '@/application/digitizerContext'
import {
  parseCalibrationResponse,
  parseExtractionResponse,
} from '@/application/services/autoService/autoServiceWire'
import { applyAutoCalibration } from '@/application/utils/autoCalibrationOperations'
import { applyServerExtraction } from '@/application/utils/serverExtractionOperations'
import { recordExport } from '@/application/utils/researchEventOperations'
import { CollectClient } from './collectClient'
import {
  attachCollector,
  createCollectingAutoService,
  decodeDataUrl,
  ServiceCalls,
} from './collectWiring'
import { sha256Hex } from './sha256'

const PNG = 'data:image/png;base64,aGVsbG8='

const calibration = {
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
            { value: 10, px: 499.5 },
          ],
          confidence: 0.9,
        },
        y: { status: 'failed', reason: 'no_labels_read' },
      },
    },
  ],
}

type Recorded = { type: string; data: Record<string, unknown> }

function fakeClient() {
  const recorded: Recorded[] = []
  const client = {
    record: jest.fn((type: string, data: Record<string, unknown> = {}) => {
      recorded.push({ type, data })
    }),
    addImage: jest.fn((bytes: Uint8Array) => sha256Hex(bytes)),
    flushOnHide: jest.fn(),
    headers: () => ({ 'X-WPD-App': 'starry-digitizer' }),
  }
  return { client: client as unknown as CollectClient, recorded, mock: client }
}

describe('attachCollector', () => {
  let ctx: DigitizerContext
  let calls: ServiceCalls

  beforeEach(() => {
    jest.useFakeTimers()
    ctx = createDigitizerContext()
    calls = { calibrate: null, extract: null }
  })
  afterEach(() => jest.useRealTimers())

  it('records session.start and forwards the library events by their own type', () => {
    const { client, recorded } = fakeClient()
    attachCollector(ctx, client, calls)
    ctx.historyManager.capture('point.add')
    ctx.historyManager.undo()
    expect(recorded[0].type).toBe('session.start')
    expect(recorded[0].data).toMatchObject({
      user_agent: expect.any(String),
      viewport: { width: expect.any(Number), height: expect.any(Number) },
      path: expect.any(String),
    })
    expect(recorded.slice(1)).toEqual([
      {
        type: 'edit',
        data: { action: 'point.add', review_t_ms: null, sd_seq: 1 },
      },
      { type: 'undo', data: { review_t_ms: null, sd_seq: 2 } },
    ])
  })

  it('hands each new image to the client with the file name', async () => {
    const { client, mock } = fakeClient()
    const wiring = attachCollector(ctx, client, calls)
    // INFO: the real order: the canvas has the image first, then
    // ImageSettings emits image-replaced with the file
    ctx.canvasHandler.setUploadImageUrl(PNG)
    await nextTick()
    wiring.noteFile(
      new File([new Uint8Array(5)], 'figure 1.png', { type: 'image/png' }),
    )
    jest.advanceTimersByTime(0)
    expect(mock.addImage).toHaveBeenCalledWith(
      Uint8Array.from(Buffer.from('hello')),
      {
        type: 'image/png',
        name: 'figure 1.png',
        width: expect.any(Number),
        height: expect.any(Number),
      },
    )
  })

  it('calibration.auto on Apply, then calibration.final (auto, then edit)', async () => {
    const { client, recorded } = fakeClient()
    attachCollector(ctx, client, calls, { calibrationDebounceMs: 100 })
    ctx.canvasHandler.setUploadImageUrl(PNG)
    await nextTick()
    jest.advanceTimersByTime(0)
    calls.calibrate = {
      requestId: '11111111-1111-4111-8111-111111111111',
      ms: 42,
      ok: true,
      request: null,
    }
    applyAutoCalibration(ctx, parseCalibrationResponse(calibration))
    const auto = recorded.find((r) => r.type === 'calibration.auto')
    expect(auto?.data).toMatchObject({
      request_id: '11111111-1111-4111-8111-111111111111',
      ms: 42,
      action: 'axis.auto-place',
      applied: ['x'],
      x: {
        ok: true,
        scale: 'linear',
        ticks: 2,
        confidence: 0.9,
        failure: null,
      },
      y: { ok: false, ticks: 0 },
      placement: [
        { label: 'X1', px: 100, py: 400, value: 0 },
        { label: 'X2', px: 500, py: 400, value: 10 },
      ],
      view: { sha256: sha256Hex(Uint8Array.from(Buffer.from('hello'))) },
    })

    await nextTick()
    jest.advanceTimersByTime(100)
    const finals = () => recorded.filter((r) => r.type === 'calibration.final')
    expect(finals()).toHaveLength(1)
    expect(finals()[0].data).toMatchObject({
      mode: 'auto',
      auto_request_id: '11111111-1111-4111-8111-111111111111',
      x_log: false,
      point_mode: 'four_points',
      points: [
        { label: 'X1', px: 100, py: 400, value: 0 },
        { label: 'X2', px: 500, py: 400, value: 10 },
      ],
    })

    ctx.axisSetRepository.activeAxisSet.setX2Value(20)
    await nextTick()
    jest.advanceTimersByTime(100)
    expect(finals()).toHaveLength(2)
    expect(finals()[1].data.mode).toBe('edit')
  })

  it('a hand-made calibration is manual; nothing for an empty one', async () => {
    const { client, recorded } = fakeClient()
    const wiring = attachCollector(ctx, client, calls, {
      calibrationDebounceMs: 100,
    })
    const axisSet = ctx.axisSetRepository.activeAxisSet
    axisSet.y1.coord = { xPx: 10, yPx: 300 }
    axisSet.setY1Value(1)
    axisSet.setYIsLogScale(true)
    await nextTick()
    // INFO: the tab is hidden before the debounce: recorded at once
    wiring.flushPending()
    const finals = recorded.filter((r) => r.type === 'calibration.final')
    expect(finals).toHaveLength(1)
    expect(finals[0].data).toMatchObject({
      mode: 'manual',
      auto_request_id: null,
      y_log: true,
      points: [{ label: 'Y1', px: 10, py: 300, value: 1 }],
    })
  })

  it('extraction.result names the request and the drafts it made', () => {
    const { client, recorded } = fakeClient()
    attachCollector(ctx, client, calls)
    calls.extract = {
      requestId: '22222222-2222-4222-8222-222222222222',
      ms: 7,
      ok: true,
      request: { method: 'markernet', area: null, params: { threshold: 0.4 } },
    }
    const result = parseExtractionResponse({
      method: 'markernet',
      series: [
        {
          label: 'circle',
          points: [
            [9.5, 9.5],
            [19.5, 9.5],
          ],
        },
        { label: 'square', points: [[49.5, 59.5]] },
      ],
    })
    const ids = applyServerExtraction(ctx, result, 'markernet')
    const record = recorded.find((r) => r.type === 'extraction.result')
    expect(record?.data).toMatchObject({
      request_id: '22222222-2222-4222-8222-222222222222',
      method: 'markernet',
      source: 'extract',
      query: { params: { threshold: 0.4 } },
      series: 2,
      points: 3,
      drafts: [
        {
          series_index: 0,
          dataset_id: ids[0],
          name: 'circle (markernet)',
          points: 2,
        },
        {
          series_index: 1,
          dataset_id: ids[1],
          name: 'square (markernet)',
          points: 1,
        },
      ],
      action: 'extract.server',
    })
  })

  it('export carries counts, never values', () => {
    const { client, recorded } = fakeClient()
    attachCollector(ctx, client, calls)
    ctx.datasetRepository.activeDataset.addPoint(10, 20)
    recordExport(ctx, 'copy', 'dataset', [ctx.datasetRepository.activeDataset])
    const record = recorded.find((r) => r.type === 'export')
    expect(record?.data).toEqual({
      kind: 'copy',
      scope: 'dataset',
      datasets: 1,
      points: 1,
      starrydata: null,
      view: { sha256: null, width: 0, height: 0 },
    })
    // INFO: like wpd-auto's export record, the image's SID / Fig. (F18)
    ctx.starrydataRef.set({ sid: '12345', figure: '3(b)' })
    recordExport(ctx, 'project', 'project', ctx.datasetRepository.datasets)
    expect(recorded.filter((r) => r.type === 'export')[1].data).toMatchObject({
      kind: 'project',
      starrydata: { sid: '12345', figure: '3(b)' },
    })
  })

  it('detach stops listening', () => {
    const { client, recorded } = fakeClient()
    attachCollector(ctx, client, calls).detach()
    ctx.historyManager.capture('point.add')
    expect(recorded.map((r) => r.type)).toEqual(['session.start'])
    expect(ctx.researchEvents.isEnabled).toBe(false)
  })

  describe('starrydata.ref (F18)', () => {
    const NOW = new Date('2026-11-24T01:02:03.004Z')
    const attach = (client: CollectClient) =>
      attachCollector(ctx, client, calls, {
        starrydataDebounceMs: 1500,
        now: () => NOW,
      })
    const refs = (recorded: Recorded[]) =>
      recorded.filter((r) => r.type === 'starrydata.ref')

    it('one record 1.5 s after typing stopped, with the value before', async () => {
      const { client, recorded } = fakeClient()
      attach(client)
      ctx.canvasHandler.setUploadImageUrl(PNG)
      await nextTick()
      jest.advanceTimersByTime(0)
      for (const sid of ['1', '12', '123']) {
        ctx.starrydataRef.set({ sid })
        await nextTick()
        jest.advanceTimersByTime(500)
      }
      ctx.starrydataRef.set({ figure: ' 3(b) ' })
      await nextTick()
      jest.advanceTimersByTime(1499)
      expect(refs(recorded)).toHaveLength(0)
      jest.advanceTimersByTime(1)
      expect(refs(recorded)).toHaveLength(1)
      expect(refs(recorded)[0].data).toEqual({
        file_index: 0,
        page: null,
        file_sha256: sha256Hex(Uint8Array.from(Buffer.from('hello'))),
        sid: '123',
        figure: '3(b)',
        previous: { sid: '', figure: '' },
        sid_numeric: true,
        client_time: '2026-11-24T01:02:03.004Z',
        view: expect.objectContaining({ sha256: expect.any(String) }),
      })

      ctx.starrydataRef.set({ sid: 'S-9' })
      await nextTick()
      jest.advanceTimersByTime(1500)
      expect(refs(recorded)[1].data).toMatchObject({
        sid: 'S-9',
        previous: { sid: '123', figure: '3(b)' },
        sid_numeric: false,
      })
    })

    it('nothing for a load, an undo, or a change taken back', async () => {
      const { client, recorded } = fakeClient()
      attach(client)
      ctx.projectService.restoreProject({
        ...ctx.projectService.toProjectDTO(),
        starrydata: { sid: '42', figure: '1' },
      })
      await nextTick()
      jest.advanceTimersByTime(2000)
      ctx.historyManager.capture('point.add')
      ctx.historyManager.undo()
      await nextTick()
      jest.advanceTimersByTime(2000)
      ctx.starrydataRef.set({ sid: '420' })
      await nextTick()
      ctx.starrydataRef.set({ sid: '42' })
      await nextTick()
      jest.advanceTimersByTime(2000)
      expect(ctx.starrydataRef.sid).toBe('42')
      expect(refs(recorded)).toHaveLength(0)
    })

    it('a pending change is recorded before a reload', async () => {
      const { client, recorded } = fakeClient()
      const wiring = attach(client)
      ctx.starrydataRef.set({ sid: '7' })
      await nextTick()
      wiring.recordPending()
      expect(refs(recorded)).toHaveLength(1)
      expect(refs(recorded)[0].data.file_sha256).toBeNull()
      jest.advanceTimersByTime(2000)
      expect(refs(recorded)).toHaveLength(1)
    })
  })

  it('records the hidden tab and flushes the client', async () => {
    const { client, mock } = fakeClient()
    attachCollector(ctx, client, calls)
    window.dispatchEvent(new Event('pagehide'))
    expect(mock.flushOnHide).toHaveBeenCalled()
  })
})

describe('createCollectingAutoService', () => {
  it('sends the page headers and a request id of its own per call', async () => {
    const seen: Record<string, string>[] = []
    const fetchFn = jest.fn(async (_url: string, init: RequestInit) => {
      seen.push(init.headers as Record<string, string>)
      return {
        ok: true,
        status: 200,
        headers: new Map(),
        json: async () => ({ status: 'ok' }),
      } as unknown as Response
    })
    const calls: ServiceCalls = { calibrate: null, extract: null }
    let t = 0
    const service = createCollectingAutoService(
      {
        headers: () => ({
          'X-WPD-App': 'starry-digitizer',
          'X-WPD-Client-Id': 'c',
        }),
      },
      { baseUrl: '/api', fetch: fetchFn as unknown as typeof fetch },
      calls,
      () => (t += 5),
    )
    await service.calibrate(
      new Blob([new Uint8Array(1)], { type: 'image/png' }),
    )
    await service.extract(new Blob([new Uint8Array(1)]), {
      method: 'markernet',
      params: { threshold: 0.4 },
    })
    expect(seen[0]).toMatchObject({
      'X-WPD-App': 'starry-digitizer',
      'X-WPD-Client-Id': 'c',
      'X-WPD-Request-Id': calls.calibrate?.requestId,
    })
    expect(seen[1]['X-WPD-Request-Id']).toBe(calls.extract?.requestId)
    expect(calls.calibrate?.requestId).not.toBe(calls.extract?.requestId)
    expect(calls.calibrate).toMatchObject({ ms: 5, ok: true })
    expect(calls.extract?.request).toEqual({
      method: 'markernet',
      area: null,
      params: { threshold: 0.4 },
    })
  })
})

describe('decodeDataUrl', () => {
  it('decodes base64 and text data URLs', () => {
    expect(decodeDataUrl(PNG)).toEqual({
      bytes: Uint8Array.from(Buffer.from('hello')),
      type: 'image/png',
    })
    expect(decodeDataUrl('data:image/svg+xml,%3Csvg%3E')?.bytes).toEqual(
      Uint8Array.from(Buffer.from('<svg>')),
    )
    expect(decodeDataUrl('http://x/a.png')).toBeNull()
  })
})
