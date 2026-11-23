import { mount, flushPromises } from '@vue/test-utils'

import StartOverSettings from './StartOverSettings.vue'
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import {
  DIGITIZER_OPTIONS_KEY,
  createDigitizerOptions,
  type ConfirmDialog,
} from '@/presentation/digitizerOptions'

function mountPanel(
  ctx: DigitizerContext,
  confirm: ConfirmDialog,
  readonly = false,
) {
  return mount(StartOverSettings, {
    global: {
      provide: {
        [DIGITIZER_CONTEXT_KEY as symbol]: ctx,
        [DIGITIZER_OPTIONS_KEY as symbol]: createDigitizerOptions({
          confirm,
          readonly,
        }),
      },
    },
  })
}

function withWork(): DigitizerContext {
  const ctx = createDigitizerContext()
  ctx.axisSetRepository.activeAxisSet.addAxisCoord({ xPx: 10, yPx: 90 })
  ctx.datasetRepository.activeDataset.addPoint(10, 20)
  ctx.datasetRepository.createNewDataset()
  return ctx
}

const button = (wrapper: ReturnType<typeof mountPanel>) =>
  wrapper.get('[data-cy="start-over-button"]')

describe('StartOverSettings', () => {
  it('is disabled while there is nothing to clear', () => {
    const wrapper = mountPanel(createDigitizerContext(), jest.fn())

    expect(button(wrapper).attributes('disabled')).toBeDefined()
  })

  it('is disabled in readonly mode', () => {
    const wrapper = mountPanel(withWork(), jest.fn(), true)

    expect(button(wrapper).attributes('disabled')).toBeDefined()
  })

  it('asks through options.confirm and clears on yes, as one undo step', async () => {
    const ctx = withWork()
    const confirm = jest.fn(() => Promise.resolve(true))
    const wrapper = mountPanel(ctx, confirm)

    await button(wrapper).trigger('click')
    await flushPromises()

    expect(confirm).toHaveBeenCalledTimes(1)
    expect((confirm.mock.calls[0] as unknown as [string])[0]).toContain(
      'The image stays',
    )
    expect(ctx.datasetRepository.datasets).toHaveLength(1)
    expect(ctx.datasetRepository.activeDataset.points).toHaveLength(0)
    expect(ctx.axisSetRepository.activeAxisSet.hasAtLeastOneAxis).toBe(false)

    ctx.historyManager.undo()
    expect(ctx.datasetRepository.datasets).toHaveLength(2)
    expect(ctx.axisSetRepository.activeAxisSet.hasAtLeastOneAxis).toBe(true)
  })

  it('changes nothing on no', async () => {
    const ctx = withWork()
    const wrapper = mountPanel(ctx, () => Promise.resolve(false))

    await button(wrapper).trigger('click')
    await flushPromises()

    expect(ctx.datasetRepository.datasets).toHaveLength(2)
    expect(ctx.historyManager.canUndo).toBe(false)
  })
})
