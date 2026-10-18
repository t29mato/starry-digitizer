// INFO: Auto digitize is shown only when the backend allows BOTH Auto-place
// and an extraction method; it offers only the allowed methods; and its
// result panel says how far a run got.
import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

import AutoDigitizePanel from './AutoDigitizePanel.vue'
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import {
  DIGITIZER_OPTIONS_KEY,
  createDigitizerOptions,
} from '@/presentation/digitizerOptions'
import type { AutoService } from '@/application/services/autoService/autoService'
import { configureAutoService } from '@/application/utils/autoFeatureOperations'

type AnyComponent = new () => ComponentPublicInstance

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
        y: {
          status: 'ok',
          scale: 'linear',
          ticks: [
            { value: 0, px: 399.5 },
            { value: 100, px: 49.5 },
          ],
          confidence: 0.9,
        },
      },
    },
  ],
}

const extraction = {
  method: 'lineformer',
  series: [
    {
      label: 'line 1',
      points: [
        [109.5, 299.5],
        [209.5, 199.5],
      ],
    },
  ],
}

function mountWith(ctx: DigitizerContext): VueWrapper {
  return mount<AnyComponent>(AutoDigitizePanel, {
    global: {
      provide: {
        [DIGITIZER_CONTEXT_KEY as symbol]: ctx,
        [DIGITIZER_OPTIONS_KEY as symbol]: createDigitizerOptions({}),
      },
    },
  })
}

async function setup(features: string[]) {
  const ctx = createDigitizerContext()
  const service = {
    capabilities: async () => features,
    calibrate: jest.fn(async () => calibration),
    extract: jest.fn(async () => extraction),
  } satisfies AutoService
  await configureAutoService(ctx, service)
  ctx.canvasHandler.setUploadImageUrl(PNG)
  return { ctx, service, wrapper: mountWith(ctx) }
}

describe('AutoDigitizePanel', () => {
  let wrapper: VueWrapper | undefined
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it.each([[[] as string[]], [['auto_axis']], [['lineformer', 'markernet']]])(
    'renders nothing with only %j',
    async (features) => {
      const s = await setup(features)
      wrapper = s.wrapper
      expect(wrapper.find('[data-cy="auto-digitize"]').exists()).toBe(false)
      expect(wrapper.text()).toBe('')
    },
  )

  it('offers Lines and Markers, Lines first, when both are allowed', async () => {
    const s = await setup(['auto_axis', 'markernet', 'lineformer'])
    wrapper = s.wrapper
    const buttons = wrapper.findAll('[data-cy="auto-digitize-method"] button')
    expect(buttons.map((b) => b.text())).toEqual(['Lines', 'Markers'])
    expect(buttons.map((b) => b.attributes('aria-pressed'))).toEqual([
      'true',
      'false',
    ])

    await buttons[1].trigger('click')
    expect(buttons.map((b) => b.attributes('aria-pressed'))).toEqual([
      'false',
      'true',
    ])
  })

  it('offers only the allowed method', async () => {
    const s = await setup(['auto_axis', 'markernet'])
    wrapper = s.wrapper
    const buttons = wrapper.findAll('[data-cy="auto-digitize-method"] button')
    expect(buttons.map((b) => b.text())).toEqual(['Markers'])
  })

  it('runs with the chosen method and shows both steps done', async () => {
    const s = await setup(['auto_axis', 'markernet', 'lineformer'])
    wrapper = s.wrapper
    await wrapper.get('[data-cy="auto-digitize-run"]').trigger('click')
    await flushPromises()

    expect(s.service.extract.mock.calls[0][1]).toMatchObject({
      method: 'lineformer',
    })
    expect(
      wrapper
        .get('[data-cy="auto-digitize-step-axes"]')
        .attributes('data-state'),
    ).toBe('done')
    const drafts = wrapper.get('[data-cy="auto-digitize-step-extract"]')
    expect(drafts.attributes('data-state')).toBe('done')
    expect(drafts.text()).toContain('1 series, 2 points')
    expect(wrapper.get('[data-cy="auto-digitize-undo"]').text()).toBe(
      'Undo once goes back to before Auto digitize.',
    )
  })

  it('shows where a failed run stopped and reports the error', async () => {
    const s = await setup(['auto_axis', 'lineformer'])
    wrapper = s.wrapper
    s.service.extract.mockRejectedValueOnce(new Error('busy'))
    await wrapper.get('[data-cy="auto-digitize-run"]').trigger('click')
    await flushPromises()

    expect(
      wrapper
        .get('[data-cy="auto-digitize-step-axes"]')
        .attributes('data-state'),
    ).toBe('done')
    expect(
      wrapper
        .get('[data-cy="auto-digitize-step-extract"]')
        .attributes('data-state'),
    ).toBe('failed')
    expect(wrapper.get('[data-cy="auto-digitize-reason"]').text()).toMatch(
      /^The axes were applied, but the extraction failed/,
    )
    expect(wrapper.emitted('error')).toHaveLength(1)

    s.ctx.historyManager.undo()
    expect(s.ctx.axisSetRepository.activeAxisSet.hasAtLeastOneAxis).toBe(false)
  })

  it('Cancel stops the run; the axes applied so far stay', async () => {
    const s = await setup(['auto_axis', 'lineformer'])
    wrapper = s.wrapper
    let release: () => void = () => {}
    s.service.extract.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(extraction)
        }),
    )
    await wrapper.get('[data-cy="auto-digitize-run"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-cy="auto-digitize-progress"]').text()).toMatch(
      /^2\/2 Extracting with LineFormer/,
    )

    await wrapper.get('[data-cy="auto-digitize-cancel"]').trigger('click')
    release()
    await flushPromises()

    expect(
      wrapper
        .get('[data-cy="auto-digitize-step-extract"]')
        .attributes('data-state'),
    ).toBe('skipped')
    expect(s.ctx.datasetRepository.datasets).toHaveLength(1)
    expect(s.ctx.axisSetRepository.activeAxisSet.hasAtLeastOneAxis).toBe(true)
    expect(wrapper.emitted('error')).toBeUndefined()
  })
})
