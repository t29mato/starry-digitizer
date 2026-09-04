import { Extractor } from './extractor'
import SymbolExtractByArea from '@/application/strategies/extractStrategies/symbolExtractByArea'
import { PixelSource } from '@/application/ports/pixelSource'

// INFO: this file is the demonstration that automatic extraction no longer
// needs a canvas. Nothing below touches `document`, `HTMLCanvasElement` or
// `CanvasHandler` — the extractor is driven by a hand-built PixelSource.

// INFO: 3x3 image, red pixel at the top-left and at the bottom-right, the rest
// transparent black. RGBA, row-major.
const RED = [255, 0, 0, 0]
const BLANK = [0, 0, 0, 0]
const imagePixels = new Uint8ClampedArray([
  ...RED,
  ...BLANK,
  ...BLANK,
  ...BLANK,
  ...BLANK,
  ...BLANK,
  ...BLANK,
  ...BLANK,
  ...RED,
])

const source: PixelSource = {
  width: 3,
  height: 3,
  getImagePixels: () => imagePixels,
  // INFO: no mask drawn, so the strategy never reads these pixels.
  getMaskPixels: () => new Uint8ClampedArray(0),
  hasMask: false,
}

test('Extractor runs against a plain PixelSource with no canvas', () => {
  const strategy = new SymbolExtractByArea()
  strategy.minDiameterPx = 0
  strategy.maxDiameterPx = 1000

  const extractor = new Extractor(strategy)
  extractor.setColorPicker('#ff0000ff')
  extractor.setColorDistancePct(10)

  expect(extractor.execute(source)).toEqual([
    { xPx: 0.5, yPx: 0.5 },
    { xPx: 2.5, yPx: 2.5 },
  ])
})
