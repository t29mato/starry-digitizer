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

  // INFO: the follow-up a host measured after the detach fix landed: with
  // `v-if`, three round trips at the FIT scale passed and one at 1:1 came
  // back as a white canvas. The fit retry covers only the first case, because
  // choosing a zoom leaves fit mode — nothing redrew at the chosen scale.
  describe('redraws on remount', () => {
    function loadImage(handler: CanvasHandler): void {
      handler.imageElement.width = 400
      handler.imageElement.height = 200
      handler.setUploadImageUrl('data:image/png;base64,')
    }

    it('draws the image again at a scale the user chose', () => {
      loadImage(canvasHandler)
      const first = canvasSet()
      canvasHandler.attachCanvases(first)
      canvasHandler.drawOriginalSizeImage()
      expect(canvasHandler.scale).toBe(1)
      expect(canvasHandler.imageCanvas.element.width).toBe(400)

      // The host toggles its canvas column with v-if: the elements are
      // destroyed and fresh, empty ones come back.
      canvasHandler.detachCanvases(first)
      const remounted = canvasSet()
      canvasHandler.attachCanvases(remounted)

      expect(remounted.imageCanvas.width).toBe(400)
      expect(remounted.imageCanvas.height).toBe(200)
      expect(canvasHandler.scale).toBe(1)
    })

    it('does not replace the chosen zoom with a fit', () => {
      loadImage(canvasHandler)
      const first = canvasSet()
      canvasHandler.attachCanvases(first)
      canvasHandler.drawOriginalSizeImage()

      canvasHandler.detachCanvases(first)
      canvasHandler.attachCanvases(canvasSet())

      expect(canvasHandler.scale).toBe(1)
      expect(canvasHandler.isFittedToFrame).toBe(false)
    })

    it('brings the mask back with it', () => {
      loadImage(canvasHandler)
      const first = canvasSet()
      canvasHandler.attachCanvases(first)
      canvasHandler.drawOriginalSizeImage()
      canvasHandler.drawPenMask(10, 10, 20)
      expect(canvasHandler.isDrawnMask).toBe(true)

      canvasHandler.detachCanvases(first)
      const remounted = canvasSet()
      // INFO: jsdom's 2D context is a mock, so the mask cannot be asserted in
      // pixels. What is asserted instead is that the NEW mask canvas was
      // drawn into from a source carrying the old one's dimensions — i.e.
      // that the snapshot taken at detach time was replayed. Without it the
      // only drawImage the new mask canvas ever sees is resize()'s copy from
      // itself, which is blank.
      const context = remounted.maskCanvas.getContext(
        '2d',
      ) as CanvasRenderingContext2D
      const drawImage = context.drawImage as jest.Mock
      drawImage.mockClear()

      canvasHandler.attachCanvases(remounted)

      const fromSnapshot = drawImage.mock.calls.some(
        ([source]) =>
          source instanceof HTMLCanvasElement &&
          source !== remounted.maskCanvas &&
          source.width === 400 &&
          source.height === 200,
      )
      expect(fromSnapshot).toBe(true)
      expect(canvasHandler.isDrawnMask).toBe(true)
    })

    it('does not carry a mask onto the next image', () => {
      loadImage(canvasHandler)
      const first = canvasSet()
      canvasHandler.attachCanvases(first)
      canvasHandler.drawOriginalSizeImage()
      canvasHandler.drawPenMask(10, 10, 20)

      canvasHandler.detachCanvases(first)
      canvasHandler.clearImage()
      canvasHandler.attachCanvases(canvasSet())

      expect(canvasHandler.isDrawnMask).toBe(false)
    })

    it('does nothing before an image is loaded', () => {
      // INFO: the normal first mount — attachCanvases() runs before
      // applyImage(), so there is nothing to draw and nothing to guess.
      expect(() => canvasHandler.attachCanvases(canvasSet())).not.toThrow()
      expect(canvasHandler.hasCanvases).toBe(true)
    })
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
