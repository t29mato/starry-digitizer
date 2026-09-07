// INFO: the SFC imports its stylesheet for the library build's sake; jest has
// no scss transform, so it is mocked here rather than in the shared jest
// config (this is the only .scss import in the source tree).
jest.mock('@/presentation/styles/base.scss', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import StarryDigitizer from './StarryDigitizer.vue'
import { createDigitizerContext } from '@/application/digitizerContext'

// INFO: <StarryDigitizer> is the API surface a host that does NOT place the
// panels itself has. It has to be able to (1) hear that the digitizer just did
// something undoable and (2) drive undo/redo when it owns ⌘Z, or the host and
// the digitizer end up with two separate undo stacks and ⌘Z means different
// things depending on where the user last clicked.
describe('<StarryDigitizer> undo history', () => {
  const mountWithContext = () => {
    const context = createDigitizerContext()
    const wrapper = mount(StarryDigitizer, { props: { context } })
    return { wrapper, context }
  }

  it('emits nothing on mount', () => {
    // INFO: loading a project clears the history, but with nothing on the
    // stacks that is not a change — a host must not have to filter noise out
    // of every mount.
    const { wrapper } = mountWithContext()

    expect(wrapper.emitted('history-change')).toBeUndefined()
  })

  it('emits history-change when the engine captures', () => {
    const { wrapper, context } = mountWithContext()

    context.historyManager.capture()

    const events = wrapper.emitted('history-change')
    expect(events).toHaveLength(1)
    expect(events?.[0]).toStrictEqual([
      { type: 'capture', canUndo: true, canRedo: false },
    ])
  })

  it('reports its own type for undo and redo', () => {
    // INFO: this is what lets a host tell "the user drew something" from "the
    // undo I just asked for", so its own stack does not grow an entry per
    // undo.
    const { wrapper, context } = mountWithContext()

    context.historyManager.capture()
    context.historyManager.undo()
    context.historyManager.redo()

    const types = wrapper
      .emitted('history-change')
      ?.map((args) => (args[0] as { type: string }).type)
    expect(types).toStrictEqual(['capture', 'undo', 'redo'])
  })

  it('exposes undo/redo that drive the engine', () => {
    const { wrapper, context } = mountWithContext()
    context.historyManager.capture()
    context.datasetRepository.activeDataset.addPoint(1, 1)

    const vm = wrapper.vm as unknown as {
      undo: () => void
      redo: () => void
    }
    vm.undo()
    expect(context.datasetRepository.activeDataset.points).toHaveLength(0)

    vm.redo()
    expect(context.datasetRepository.activeDataset.points).toHaveLength(1)
  })

  it('exposes canUndo/canRedo that follow the engine', () => {
    const { wrapper, context } = mountWithContext()
    const vm = wrapper.vm as unknown as {
      undo: () => void
      canUndo: boolean
      canRedo: boolean
    }

    expect(vm.canUndo).toBe(false)
    expect(vm.canRedo).toBe(false)

    context.historyManager.capture()
    expect(vm.canUndo).toBe(true)

    vm.undo()
    expect(vm.canUndo).toBe(false)
    expect(vm.canRedo).toBe(true)
  })

  it('stops listening once unmounted', () => {
    // INFO: the standalone app shares one context across mounts, so a
    // subscription that outlived the component would emit from a dead one.
    // INFO: asserted through the unsubscribe function rather than through
    // emitted(): test-utils stops recording emits once the wrapper is
    // unmounted, so "no further events" would pass even with the
    // subscription leaked.
    const context = createDigitizerContext()
    const unsubscribed = jest.fn()
    const subscribe = context.historyManager.subscribe.bind(
      context.historyManager,
    )
    jest
      .spyOn(context.historyManager, 'subscribe')
      .mockImplementation((listener) => {
        const off = subscribe(listener)
        return () => {
          unsubscribed()
          off()
        }
      })

    const wrapper = mount(StarryDigitizer, { props: { context } })
    context.historyManager.capture()
    expect(wrapper.emitted('history-change')).toHaveLength(1)
    expect(unsubscribed).not.toHaveBeenCalled()

    wrapper.unmount()

    expect(unsubscribed).toHaveBeenCalledTimes(1)
  })
})
