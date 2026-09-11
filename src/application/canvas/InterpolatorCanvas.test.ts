import { expect, describe, it, beforeEach } from '@jest/globals'
import { InterpolatorCanvas } from './InterpolatorCanvas'
import { HTMLCanvas } from './HTMLCanvas'

// INFO: HTMLCanvas now wraps an element handed to it, so the tests build
// detached canvas elements instead of registering ids in the document.
function createCanvasElement(): HTMLCanvasElement {
  return document.createElement('canvas')
}

describe('InterpolatorCanvas', () => {
  let interpolatorCanvas: InterpolatorCanvas

  beforeEach(() => {
    document.body.innerHTML = ''
    interpolatorCanvas = new InterpolatorCanvas()
  })

  describe('hasCanvas', () => {
    it('is false before any canvas is set', () => {
      expect(interpolatorCanvas.hasCanvas()).toBe(false)
    })

    // INFO: regression — hasCanvas() used to require the magnifier canvas too.
    // MagnifierImage.vue is the only thing that sets it and it lives behind
    // `features.magnifier`, so a host that hid the magnifier made
    // interpolator.resizeCanvas() a permanent no-op and the guide canvas was
    // never sized.
    it('is true with only the guide canvas — the magnifier one is optional', () => {
      interpolatorCanvas.setGuideCanvas(new HTMLCanvas(createCanvasElement()))
      expect(interpolatorCanvas.hasCanvas()).toBe(true)
    })

    it('is true once both canvases are set', () => {
      interpolatorCanvas.setGuideCanvas(new HTMLCanvas(createCanvasElement()))
      interpolatorCanvas.setMagnifierCanvas(new HTMLCanvas(createCanvasElement()))
      expect(interpolatorCanvas.hasCanvas()).toBe(true)
    })
  })

  describe('clearGuideCanvasContext', () => {
    it('throws if the guide canvas is not set', () => {
      expect(() => interpolatorCanvas.clearGuideCanvasContext()).toThrow(
        'interpolator guide canvas is not set',
      )
    })

    it('clears the guide canvas context', () => {
      const guideCanvas = new HTMLCanvas(createCanvasElement())
      interpolatorCanvas.setGuideCanvas(guideCanvas)

      interpolatorCanvas.clearGuideCanvasContext()

      expect(guideCanvas.context.clearRect).toHaveBeenCalledWith(
        0,
        0,
        guideCanvas.element.width,
        guideCanvas.element.height,
      )
    })
  })

  describe('clearMagnifierCanvasContext', () => {
    // INFO: was "throws if the magnifier canvas is not set". It is a mirror of
    // the guide canvas and is absent whenever the host hides the magnifier, so
    // throwing turned a supported configuration into a crash.
    it('does nothing if the magnifier canvas is not set', () => {
      expect(() =>
        interpolatorCanvas.clearMagnifierCanvasContext(),
      ).not.toThrow()
    })

    it('clears the magnifier canvas context', () => {
      const magnifierCanvas = new HTMLCanvas(createCanvasElement())
      interpolatorCanvas.setMagnifierCanvas(magnifierCanvas)

      interpolatorCanvas.clearMagnifierCanvasContext()

      expect(magnifierCanvas.context.clearRect).toHaveBeenCalledWith(
        0,
        0,
        magnifierCanvas.element.width,
        magnifierCanvas.element.height,
      )
    })
  })

  describe('drawInterpolationLine', () => {
    it('throws if the guide canvas is not set', () => {
      expect(() =>
        interpolatorCanvas.drawInterpolationLine(
          [{ xPx: 0, yPx: 0 }],
          1,
        ),
      ).toThrow('interpolator guide canvas is not set')
    })

    it('strokes a path through the scaled coordinates and copies it to the magnifier canvas', () => {
      const guideCanvas = new HTMLCanvas(createCanvasElement())
      const magnifierCanvas = new HTMLCanvas(createCanvasElement())
      interpolatorCanvas.setGuideCanvas(guideCanvas)
      interpolatorCanvas.setMagnifierCanvas(magnifierCanvas)

      interpolatorCanvas.drawInterpolationLine(
        [
          { xPx: 1, yPx: 2 },
          { xPx: 3, yPx: 4 },
        ],
        10,
      )

      expect(guideCanvas.context.moveTo).toHaveBeenCalledWith(10, 20)
      expect(guideCanvas.context.lineTo).toHaveBeenCalledWith(30, 40)
      expect(guideCanvas.context.stroke).toHaveBeenCalled()
      expect(magnifierCanvas.context.drawImage).toHaveBeenCalledWith(
        guideCanvas.element,
        0,
        0,
        guideCanvas.element.width,
        guideCanvas.element.height,
      )
    })
  })

  describe('resize', () => {
    it('does nothing when the guide canvas is missing', () => {
      const magnifierCanvas = new HTMLCanvas(createCanvasElement())
      interpolatorCanvas.setMagnifierCanvas(magnifierCanvas)

      interpolatorCanvas.resize(100, 100)

      expect(magnifierCanvas.element.width).not.toBe(100)
    })

    // INFO: was asserting the opposite. The guide canvas is the one the
    // overlay is drawn on, so it must take the size even when no magnifier is
    // mounted (features.magnifier: false).
    it('resizes the guide canvas without a magnifier canvas', () => {
      const guideCanvas = new HTMLCanvas(createCanvasElement())
      interpolatorCanvas.setGuideCanvas(guideCanvas)

      interpolatorCanvas.resize(100, 100)

      expect(guideCanvas.element.width).toBe(100)
    })

    it('resizes both canvases and copies the guide canvas onto the magnifier canvas', () => {
      const guideCanvas = new HTMLCanvas(createCanvasElement())
      const magnifierCanvas = new HTMLCanvas(createCanvasElement())
      interpolatorCanvas.setGuideCanvas(guideCanvas)
      interpolatorCanvas.setMagnifierCanvas(magnifierCanvas)

      interpolatorCanvas.resize(200, 150)

      expect(guideCanvas.element.width).toBe(200)
      expect(guideCanvas.element.height).toBe(150)
      expect(magnifierCanvas.element.width).toBe(200)
      expect(magnifierCanvas.element.height).toBe(150)
      expect(magnifierCanvas.context.drawImage).toHaveBeenCalledWith(
        guideCanvas.element,
        0,
        0,
        200,
        150,
      )
    })
  })

  describe('without a magnifier canvas (features.magnifier: false)', () => {
    it('still resizes the guide canvas', () => {
      const guide = createCanvasElement()
      interpolatorCanvas.setGuideCanvas(new HTMLCanvas(guide))

      interpolatorCanvas.resize(640, 480)

      expect(guide.width).toBe(640)
      expect(guide.height).toBe(480)
    })

    it('clearMagnifierCanvasContext is a no-op instead of throwing', () => {
      interpolatorCanvas.setGuideCanvas(new HTMLCanvas(createCanvasElement()))

      expect(() => interpolatorCanvas.clearMagnifierCanvasContext()).not.toThrow()
    })
  })
})
