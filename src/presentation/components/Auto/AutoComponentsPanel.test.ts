import { flushPromises, mount } from '@vue/test-utils'

import AutoComponentsPanel from './AutoComponentsPanel.vue'
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import type { AutoService } from '@/application/services/autoService/autoService'
import {
  canListAutoComponents,
  loadAutoComponents,
} from '@/application/utils/autoFeatureOperations'
import realAnswer from '@/application/services/autoService/fixtures/wpd-auto-components-0.3.0.json'

const baseService = (): AutoService => ({
  capabilities: async () => [],
  calibrate: async () => ({}),
  extract: async () => ({}),
})

function contextWith(service: AutoService | null): DigitizerContext {
  const ctx = createDigitizerContext()
  ctx.autoFeatures.setService(service)
  return ctx
}

const mountPanel = (ctx: DigitizerContext) =>
  mount(AutoComponentsPanel, {
    global: { provide: { [DIGITIZER_CONTEXT_KEY as symbol]: ctx } },
  })

async function open(wrapper: ReturnType<typeof mountPanel>) {
  const details = wrapper.get('details').element as HTMLDetailsElement
  // INFO: jsdom fires `toggle` itself (in a task, as browsers do) when
  // `open` is set, so the test only opens it like a click would
  details.open = true
  await new Promise((resolve) => setTimeout(resolve, 0))
  await flushPromises()
}

describe('loadAutoComponents', () => {
  test('parses what the service answers', async () => {
    const ctx = contextWith({
      ...baseService(),
      components: async () => realAnswer,
    })
    expect(canListAutoComponents(ctx)).toBe(true)
    const info = await loadAutoComponents(ctx)
    expect(info.app?.version).toBe('0.3.0')
  })

  test('rejects when the service cannot list them', async () => {
    const ctx = contextWith(baseService())
    expect(canListAutoComponents(ctx)).toBe(false)
    await expect(loadAutoComponents(ctx)).rejects.toMatchObject({
      code: 'AUTO_SERVICE_FAILED',
    })
  })
})

describe('AutoComponentsPanel', () => {
  test('renders nothing without an auto service', () => {
    const wrapper = mountPanel(contextWith(null))
    expect(wrapper.find('[data-cy="auto-components"]').exists()).toBe(false)
  })

  test('renders nothing when the service has no components()', () => {
    const wrapper = mountPanel(contextWith(baseService()))
    expect(wrapper.find('[data-cy="auto-components"]').exists()).toBe(false)
  })

  test('asks only when opened, then lists the components', async () => {
    const components = jest.fn(async () => realAnswer)
    const wrapper = mountPanel(contextWith({ ...baseService(), components }))

    expect(wrapper.find('[data-cy="auto-components"]').exists()).toBe(true)
    expect(components).not.toHaveBeenCalled()

    await open(wrapper)

    expect(components).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-cy="auto-components-backend"]').text()).toContain(
      'v0.3.0',
    )
    const calibration = wrapper.get('[data-cy="auto-component-calibration"]')
    expect(calibration.text()).toContain('Starrydata PlotRuler')
    expect(calibration.text()).toContain('rcb-axis/v4@4850d1f')
    // INFO: the commit is shortened on screen, kept whole in the title
    const code = calibration.find('code[title]')
    expect(code.attributes('title')).toBe(
      '4850d1f7204e824d1c967f93e4fec627c2ee8c54',
    )
    expect(
      wrapper
        .get('[data-cy="auto-component-lineformer"]')
        .get('[data-cy="auto-component-status"]')
        .text(),
    ).toBe('not configured')
  })

  test('shows why the list is missing when the call fails', async () => {
    const components = jest.fn(async () => {
      throw new Error('boom')
    })
    const wrapper = mountPanel(contextWith({ ...baseService(), components }))

    await open(wrapper)

    expect(wrapper.find('[data-cy="auto-components-error"]').exists()).toBe(
      true,
    )
  })
})
