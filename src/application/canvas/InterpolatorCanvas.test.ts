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

    it('is false when only the guide canvas is set', () => {
      interpolatorCanvas.setGuideCanvas(new HTMLCanvas(createCanvasElement()))
      expect(interpolatorCanvas.hasCanvas()).toBe(false)
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
    it('throws if the magnifier canvas is not set', () => {
      expect(() => interpolatorCanvas.clearMagnifierCanvasContext()).toThrow(
        'interpolator guide canvas is not set',
      )
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
    it('does nothing when either canvas is missing', () => {
      const guideCanvas = new HTMLCanvas(createCanvasElement())
      interpolatorCanvas.setGuideCanvas(guideCanvas)

      interpolatorCanvas.resize(100, 100)

      expect(guideCanvas.element.width).not.toBe(100)
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
})
