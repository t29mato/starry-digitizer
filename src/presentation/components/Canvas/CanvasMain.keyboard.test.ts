import { mount, VueWrapper } from '@vue/test-utils'
import CanvasMain from '@/presentation/components/Canvas/CanvasMain.vue'
import { createDigitizerContext } from '@/application/digitizerContext'
import type { DigitizerContext } from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import {
  DIGITIZER_OPTIONS_KEY,
  createDigitizerOptions,
  type StarryDigitizerFeatures,
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
function mountCanvas(
  features: Partial<StarryDigitizerFeatures> = {},
): {
  wrapper: VueWrapper
  ctx: DigitizerContext
} {
  const ctx = createDigitizerContext()
  const options = createDigitizerOptions({ features })

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

function pressUndo(target: EventTarget): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'z',
    metaKey: true,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  return event
}

function press(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  return event
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
      const mounted = mountCanvas({ keyboardShortcuts: false })
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
      const off = mountCanvas({ keyboardShortcuts: false })
      off.wrapper.get('[data-cy=canvas-wrapper]')
      expect(frameOf(off.wrapper).hasAttribute('tabindex')).toBe(false)
      off.wrapper.unmount()

      // INFO: focusable only because the shortcuts need somewhere to arrive.
      const on = mountCanvas({ keyboardShortcuts: true })
      wrapper = on.wrapper
      expect(frameOf(on.wrapper).getAttribute('tabindex')).toBe('0')
    })
  })

  describe('the keyboard feature groups', () => {
    // INFO: `keyboardShortcuts` used to be all-or-nothing, which left an
    // embedding host with two bad choices: let the digitizer answer ⌘Z too
    // (one press, two undos), or lose the arrow keys / Delete / zoom / mode
    // keys and reimplement them — capture placement, `e.repeat` bundling and
    // all. The groups exist so the host can take ⌘Z and keep the rest.
    it('answers ⌘Z by default', () => {
      const mounted = mountCanvas()
      wrapper = mounted.wrapper
      const undo = jest.spyOn(mounted.ctx.historyManager, 'undo')

      const event = pressUndo(frameOf(mounted.wrapper))

      expect(undo).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(true)
    })

    describe('keyboardShortcuts: false, keyboardEditing: true', () => {
      // INFO: the embedding host's configuration, verbatim.
      const embedded = { keyboardShortcuts: false, keyboardEditing: true }

      it('leaves ⌘Z to the host', () => {
        const mounted = mountCanvas(embedded)
        wrapper = mounted.wrapper
        const undo = jest.spyOn(mounted.ctx.historyManager, 'undo')

        const event = pressUndo(frameOf(mounted.wrapper))

        expect(undo).not.toHaveBeenCalled()
        // INFO: not swallowed either — the host's own handler still runs, and
        // still gets to decide whether to preventDefault().
        expect(event.defaultPrevented).toBe(false)
      })

      it('still nudges the selected points with the arrow keys', () => {
        const mounted = mountCanvas(embedded)
        wrapper = mounted.wrapper
        const dataset = mounted.ctx.datasetRepository.activeDataset
        dataset.addPoint(10, 10)

        press(frameOf(mounted.wrapper), 'ArrowRight')

        expect(dataset.points[0].xPx).toBe(11)
      })

      it('still deletes the selected points with Delete', () => {
        const mounted = mountCanvas(embedded)
        wrapper = mounted.wrapper
        const dataset = mounted.ctx.datasetRepository.activeDataset
        dataset.addPoint(10, 10)

        press(frameOf(mounted.wrapper), 'Delete')

        expect(dataset.points).toEqual([])
      })

      it('still switches the manual mode and keeps the frame focusable', () => {
        const mounted = mountCanvas(embedded)
        wrapper = mounted.wrapper

        pressE(frameOf(mounted.wrapper))

        expect(mounted.ctx.canvasHandler.manualMode).toBe(MANUAL_MODE.EDIT)
        // INFO: the editing keys arrive through focus, so the tabindex is
        // needed exactly as much as it is with every group on.
        expect(frameOf(mounted.wrapper).getAttribute('tabindex')).toBe('0')
      })

      it('leaves ⌘S and ⌘O to the host as well', () => {
        const mounted = mountCanvas(embedded)
        wrapper = mounted.wrapper

        const save = new KeyboardEvent('keydown', {
          key: 's',
          metaKey: true,
          bubbles: true,
          cancelable: true,
        })
        frameOf(mounted.wrapper).dispatchEvent(save)

        expect(save.defaultPrevented).toBe(false)
      })
    })

    it('lets an explicit group flag win over keyboardShortcuts', () => {
      const mounted = mountCanvas({
        keyboardShortcuts: true,
        keyboardHistory: false,
      })
      wrapper = mounted.wrapper
      const undo = jest.spyOn(mounted.ctx.historyManager, 'undo')

      pressUndo(frameOf(mounted.wrapper))
      pressE(frameOf(mounted.wrapper))

      expect(undo).not.toHaveBeenCalled()
      expect(mounted.ctx.canvasHandler.manualMode).toBe(MANUAL_MODE.EDIT)
    })

    it('lets ⌘Z through to the host, on the frame and on document alike', () => {
      // INFO: what the host actually needs from keyboardHistory: false. The
      // frame listener still exists (the editing group is on) and, while the
      // pointer is over the frame, so does the document one — neither may act
      // on ⌘Z or call preventDefault() on it.
      const mounted = mountCanvas({ keyboardHistory: false })
      wrapper = mounted.wrapper
      const undo = jest.spyOn(mounted.ctx.historyManager, 'undo')
      const seenByHost: boolean[] = []
      const onHostKey = (e: Event) => seenByHost.push(e.defaultPrevented)
      // INFO: a host listening the way the ⌘Z recipe tells it to — one
      // listener on document, plus (belt and braces) one on the frame the
      // digitizer occupies.
      document.addEventListener('keydown', onHostKey)
      frameOf(mounted.wrapper).addEventListener('keydown', onHostKey)
      mounted.wrapper.get('[data-cy=canvas-wrapper]').trigger('mouseenter')

      try {
        pressUndo(frameOf(mounted.wrapper))
        pressUndo(document.body)
      } finally {
        document.removeEventListener('keydown', onHostKey)
      }

      expect(undo).not.toHaveBeenCalled()
      // INFO: one press on the frame, one anywhere else while hovering; both
      // reached the host's listener, neither arrived already preventDefault()ed.
      expect(seenByHost).toEqual([false, false])
    })
  })
})
