import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'

// INFO: `scale` is what the presentation layer overlays the points with
// (CanvasPoints.vue -> dataset.scaledPoints(canvasHandler.scale)), so it must
// never move unless the canvases actually took the matching size. Otherwise
// the image and the points end up drawn at two different scales.

const IMAGE_WIDTH = 400
const IMAGE_HEIGHT = 200
const WRAPPER_WIDTH = 800
const WRAPPER_HEIGHT = 600
// INFO: mirrors drawFitSizeImage() — min(800/400, 600/200) - 0.01
const EXPECTED_FIT_SCALE = 2 - 0.01

// INFO: jsdom does no layout, so offsetWidth/offsetHeight are always 0 unless
// they are defined explicitly. That is exactly the state a real host produces
// for one frame when it lets flex size the canvas (--sd-canvas-height: 0).
function setWrapperSize(
  wrapper: HTMLDivElement,
  widthPx: number,
  heightPx: number,
): void {
  Object.defineProperty(wrapper, 'offsetWidth', {
    value: widthPx,
    configurable: true,
  })
  Object.defineProperty(wrapper, 'offsetHeight', {
    value: heightPx,
    configurable: true,
  })
}

function createWrapper(widthPx: number, heightPx: number): HTMLDivElement {
  const wrapper = document.createElement('div')
  setWrapperSize(wrapper, widthPx, heightPx)
  return wrapper
}

function attachAllCanvases(
  canvasHandler: CanvasHandler,
  wrapper: HTMLDivElement,
): void {
  canvasHandler.attachCanvases({
    wrapper,
    imageCanvas: document.createElement('canvas'),
    maskCanvas: document.createElement('canvas'),
    tempMaskCanvas: document.createElement('canvas'),
    magnifierMaskCanvas: document.createElement('canvas'),
  })
}

// INFO: what a host that passes `features: { magnifier: false }` produces —
// MagnifierImage.vue owns the magnifier mask canvas and is never mounted, so
// that one canvas is missing while every other one is present.
function attachCanvasesWithoutMagnifier(
  canvasHandler: CanvasHandler,
  wrapper: HTMLDivElement,
): void {
  canvasHandler.attachCanvases({
    wrapper,
    imageCanvas: document.createElement('canvas'),
    maskCanvas: document.createElement('canvas'),
    tempMaskCanvas: document.createElement('canvas'),
  })
}

// INFO: a real <img> only gets a size once it has decoded; the handler reads
// it through originalWidth / originalHeight.
function loadImage(canvasHandler: CanvasHandler): void {
  canvasHandler.imageElement.width = IMAGE_WIDTH
  canvasHandler.imageElement.height = IMAGE_HEIGHT
}

