// INFO: the fit-to-frame retry, which used to be a recipe only CanvasMain.vue
// knew: `attachCanvases()` must precede `applyImage()` and the wrapper must
// already have layout when the image arrives, and NEITHER rule fails loudly —
// drawFitSizeImage() bails out, the host gets a resolved promise and the right
// originalWidth/originalHeight, and the canvas stays blank. A core-only host
// had to reimplement an observer it had no way to know about, so the engine
// runs it now (CanvasHandler.attachCanvases -> observeWrapper).
import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'

const IMAGE_WIDTH = 400
const IMAGE_HEIGHT = 200
const WRAPPER_WIDTH = 800
const WRAPPER_HEIGHT = 600
// INFO: mirrors drawFitSizeImage() — min(800/400, 600/200) - 0.01
const EXPECTED_FIT_SCALE = 2 - 0.01

// INFO: jsdom has no ResizeObserver at all, so this stub is both the thing
// under test and the thing that proves the guard around it is needed. It does
// not fire on observe() the way the real one does; every callback here is
// driven explicitly, so a test that passes cannot be passing by accident.
class ResizeObserverStub {
  static instances: ResizeObserverStub[] = []
  readonly observed: Element[] = []
  disconnected = false

  constructor(private readonly callback: () => void) {
    ResizeObserverStub.instances.push(this)
  }

  observe(element: Element): void {
    this.observed.push(element)
  }

  unobserve(): void {
    // INFO: unused by the handler; present so the stub matches the interface.
  }

  disconnect(): void {
    this.disconnected = true
  }

  trigger(): void {
    this.callback()
  }
}

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
  })
}

function loadImage(canvasHandler: CanvasHandler): void {
  canvasHandler.imageElement.width = IMAGE_WIDTH
  canvasHandler.imageElement.height = IMAGE_HEIGHT
}

/** The observer the handler created for the wrapper, or undefined. */
function lastObserver(): ResizeObserverStub | undefined {
  return ResizeObserverStub.instances[ResizeObserverStub.instances.length - 1]
}

