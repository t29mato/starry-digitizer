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
    expect(wrapper.find('[data-cy="auto-place-proposal"]').exists()).toBe(
      false,
    )
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
