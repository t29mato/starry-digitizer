// INFO: who owns a canvas slot. Reported from a host that composes the panels
// itself (friction report S3-4): mounting a second <CanvasMain> against one
// context made the first stop drawing, and then UNMOUNTING the second one
// detached the first one's canvases too — a mounted, visible digitizer wired
// to nothing, with no exception and nothing in the DOM to see. A host that
// hides its canvas column with `v-if` (the obvious thing to write) hits it,
// which is why that host gave up an overlay layout and used `v-show`.
import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import type { AttachedCanvasElements } from '@/application/services/canvasHandler/canvasHandlerInterface'

/** The four elements one <CanvasMain> lends the engine. */
function canvasSet(): Required<
  Omit<AttachedCanvasElements, 'magnifierMaskCanvas'>
> {
  return {
    wrapper: document.createElement('div'),
    imageCanvas: document.createElement('canvas'),
    maskCanvas: document.createElement('canvas'),
    tempMaskCanvas: document.createElement('canvas'),
  }
}

describe('CanvasHandler canvas ownership', () => {
  let canvasHandler: CanvasHandler
  let warn: jest.SpyInstance

  beforeEach(() => {
    canvasHandler = new CanvasHandler()
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    warn.mockRestore()
  })

  it('keeps the second component attached when the first unmounts', () => {
    const first = canvasSet()
    const second = canvasSet()

    canvasHandler.attachCanvases(first)
    canvasHandler.attachCanvases(second)

    // The first component unmounts and offers ITS elements back. They are no
    // longer the attached ones, so nothing is given back.
    canvasHandler.detachCanvases(first)

    expect(canvasHandler.hasCanvases).toBe(true)
    expect(canvasHandler.imageCanvas.element).toBe(second.imageCanvas)
    expect(canvasHandler.canvasWrapper).toBe(second.wrapper)
  })

  it('detaches the elements a component still owns', () => {
    const only = canvasSet()

    canvasHandler.attachCanvases(only)
    canvasHandler.detachCanvases(only)

    expect(canvasHandler.hasCanvases).toBe(false)
  })

  it('leaves another component’s slot alone', () => {
    const main = canvasSet()
    const magnifierMaskCanvas = document.createElement('canvas')

    canvasHandler.attachCanvases(main)
    canvasHandler.attachCanvases({ magnifierMaskCanvas })

    // MagnifierImage unmounts on its own (features.magnifier turned off).
    canvasHandler.detachCanvases({ magnifierMaskCanvas })

    expect(canvasHandler.hasCanvases).toBe(true)
    expect(canvasHandler.imageCanvas.element).toBe(main.imageCanvas)
  })

  it('still detaches unconditionally by key, for a full teardown', () => {
    canvasHandler.attachCanvases(canvasSet())

    canvasHandler.detachCanvases()

    expect(canvasHandler.hasCanvases).toBe(false)
  })

  // INFO: two <CanvasMain> against one context remains unsupported — the
  // second attach wins. The warning is the only notice a host gets, since
  // the first one goes on rendering normally while drawing nowhere.
  it('warns when a second component takes a slot that was taken', () => {
    canvasHandler.attachCanvases(canvasSet())
    warn.mockClear()

    canvasHandler.attachCanvases(canvasSet())

    expect(warn).toHaveBeenCalled()
    expect(warn.mock.calls[0][0]).toContain('attachCanvases')
  })

  it('says nothing when the same elements are attached again', () => {
    const same = canvasSet()

    canvasHandler.attachCanvases(same)
    warn.mockClear()
    // INFO: the normal case — a component remounts, or attaches once per
    // watcher run.
    canvasHandler.attachCanvases(same)

    expect(warn).not.toHaveBeenCalled()
  })

  it('says nothing when a component attaches a slot nobody holds', () => {
    canvasHandler.attachCanvases(canvasSet())
    warn.mockClear()

    // INFO: MagnifierImage.vue mounts separately and lends one canvas.
    canvasHandler.attachCanvases({
      magnifierMaskCanvas: document.createElement('canvas'),
    })

    expect(warn).not.toHaveBeenCalled()
  })
})