describe('CanvasHandler retries a postponed fit by itself', () => {
  let canvasHandler: CanvasHandler

  beforeEach(() => {
    ResizeObserverStub.instances = []
    ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub
    canvasHandler = new CanvasHandler()
  })

  afterEach(() => {
    delete (globalThis as unknown as { ResizeObserver?: unknown })
      .ResizeObserver
  })

  it('observes the wrapper it was lent', () => {
    const wrapper = createWrapper(0, 0)
    attachAllCanvases(canvasHandler, wrapper)

    expect(ResizeObserverStub.instances).toHaveLength(1)
    expect(lastObserver()?.observed).toStrictEqual([wrapper])
  })

  it('applies the postponed fit when the frame gets a size', () => {
    const wrapper = createWrapper(0, 0)
    attachAllCanvases(canvasHandler, wrapper)
    loadImage(canvasHandler)

    canvasHandler.drawFitSizeImage()
    expect(canvasHandler.hasPendingFitSize).toBe(true)
    expect(canvasHandler.scale).toBe(1)

    setWrapperSize(wrapper, WRAPPER_WIDTH, WRAPPER_HEIGHT)
    lastObserver()?.trigger()

    expect(canvasHandler.hasPendingFitSize).toBe(false)
    expect(canvasHandler.scale).toBeCloseTo(EXPECTED_FIT_SCALE)
    expect(canvasHandler.imageCanvas.element.width).toBe(
      Math.trunc(IMAGE_WIDTH * EXPECTED_FIT_SCALE),
    )
  })

  // INFO: reported from a real host (friction report S3-1): a figure that had
  // already been fitted stayed at the old scale — and was silently clipped on
  // the right — when only the FRAME changed (a split view opening, the window
  // narrowing 1920 -> 1440). `hasPendingFitSize` is false by then, so the
  // retry alone did not cover it; `isFittedToFrame` is what does.
  it('re-fits when the frame alone changes after a successful fit', () => {
    const wrapper = createWrapper(WRAPPER_WIDTH, WRAPPER_HEIGHT)
    attachAllCanvases(canvasHandler, wrapper)
    loadImage(canvasHandler)

    canvasHandler.drawFitSizeImage()
    expect(canvasHandler.hasPendingFitSize).toBe(false)
    expect(canvasHandler.isFittedToFrame).toBe(true)
    expect(canvasHandler.scale).toBeCloseTo(EXPECTED_FIT_SCALE)

    // INFO: the canvas column halves — the case the report measured.
    setWrapperSize(wrapper, WRAPPER_WIDTH / 2, WRAPPER_HEIGHT)
    lastObserver()?.trigger()

    // min(400/400, 600/200) - 0.01
    expect(canvasHandler.scale).toBeCloseTo(1 - 0.01)
    expect(canvasHandler.imageCanvas.element.width).toBe(
      Math.trunc(IMAGE_WIDTH * (1 - 0.01)),
    )
    expect(canvasHandler.isFittedToFrame).toBe(true)
  })

  it('leaves fit mode for good once the user picks a zoom', () => {
    const wrapper = createWrapper(WRAPPER_WIDTH, WRAPPER_HEIGHT)
    attachAllCanvases(canvasHandler, wrapper)
    loadImage(canvasHandler)

    canvasHandler.drawFitSizeImage()
    expect(canvasHandler.isFittedToFrame).toBe(true)

    canvasHandler.drawOriginalSizeImage()
    expect(canvasHandler.isFittedToFrame).toBe(false)

    setWrapperSize(wrapper, WRAPPER_WIDTH / 2, WRAPPER_HEIGHT)
    lastObserver()?.trigger()

    expect(canvasHandler.scale).toBe(1)
  })

  // INFO: the guard that lets the retry exist at all. Without it a sidebar
  // opening would undo the zoom.
  it('never overrides a zoom the user chose', () => {
    const wrapper = createWrapper(WRAPPER_WIDTH, WRAPPER_HEIGHT)
    attachAllCanvases(canvasHandler, wrapper)
    loadImage(canvasHandler)

    canvasHandler.scaleUp()
    expect(canvasHandler.scale).toBeCloseTo(1.1)
    expect(canvasHandler.hasPendingFitSize).toBe(false)

    lastObserver()?.trigger()

    expect(canvasHandler.scale).toBeCloseTo(1.1)
  })

  it('does not stack observers when the same wrapper is attached again', () => {
    const wrapper = createWrapper(0, 0)
    attachAllCanvases(canvasHandler, wrapper)
    attachAllCanvases(canvasHandler, wrapper)

    expect(ResizeObserverStub.instances).toHaveLength(1)
    expect(lastObserver()?.disconnected).toBe(false)
  })

  it('leaves the observer alone when a component attaches only its own canvas', () => {
    const wrapper = createWrapper(0, 0)
    attachAllCanvases(canvasHandler, wrapper)

    // INFO: MagnifierImage.vue mounts separately and passes no wrapper.
    canvasHandler.attachCanvases({
      magnifierMaskCanvas: document.createElement('canvas'),
    })

    expect(ResizeObserverStub.instances).toHaveLength(1)
    expect(lastObserver()?.disconnected).toBe(false)
  })

  it('moves to the new wrapper when a different one is attached', () => {
    const first = createWrapper(0, 0)
    attachAllCanvases(canvasHandler, first)
    const firstObserver = lastObserver()

    const second = createWrapper(0, 0)
    attachAllCanvases(canvasHandler, second)

    expect(firstObserver?.disconnected).toBe(true)
    expect(ResizeObserverStub.instances).toHaveLength(2)
    expect(lastObserver()?.observed).toStrictEqual([second])
  })

  it('disconnects when the wrapper is taken back', () => {
    const wrapper = createWrapper(0, 0)
    attachAllCanvases(canvasHandler, wrapper)
    const observer = lastObserver()

    canvasHandler.detachCanvases(['wrapper'])

    expect(observer?.disconnected).toBe(true)
  })

  it('disconnects on a full teardown', () => {
    const wrapper = createWrapper(0, 0)
    attachAllCanvases(canvasHandler, wrapper)
    const observer = lastObserver()

    canvasHandler.detachCanvases()

    expect(observer?.disconnected).toBe(true)
  })
})

describe('CanvasHandler without ResizeObserver', () => {
  it('attaches and detaches normally (jsdom, older browsers)', () => {
    // INFO: no stub installed here — this is the guard around `typeof
    // ResizeObserver`. A host without it simply gets no retry.
    const canvasHandler = new CanvasHandler()
    const wrapper = createWrapper(WRAPPER_WIDTH, WRAPPER_HEIGHT)

    expect(() => attachAllCanvases(canvasHandler, wrapper)).not.toThrow()
    expect(() => canvasHandler.detachCanvases()).not.toThrow()
  })
})
