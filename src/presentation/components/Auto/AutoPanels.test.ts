// INFO: board P5 — the automatic features exist only when the backend says
// so. These pin down the presentation half of that rule: without the
// feature the panels render NOTHING (no placeholder, no disabled control),
// and Server Extraction offers only the methods the backend allowed.
import { mount } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

import AutoPlacePanel from './AutoPlacePanel.vue'
import ServerExtractionPanel from './ServerExtractionPanel.vue'
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import {
  DIGITIZER_OPTIONS_KEY,
  createDigitizerOptions,
} from '@/presentation/digitizerOptions'
import type { AutoCalibrationProposal } from '@/application/services/autoService/autoServiceWire'
import type { AutoService } from '@/application/services/autoService/autoService'
import { configureAutoService } from '@/application/utils/autoFeatureOperations'

type AnyComponent = new () => ComponentPublicInstance

function mountWith(component: unknown, ctx: DigitizerContext) {
  return mount<AnyComponent>(component as AnyComponent, {
    global: {
      provide: {
        [DIGITIZER_CONTEXT_KEY as symbol]: ctx,
        [DIGITIZER_OPTIONS_KEY as symbol]: createDigitizerOptions({}),
      },
    },
  })
}

const proposal = (): AutoCalibrationProposal => ({
  status: 'partial',
  failureReason: null,
  frame: { xPx: 10, yPx: 10, widthPx: 100, heightPx: 80 },
  ySide: 'left',
  x: {
    ok: true,
    scale: 'linear',
    ticks: [
      { value: 0, px: 10 },
      { value: 50, px: 60 },
      { value: 100, px: 110 },
    ],
    confidence: 0.3,
    residualPx: 0.2,
    failureReason: null,
  },
  y: {
    ok: false,
    scale: null,
    ticks: [],
    confidence: null,
    residualPx: null,
    failureReason: 'too_few_labels',
  },
})

