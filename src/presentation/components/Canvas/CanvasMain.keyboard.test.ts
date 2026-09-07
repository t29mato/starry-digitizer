import { mount, VueWrapper } from '@vue/test-utils'
import CanvasMain from '@/presentation/components/Canvas/CanvasMain.vue'
import { createDigitizerContext } from '@/application/digitizerContext'
import type { DigitizerContext } from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import {
  DIGITIZER_OPTIONS_KEY,
  createDigitizerOptions,
} from '@/presentation/digitizerOptions'
import { MANUAL_MODE } from '@/constants'

/**
 * Where the canvas listens for keys, and what turns that off.
 *
 * The library is embedded in host pages, so a keydown listener on `document`
 * was not neutral: every Cmd+Z pressed anywhere on the host page undid a point
 * here, and every instance on the page answered the same keypress. The
 * listener now lives on this instance's own canvas frame (plus, while the
 * pointer is over it, a document listener that exists only for that stretch).
 *
 * 'e' is the probe throughout: it switches the manual mode to EDIT, needs no
 * image, and is observable on the shared canvasHandler.
 */
function mountCanvas(keyboardShortcuts = true): {
  wrapper: VueWrapper
  ctx: DigitizerContext
} {
  const ctx = createDigitizerContext()
  const options = createDigitizerOptions({ features: { keyboardShortcuts } })

  const wrapper = mount(CanvasMain, {
    global: {
      provide: {
        [DIGITIZER_CONTEXT_KEY as symbol]: ctx,
        [DIGITIZER_OPTIONS_KEY as symbol]: options,
      },
    },
  })

  return { wrapper, ctx }
}

function frameOf(wrapper: VueWrapper): HTMLElement {
  return wrapper.get('[data-cy=canvas-wrapper]').element as HTMLElement
}

function pressE(target: EventTarget): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'e', bubbles: true }),
  )
}

describe('CanvasMain keyboard shortcuts', () => {
  let wrapper: VueWrapper | undefined

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it('answers keys delivered to its own canvas frame', () => {
    const mounted = mountCanvas()
    wrapper = mounted.wrapper

    pressE(frameOf(mounted.wrapper))

    expect(mounted.ctx.canvasHandler.manualMode).toBe(MANUAL_MODE.EDIT)
  })

  it('ignores keys pressed elsewhere on the page', () => {
    const mounted = mountCanvas()
    wrapper = mounted.wrapper

    // INFO: the host's own UI, or just <body> with nothing focused. This is
    // the regression: with the listener on `document` it reached us anyway.
    pressE(document.body)

    expect(mounted.ctx.canvasHandler.manualMode).toBe(MANUAL_MODE.UNSET)
  })

  it('answers keys pressed anywhere while the pointer is over the canvas', () => {
    const mounted = mountCanvas()
    wrapper = mounted.wrapper

    // INFO: hovering counts as "the keys are meant for this digitizer", so the
    // standalone app keeps working on a freshly opened page, before anything
    // has been clicked.
    mounted.wrapper.get('[data-cy=canvas-wrapper]').trigger('mouseenter')
    pressE(document.body)

    expect(mounted.ctx.canvasHandler.manualMode).toBe(MANUAL_MODE.EDIT)
  })

  it('stops answering them once the pointer leaves again', () => {
    const mounted = mountCanvas()
    wrapper = mounted.wrapper

    mounted.wrapper.get('[data-cy=canvas-wrapper]').trigger('mouseenter')
    mounted.wrapper.get('[data-cy=canvas-wrapper]').trigger('mouseleave')
    pressE(document.body)

    expect(mounted.ctx.canvasHandler.manualMode).toBe(MANUAL_MODE.UNSET)
  })

  it('handles a key only once when the frame is both focused and hovered', () => {
    const mounted = mountCanvas()
    wrapper = mounted.wrapper
    const capture = jest.spyOn(mounted.ctx.historyManager, 'capture')

    mounted.wrapper.get('[data-cy=canvas-wrapper]').trigger('mouseenter')
    // INFO: Backspace deletes the active point (addPoint activates it) and
    // goes through historyManager.capture(), which is what counts the handled
    // events: the frame listener and the hover listener on document both see
    // this one keydown, and only one of them may act on it.
    mounted.ctx.datasetRepository.activeDataset.addPoint(10, 10)
    frameOf(mounted.wrapper).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }),
    )

    expect(capture).toHaveBeenCalledTimes(1)
  })

  describe('features.keyboardShortcuts: false', () => {
    it('registers no listener at all', () => {
      const addEventListener = jest.spyOn(document, 'addEventListener')
      const mounted = mountCanvas(false)
      wrapper = mounted.wrapper

      // INFO: mousemove stays on document (it has to cross the image edge —
      // see CanvasMain.mounted), but no key listener may be registered there.
      expect(
        addEventListener.mock.calls.filter(([type]) => type === 'keydown'),
      ).toEqual([])

      mounted.wrapper.get('[data-cy=canvas-wrapper]').trigger('mouseenter')
      pressE(frameOf(mounted.wrapper))
      pressE(document.body)

      expect(mounted.ctx.canvasHandler.manualMode).toBe(MANUAL_MODE.UNSET)
      addEventListener.mockRestore()
    })

    it('leaves the canvas frame out of the host page tab order', () => {
      const off = mountCanvas(false)
      off.wrapper.get('[data-cy=canvas-wrapper]')
      expect(frameOf(off.wrapper).hasAttribute('tabindex')).toBe(false)
      off.wrapper.unmount()

      // INFO: focusable only because the shortcuts need somewhere to arrive.
      const on = mountCanvas(true)
      wrapper = on.wrapper
      expect(frameOf(on.wrapper).getAttribute('tabindex')).toBe('0')
    })
  })
})
