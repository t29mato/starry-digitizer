/**
 * @jest-environment node
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createDigitizerContext } from '@/application/digitizerContext'
import { configureAutoService } from '@/application/utils/autoFeatureOperations'
import {
  applyAutoCalibration,
  requestAutoCalibration,
} from '@/application/utils/autoCalibrationOperations'
import { applyServerExtraction } from '@/application/utils/serverExtractionOperations'
import { parseExtractionResponse } from '@/application/services/autoService/autoServiceWire'
import { recordExport } from '@/application/utils/researchEventOperations'
import { CollectClient } from './collectClient'
import { startCollect } from './collectApp'

// INFO: OPT-IN, against a real wpd-auto backend (feat/client-capabilities or
// later) with collection on. Skipped unless COLLECT_BACKEND_URL is set, e.g.
//   COLLECT_BACKEND_URL=http://127.0.0.1:24861/api/v1 \
//     npx jest src/hosting/collect/collect.backend.test.ts
// The backend's users.json should list `alice` (the test picks that name).
// What it stored is then read from <WPD_AUTO_COLLECT_DIR>/events/*.jsonl.
// docs/design/starryai-auto.md §2.3.
const BASE = process.env.COLLECT_BACKEND_URL
const run = BASE ? describe : describe.skip

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const fakeWindow = {
  navigator: {
    userAgent: 'collect.backend.test',
    language: 'en',
    languages: ['en'],
  },
  innerWidth: 1280,
  innerHeight: 800,
  screen: { width: 1920, height: 1080 },
  devicePixelRatio: 1,
  location: { pathname: '/starry-digitizer-staging/' },
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  document: {
    visibilityState: 'visible',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  },
} as unknown as Window

run('collect against a real backend', () => {
  jest.setTimeout(60000)

  it('sends one session of records', async () => {
    ;(globalThis as { window?: Window }).window = fakeWindow
    const ctx = createDigitizerContext()
    const png = readFileSync(
      join(__dirname, '../../../public/sample_graph_curve.png'),
    )
    const client = new CollectClient({
      baseUrl: BASE as string,
      app: { commit: 'abcdef1', version: '2.0.0', build: 1 },
      storage: null,
      batchDelayMs: 200,
    })
    const handle = startCollect(ctx, BASE as string, {
      version: '2.0.0',
      client,
      onChange: () => undefined,
      afterRender: async () => undefined,
    })
    await configureAutoService(ctx, handle.service)
    expect(ctx.autoFeatures.has('auto_axis')).toBe(true)

    ctx.canvasHandler.setUploadImageUrl(
      `data:image/png;base64,${png.toString('base64')}`,
    )
    // INFO: as ImageSettings does: the file comes right after the canvas
    // has the image
    await Promise.resolve()
    handle.noteFile(
      new File([png], 'sample_graph_curve.png', { type: 'image/png' }),
    )
    await wait(50)
    expect(client.needsUserChoice).toBe(true)
    handle.chooseUser('alice')

    const proposal = await requestAutoCalibration(ctx)
    expect(proposal.x.ok || proposal.y.ok).toBe(true)
    applyAutoCalibration(ctx)
    await wait(2500)
    ctx.axisSetRepository.activeAxisSet.setX2Value(
      ctx.axisSetRepository.activeAxisSet.x2.value * 2,
    )
    await wait(2500)

    applyServerExtraction(
      ctx,
      parseExtractionResponse({
        method: 'markernet',
        series: [{ label: 'circle', points: [[100.5, 200.5]] }],
      }),
      'markernet',
    )
    ctx.historyManager.undo()
    ctx.historyManager.redo()
    recordExport(ctx, 'copy', 'dataset', [ctx.datasetRepository.activeDataset])

    await wait(500)
    await client.flush()
    for (
      let i = 0;
      i < 50 && (client.pending > 0 || client.pendingImages > 0);
      i++
    ) {
      await wait(100)
    }
    expect(client.pending).toBe(0)
    expect(client.pendingImages).toBe(0)
    // eslint-disable-next-line no-console
    console.log(`session ${client.sessionId} client ${client.clientId}`)
    handle.stop()
  })

  it('sends starrydata.ref, ui.error and ui.message, then flushes for a reload', async () => {
    ;(globalThis as { window?: Window }).window = fakeWindow
    const ctx = createDigitizerContext()
    const client = new CollectClient({
      baseUrl: BASE as string,
      app: { commit: 'abcdef1', version: '2.0.0', build: 1 },
      storage: null,
      batchDelayMs: 60000,
    })
    const handle = startCollect(ctx, BASE as string, {
      version: '2.0.0',
      client,
      onChange: () => undefined,
      afterRender: async () => undefined,
    })
    await wait(200)
    if (client.needsUserChoice) handle.chooseUser(null)
    ctx.starrydataRef.set({ sid: '1' })
    await wait(10)
    ctx.starrydataRef.set({ sid: '12345' })
    await wait(10)
    ctx.starrydataRef.set({ figure: '3(b)' })
    await wait(1700)
    handle.noteError('menu.save_project', 'EXPORT_FAILED', 'No image loaded')
    handle.noteMessage(
      'auto_extraction.import',
      'Imported 1 series / 2 points.',
    )
    ctx.starrydataRef.set({ sid: '123456' })
    // INFO: before its 1.5 s: recorded by the flush for the reload
    expect(await handle.flushBeforeReload()).toBe(true)
    expect(client.pending).toBe(0)
    // eslint-disable-next-line no-console
    console.log(`session ${client.sessionId} client ${client.clientId}`)
    handle.stop()
  })
})