describe('AutoPlacePanel', () => {
  let ctx: DigitizerContext
  beforeEach(() => {
    ctx = createDigitizerContext()
  })

  it('renders nothing without the auto_axis feature', () => {
    ctx.autoFeatures.setFeatures(['markernet'])
    const wrapper = mountWith(AutoPlacePanel, ctx)
    expect(wrapper.find('[data-cy="auto-place"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
    wrapper.unmount()
  })

  it('shows the Auto-place button with the feature', () => {
    ctx.autoFeatures.setFeatures(['auto_axis'])
    const wrapper = mountWith(AutoPlacePanel, ctx)
    const button = wrapper.find('[data-cy="auto-place-request"]')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('Auto-place')
    // INFO: no image loaded yet
    expect(button.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('shows a proposal for the active axis set, with warnings and reasons', async () => {
    ctx.autoFeatures.setFeatures(['auto_axis'])
    ctx.autoFeatures.setProposal(
      proposal(),
      ctx.axisSetRepository.activeAxisSetId,
    )
    const wrapper = mountWith(AutoPlacePanel, ctx)
    await wrapper.vm.$nextTick()

    const x = wrapper.find('[data-cy="auto-place-axis-x"]').text()
    expect(x).toContain('0, 50, 100 (3 ticks)')
    expect(x).toContain('low confidence')
    expect(wrapper.find('[data-cy="auto-place-axis-y"]').text()).toContain(
      'too few tick labels read',
    )
    expect(
      wrapper.find('[data-cy="auto-place-apply"]').attributes('disabled'),
    ).toBeUndefined()
    wrapper.unmount()
  })

  it('hides a proposal made for another axis set', async () => {
    ctx.autoFeatures.setFeatures(['auto_axis'])
    ctx.autoFeatures.setProposal(proposal(), 999)
    const wrapper = mountWith(AutoPlacePanel, ctx)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-cy="auto-place-proposal"]').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('ServerExtractionPanel', () => {
  let ctx: DigitizerContext
  beforeEach(() => {
    ctx = createDigitizerContext()
  })

  it('renders nothing without an extraction feature', () => {
    ctx.autoFeatures.setFeatures(['auto_axis'])
    const wrapper = mountWith(ServerExtractionPanel, ctx)
    expect(wrapper.find('[data-cy="server-extraction"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('lists only the methods the backend allowed', () => {
    ctx.autoFeatures.setFeatures(['lineformer'])
    const wrapper = mountWith(ServerExtractionPanel, ctx)
    const options = wrapper
      .findAll('[data-cy="server-extraction-method"] option')
      .map((o) => o.attributes('value'))
    expect(options).toEqual(['lineformer'])
    // INFO: LineFormer shows its interval and its licence line
    expect(
      wrapper.find('[data-cy="server-extraction-interval"]').exists(),
    ).toBe(true)
    expect(wrapper.text()).toContain('no published licence')
    wrapper.unmount()
  })

  it('offers both when both are allowed, MarkerNet first', () => {
    ctx.autoFeatures.setFeatures(['lineformer', 'markernet'])
    const wrapper = mountWith(ServerExtractionPanel, ctx)
    const options = wrapper
      .findAll('[data-cy="server-extraction-method"] option')
      .map((o) => o.attributes('value'))
    expect(options).toEqual(['markernet', 'lineformer'])
    expect(
      wrapper.find('[data-cy="server-extraction-interval"]').exists(),
    ).toBe(false)
    wrapper.unmount()
  })
})

// INFO: the method options (wpd-auto backend: MarkerNet `series_threshold` /
// `legend`, LineFormer `loops`) are shown per method and sent only when they
// differ from the backend default, so an untouched panel asks for exactly
// what it asked for before.
describe('ServerExtractionPanel: options and cancelling', () => {
  const PNG = 'data:image/png;base64,aGVsbG8='
  const setup = async (
    features: string[],
    extract: AutoService['extract'] = jest.fn(async () => ({
      method: 'markernet',
      series: [],
    })),
  ) => {
    const ctx = createDigitizerContext()
    const service: AutoService = {
      capabilities: async () => features,
      calibrate: jest.fn(),
      extract,
    }
    await configureAutoService(ctx, service)
    ctx.canvasHandler.setUploadImageUrl(PNG)
    const wrapper = mountWith(ServerExtractionPanel, ctx)
    await wrapper.vm.$nextTick()
    return { ctx, wrapper, extract: service.extract as jest.Mock }
  }
  const flush = () => new Promise((r) => setTimeout(r, 0))
  const sentParams = (extract: jest.Mock, call = 0) =>
    (extract.mock.calls[call][1] as { params: Record<string, number> }).params

  it('MarkerNet: series distance and legend; nothing extra sent by default', async () => {
    const { wrapper, extract } = await setup(['markernet'])
    expect(
      wrapper.find('[data-cy="server-extraction-series-threshold"]').exists(),
    ).toBe(true)
    expect(wrapper.find('[data-cy="server-extraction-legend"]').exists()).toBe(
      true,
    )
    expect(wrapper.find('[data-cy="server-extraction-loops"]').exists()).toBe(
      false,
    )

    await wrapper.find('[data-cy="server-extraction-run"]').trigger('click')
    await flush()
    expect(sentParams(extract)).toEqual({ threshold: 0.4 })

    await wrapper.find('[data-cy="server-extraction-legend"]').setValue(false)
    await wrapper
      .find('[data-cy="server-extraction-series-threshold"]')
      .setValue('0.8')
    await wrapper.find('[data-cy="server-extraction-run"]').trigger('click')
    await flush()
    expect(sentParams(extract, 1)).toEqual({
      threshold: 0.4,
      series_threshold: 0.8,
      legend: 0,
    })
    wrapper.unmount()
  })

  it('LineFormer: loops, sent only when on', async () => {
    const { wrapper, extract } = await setup(['lineformer'])
    expect(
      wrapper.find('[data-cy="server-extraction-series-threshold"]').exists(),
    ).toBe(false)
    expect(wrapper.find('[data-cy="server-extraction-legend"]').exists()).toBe(
      false,
    )

    await wrapper.find('[data-cy="server-extraction-run"]').trigger('click')
    await flush()
    expect(sentParams(extract)).toEqual({ threshold: 0.3, interval: 10 })

    await wrapper.find('[data-cy="server-extraction-loops"]').setValue(true)
    await wrapper.find('[data-cy="server-extraction-run"]').trigger('click')
    await flush()
    expect(sentParams(extract, 1)).toEqual({
      threshold: 0.3,
      interval: 10,
      loops: 1,
    })
    wrapper.unmount()
  })

  it('a new image aborts the running Extract; the late answer is not applied', async () => {
    let resolve: (body: unknown) => void = () => undefined
    let signal: AbortSignal | undefined
    const extract = jest.fn(
      (_image: Blob, _request: unknown, options?: { signal?: AbortSignal }) => {
        signal = options?.signal
        return new Promise((r) => (resolve = r))
      },
    )
    const { ctx, wrapper } = await setup(['markernet'], extract)
    await wrapper.find('[data-cy="server-extraction-run"]').trigger('click')
    expect(signal?.aborted).toBe(false)

    ctx.canvasHandler.setUploadImageUrl('data:image/png;base64,b3RoZXI=')
    await wrapper.vm.$nextTick()
    expect(signal?.aborted).toBe(true)
    resolve({
      method: 'markernet',
      series: [{ label: 'circle', points: [[9.5, 9.5]], point_scores: [0.9] }],
    })
    await flush()

    expect(ctx.datasetRepository.datasets.map((d) => d.name)).toEqual([
      'dataset 1',
    ])
    expect(wrapper.text()).toContain('Cancelled: the image changed.')
    expect(wrapper.emitted('error')).toBeUndefined()
    wrapper.unmount()
  })
})