describe('CanvasHandler scaling', () => {
  let canvasHandler: CanvasHandler

  beforeEach(() => {
    canvasHandler = new CanvasHandler()
  })

  describe('drawFitSizeImage', () => {
    it('keeps the scale and remembers the fit when the frame has no layout yet', () => {
      const wrapper = createWrapper(0, 0)
      attachAllCanvases(canvasHandler, wrapper)
      loadImage(canvasHandler)
      const untouchedCanvasWidth = canvasHandler.imageCanvas.element.width

      canvasHandler.drawFitSizeImage()

      // INFO: the regression — this used to become Math.min(0, 0) - 0.01.
      expect(canvasHandler.scale).toBe(1)
      expect(canvasHandler.hasPendingFitSize).toBe(true)
      expect(canvasHandler.imageCanvas.element.width).toBe(untouchedCanvasWidth)
    })

    it('leaves the scale alone and owes nothing when no image is loaded', () => {
      const wrapper = createWrapper(WRAPPER_WIDTH, WRAPPER_HEIGHT)
      attachAllCanvases(canvasHandler, wrapper)

      canvasHandler.drawFitSizeImage()

      expect(canvasHandler.scale).toBe(1)
      // INFO: loading an image calls drawFitSizeImage() again by itself, so
      // there is nothing for a layout change to retry.
      expect(canvasHandler.hasPendingFitSize).toBe(false)
    })

    it('keeps the scale when the canvases are not all attached yet', () => {
      const wrapper = createWrapper(WRAPPER_WIDTH, WRAPPER_HEIGHT)
      canvasHandler.attachCanvases({ wrapper })
      loadImage(canvasHandler)

      canvasHandler.drawFitSizeImage()

      expect(canvasHandler.scale).toBe(1)
      expect(canvasHandler.hasPendingFitSize).toBe(true)
    })

    it('fits the image and resizes the canvases when both are ready', () => {
      const wrapper = createWrapper(WRAPPER_WIDTH, WRAPPER_HEIGHT)
      attachAllCanvases(canvasHandler, wrapper)
      loadImage(canvasHandler)

      canvasHandler.drawFitSizeImage()

      expect(canvasHandler.scale).toBeCloseTo(EXPECTED_FIT_SCALE)
      expect(canvasHandler.hasPendingFitSize).toBe(false)
      expect(canvasHandler.imageCanvas.element.width).toBe(
        Math.trunc(IMAGE_WIDTH * EXPECTED_FIT_SCALE),
      )
      expect(canvasHandler.imageCanvas.element.height).toBe(
        Math.trunc(IMAGE_HEIGHT * EXPECTED_FIT_SCALE),
      )
    })

    it('applies the postponed fit once the frame gets a size', () => {
      const wrapper = createWrapper(0, 0)
      attachAllCanvases(canvasHandler, wrapper)
      loadImage(canvasHandler)
      canvasHandler.drawFitSizeImage()

      // INFO: what the ResizeObserver in CanvasMain.vue reacts to.
      setWrapperSize(wrapper, WRAPPER_WIDTH, WRAPPER_HEIGHT)
      canvasHandler.drawFitSizeImage()

      expect(canvasHandler.scale).toBeCloseTo(EXPECTED_FIT_SCALE)
      expect(canvasHandler.hasPendingFitSize).toBe(false)
      expect(canvasHandler.imageCanvas.element.width).toBe(
        Math.trunc(IMAGE_WIDTH * EXPECTED_FIT_SCALE),
      )
    })
  })

  describe('scaleUp / scaleDown', () => {
    it('does not advance the scale when nothing could be resized', () => {
      loadImage(canvasHandler)

      canvasHandler.scaleUp()
      expect(canvasHandler.scale).toBe(1)

      canvasHandler.scaleDown()
      expect(canvasHandler.scale).toBe(1)
    })

    it('zooms and resizes the canvases when everything is attached', () => {
      const wrapper = createWrapper(WRAPPER_WIDTH, WRAPPER_HEIGHT)
      attachAllCanvases(canvasHandler, wrapper)
      loadImage(canvasHandler)

      canvasHandler.scaleUp()

      expect(canvasHandler.scale).toBeCloseTo(1.1)
      expect(canvasHandler.imageCanvas.element.width).toBe(
        Math.trunc(IMAGE_WIDTH * 1.1),
      )

      canvasHandler.scaleDown()

      expect(canvasHandler.scale).toBeCloseTo(1)
    })

    it('drops a postponed fit so a later layout change cannot override the manual zoom', () => {
      const wrapper = createWrapper(0, 0)
      attachAllCanvases(canvasHandler, wrapper)
      loadImage(canvasHandler)
      canvasHandler.drawFitSizeImage()
      expect(canvasHandler.hasPendingFitSize).toBe(true)

      canvasHandler.scaleUp()

      expect(canvasHandler.scale).toBeCloseTo(1.1)
      expect(canvasHandler.hasPendingFitSize).toBe(false)
    })
  })

  describe('drawOriginalSizeImage', () => {
    it('does not reset the scale when nothing could be resized', () => {
      loadImage(canvasHandler)
      canvasHandler.scale = 2

      canvasHandler.drawOriginalSizeImage()

      expect(canvasHandler.scale).toBe(2)
    })

    it('resets the scale and the canvases when everything is attached', () => {
      const wrapper = createWrapper(0, 0)
      attachAllCanvases(canvasHandler, wrapper)
      loadImage(canvasHandler)
      canvasHandler.drawFitSizeImage()

      canvasHandler.drawOriginalSizeImage()

      expect(canvasHandler.scale).toBe(1)
      expect(canvasHandler.hasPendingFitSize).toBe(false)
      expect(canvasHandler.imageCanvas.element.width).toBe(IMAGE_WIDTH)
    })
  })

  describe('clearImage', () => {
    it('forgets a postponed fit', () => {
      const wrapper = createWrapper(0, 0)
      attachAllCanvases(canvasHandler, wrapper)
      loadImage(canvasHandler)
      canvasHandler.drawFitSizeImage()

      canvasHandler.clearImage()

      expect(canvasHandler.hasPendingFitSize).toBe(false)
    })
  })

  // INFO: regression — hasCanvases used to require the magnifier mask canvas,
  // which MagnifierImage.vue only attaches when features.magnifier is on. A
  // host that hid the magnifier therefore got resize() bailing forever and an
  // image that was never drawn.
  it('fits the image when the host hides the magnifier', () => {
    const wrapper = createWrapper(WRAPPER_WIDTH, WRAPPER_HEIGHT)
    attachCanvasesWithoutMagnifier(canvasHandler, wrapper)
    loadImage(canvasHandler)

    canvasHandler.drawFitSizeImage()

    expect(canvasHandler.scale).toBeCloseTo(EXPECTED_FIT_SCALE)
    expect(canvasHandler.hasPendingFitSize).toBe(false)
    expect(canvasHandler.imageCanvas.element.width).toBe(
      Math.round(IMAGE_WIDTH * EXPECTED_FIT_SCALE),
    )
  })
})
