import { BrowserPixelSourceAdapter } from './browserPixelSourceAdapter'
import { CanvasHandler } from '../services/canvasHandler/canvasHandler'

describe('BrowserPixelSourceAdapter', () => {
  let canvasHandler: CanvasHandler
  let adapter: BrowserPixelSourceAdapter

  beforeEach(() => {
    document.body.innerHTML = '<canvas id="maskCanvas"></canvas>'
    canvasHandler = new CanvasHandler()
    canvasHandler.imageElement.width = 40
    canvasHandler.imageElement.height = 20
    adapter = new BrowserPixelSourceAdapter(canvasHandler)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('width / height / isDrawnMask', () => {
    test('reflect the underlying canvasHandler (originalWidth/originalHeight/isDrawnMask)', () => {
      expect(adapter.width).toBe(40)
      expect(adapter.height).toBe(20)
      expect(adapter.isDrawnMask).toBe(false)
    })

    test('isDrawnMask tracks live changes on canvasHandler (not snapshotted)', () => {
      expect(adapter.isDrawnMask).toBe(false)
      canvasHandler.isDrawnMask = true
      expect(adapter.isDrawnMask).toBe(true)
    })
  })

  // INFO: captures the mocked CanvasRenderingContext2D that
  // HTMLCanvasElement.prototype.getContext('2d') returns (see
  // jest.setup.js), so we can assert on how the adapter drew into it.
  function captureNextContext(): { ctx: any } {
    const box: { ctx: any } = { ctx: undefined }
    const original = HTMLCanvasElement.prototype.getContext
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function (
        this: HTMLCanvasElement,
        ...args: Parameters<typeof original>
      ) {
        box.ctx = original.apply(this, args)
        return box.ctx
      })
    return box
  }

  describe('getImageColors', () => {
    test('draws canvasHandler.imageElement onto a width x height offscreen canvas', () => {
      const box = captureNextContext()

      const colors = adapter.getImageColors()

      expect(box.ctx.drawImage).toHaveBeenCalledWith(
        canvasHandler.imageElement,
        0,
        0,
        40,
        20,
      )
      expect(colors).toBeInstanceOf(Uint8ClampedArray)
      expect(colors.length).toBe(40 * 20 * 4)
    })
  })

  describe('getMaskColors', () => {
    test('draws the #maskCanvas element onto a width x height offscreen canvas', () => {
      const maskCanvasElement = document.getElementById('maskCanvas')
      const box = captureNextContext()

      const colors = adapter.getMaskColors()

      expect(box.ctx.drawImage).toHaveBeenCalledWith(
        maskCanvasElement,
        0,
        0,
        40,
        20,
      )
      expect(colors).toBeInstanceOf(Uint8ClampedArray)
      expect(colors.length).toBe(40 * 20 * 4)
    })

    test('throws when #maskCanvas is not present in the DOM (via HTMLCanvas)', () => {
      document.body.innerHTML = ''
      expect(() => adapter.getMaskColors()).toThrow(
        'element ID maskCanvas is not instance of a HTMLCanvasElement',
      )
    })
  })
})
