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
import { startOver } from '@/application/utils/startOverOperations'

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
  plot: 'xy',
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

  it('offers the plot type only when both X-Y and Bar are allowed', async () => {
    ctx.autoFeatures.setFeatures(['auto_axis'])
    let wrapper = mountWith(AutoPlacePanel, ctx)
    expect(wrapper.find('[data-cy="auto-place-plot"]').exists()).toBe(false)
    wrapper.unmount()

    ctx.autoFeatures.setFeatures(['auto_axis', 'auto_axis_bar'])
    wrapper = mountWith(AutoPlacePanel, ctx)
    const buttons = wrapper.findAll('[data-cy="auto-place-plot"] button')
    expect(buttons.map((b) => b.text())).toEqual(['X-Y', 'Bar'])
    wrapper.unmount()

    // INFO: Bar alone still shows the panel, without a choice
    ctx.autoFeatures.setFeatures(['auto_axis_bar'])
    wrapper = mountWith(AutoPlacePanel, ctx)
    expect(wrapper.find('[data-cy="auto-place"]').exists()).toBe(true)
    expect(wrapper.find('[data-cy="auto-place-plot"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('a bar proposal: x is the bar index of the active dataset’s points', async () => {
    ctx.autoFeatures.setFeatures(['auto_axis_bar'])
    const bar: AutoCalibrationProposal = {
      ...proposal(),
      plot: 'bar',
      x: {
        ...proposal().x,
        ok: false,
        ticks: [],
        failureReason: 'not_read_bar_plot',
      },
      y: {
        ok: true,
        scale: 'linear',
        ticks: [
          { value: 0, px: 90 },
          { value: 10, px: 10 },
        ],
        confidence: 0.9,
        residualPx: 0,
        failureReason: null,
      },
    }
    ctx.autoFeatures.setProposal(bar, ctx.axisSetRepository.activeAxisSetId)
    const wrapper = mountWith(AutoPlacePanel, ctx)
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-cy="auto-place-axis-x"]').text()).toContain(
      'no bars yet',
    )
    // INFO: the value axis alone can be applied
    expect(
      wrapper.get('[data-cy="auto-place-apply"]').attributes('disabled'),
    ).toBeUndefined()

    ctx.datasetRepository.activeDataset.addPoint(30, 50)
    ctx.datasetRepository.activeDataset.addPoint(60, 40)
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-cy="auto-place-axis-x"]').text()).toContain(
      'bar index 0 … 1',
    )
    await wrapper.get('[data-cy="auto-place-apply"]').trigger('click')
    const axisSet = ctx.axisSetRepository.activeAxisSet
    expect([axisSet.x1.value, axisSet.x2.value]).toEqual([0, 1])
    expect([axisSet.x1.coord.xPx, axisSet.x2.coord.xPx]).toEqual([30, 60])
    expect([axisSet.y1.value, axisSet.y2.value]).toEqual([0, 10])
    wrapper.unmount()
  })

  it('drops the "Applied" note when Start over removes the markers', async () => {
    ctx.autoFeatures.setFeatures(['auto_axis'])
    ctx.autoFeatures.setProposal(
      proposal(),
      ctx.axisSetRepository.activeAxisSetId,
    )
    const wrapper = mountWith(AutoPlacePanel, ctx)
    await wrapper.vm.$nextTick()
    await wrapper.get('[data-cy="auto-place-apply"]').trigger('click')
    expect(wrapper.text()).toContain('Applied — drag the axis markers')

    // INFO: seen in a browser (2026-11-24): the note stayed under the
    // reset axes
    expect(startOver(ctx)).toBe(true)
    await wrapper.vm.$nextTick()
    expect(ctx.axisSetRepository.activeAxisSet.hasAtLeastOneAxis).toBe(false)
    expect(wrapper.text()).not.toContain('Applied — drag the axis markers')
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

  it('offers BarNet with its licence', () => {
    ctx.autoFeatures.setFeatures(['barnet'])
    const wrapper = mountWith(ServerExtractionPanel, ctx)
    const options = wrapper
      .findAll('[data-cy="server-extraction-method"] option')
      .map((o) => o.attributes('value'))
    expect(options).toEqual(['barnet'])
    expect(wrapper.text()).toContain('CC BY-NC-SA 4.0')
    expect(
      wrapper.get('[data-cy="server-extraction-bar-note"]').text(),
    ).toContain('One point per bar')
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

describe('ServerExtractionPanel: methods and hours from the server', () => {
  it('says why a known method is not offered, and the supported hours', () => {
    const ctx = createDigitizerContext()
    ctx.autoFeatures.setFeatures(['markernet'])
    ctx.autoFeatures.setStatus(
      [
        {
          id: 'markernet',
          label: 'MarkerNet',
          description: '',
          available: true,
          unavailableReason: null,
          license: null,
          attribution: 'PlotQA (CC BY 4.0)',
        },
        {
          id: 'lineformer',
          label: 'LineFormer',
          description: '',
          available: false,
          unavailableReason: 'service_unavailable',
          license: null,
          attribution: null,
        },
      ],
      {
        available: false,
        hours: '09:00-17:00',
        timezone: 'Asia/Tokyo',
        nextChange: null,
      },
    )
    const wrapper = mountWith(ServerExtractionPanel, ctx)
    expect(
      wrapper.find('[data-cy="server-extraction-unavailable"]').text(),
    ).toBe('LineFormer (lines): not available now (service_unavailable).')
    expect(
      wrapper.find('[data-cy="server-extraction-attribution"]').text(),
    ).toBe('Sources: PlotQA (CC BY 4.0)')
    expect(wrapper.find('[data-cy="server-extraction-hours"]').text()).toBe(
      'Automatic features are supported 09:00–17:00 (Asia/Tokyo). Manual digitizing works at any time.',
    )
    wrapper.unmount()
  })

  it('shows none of that without a methods answer', () => {
    const ctx = createDigitizerContext()
    ctx.autoFeatures.setFeatures(['markernet'])
    const wrapper = mountWith(ServerExtractionPanel, ctx)
    expect(
      wrapper.find('[data-cy="server-extraction-unavailable"]').exists(),
    ).toBe(false)
    expect(wrapper.find('[data-cy="server-extraction-hours"]').exists()).toBe(
      false,
    )
    wrapper.unmount()
  })
})

describe('ServerExtractionPanel: legend reading (F9)', () => {
  const PNG = 'data:image/png;base64,aGVsbG8='
  const flush = () => new Promise((r) => setTimeout(r, 0))
  const extraction = {
    method: 'markernet',
    series: [
      { label: 'circle', points: [[9.5, 9.5]] },
      { label: 'square', points: [[19.5, 19.5]] },
    ],
  }
  // INFO: the backend's 200 envelope (wpd-auto backend README, MIT)
  const answer = {
    status: 'ok',
    reason: null,
    legend: {
      legend: { source: 'vlm' },
      assignments: [
        { series_id: 's0', label: '100 nm', role: 'primary', confidence: 0.9 },
        { series_id: 's1', label: '200 nm', role: 'primary', confidence: 0.4 },
      ],
      draft_order: ['s0', 's1'],
    },
    elapsed_ms: 10,
  }
  const setup = async (legend: AutoService['legend']) => {
    const ctx = createDigitizerContext()
    const service: AutoService = {
      capabilities: async () => ['markernet'],
      calibrate: jest.fn(),
      extract: jest.fn(async () => extraction),
      legend,
    }
    await configureAutoService(ctx, service)
    ctx.canvasHandler.setUploadImageUrl(PNG)
    const wrapper = mountWith(ServerExtractionPanel, ctx)
    await wrapper.vm.$nextTick()
    return { ctx, wrapper }
  }

  it('the drafts come first; the names, an "auto" mark and a suggestion follow', async () => {
    let resolve: (body: unknown) => void = () => undefined
    const { ctx, wrapper } = await setup(
      () => new Promise((r) => (resolve = r)),
    )
    await wrapper.find('[data-cy="server-extraction-run"]').trigger('click')
    await flush()
    expect(wrapper.text()).toContain('2 series, 2 points')
    expect(wrapper.find('[data-cy="legend-naming-reading"]').exists()).toBe(
      true,
    )

    resolve(answer)
    await flush()
    expect(wrapper.find('[data-cy="legend-naming-named"]').text()).toContain(
      'auto 100 nm',
    )
    const suggestion = wrapper.find('[data-cy="legend-naming-suggestion"]')
    expect(suggestion.text()).toContain('200 nm?')
    expect(ctx.datasetRepository.datasets.map((d) => d.name)).toEqual([
      '100 nm',
      'square (markernet)',
    ])

    await wrapper.find('[data-cy="legend-naming-accept"]').trigger('click')
    expect(ctx.datasetRepository.datasets[1].name).toBe('200 nm')
    expect(wrapper.find('[data-cy="legend-naming-suggestion"]').exists()).toBe(
      false,
    )
    wrapper.unmount()
  })

  it('a failure is one quiet caption, not an error', async () => {
    const { wrapper } = await setup(async () => ({
      status: 'vlm_unavailable',
      reason: 'the local VLM is not running',
      legend: null,
    }))
    await wrapper.find('[data-cy="server-extraction-run"]').trigger('click')
    await flush()
    expect(wrapper.find('[data-cy="legend-naming-caption"]').text()).toBe(
      'Legend not read: the legend reader is not running.',
    )
    expect(wrapper.emitted('error')).toBeUndefined()
    wrapper.unmount()
  })

  it('not asked when the legend is turned off (MarkerNet legend=0)', async () => {
    const legend = jest.fn(async () => answer)
    const { wrapper } = await setup(legend)
    await wrapper.find('[data-cy="server-extraction-legend"]').setValue(false)
    await wrapper.find('[data-cy="server-extraction-run"]').trigger('click')
    await flush()
    expect(legend).not.toHaveBeenCalled()
    expect(wrapper.find('[data-cy="legend-naming"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
