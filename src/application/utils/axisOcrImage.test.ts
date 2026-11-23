import {
  bandScale,
  clampRect,
  cropAndScale,
  GrayImage,
  labelBands,
  normalizePolarity,
  rgbaToGray,
  wordsFromBand,
} from './axisOcrImage'

const gray = (width: number, height: number, fill = 255): GrayImage => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height).fill(fill),
})

describe('axisOcrImage', () => {
  describe('rgbaToGray', () => {
    test('weights the channels by luminance', () => {
      const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255])
      expect(Array.from(rgbaToGray(rgba, 2, 1).data)).toStrictEqual([76, 29])
    })

    test('takes a transparent pixel as white paper', () => {
      const rgba = new Uint8ClampedArray([0, 0, 0, 0])
      expect(Array.from(rgbaToGray(rgba, 1, 1).data)).toStrictEqual([255])
    })
  })

  describe('normalizePolarity', () => {
    test('keeps dark text on a light page as it is', () => {
      const image = gray(4, 1)
      image.data[0] = 0
      expect(normalizePolarity(image)).toBe(image)
    })

    test('inverts a light-on-dark figure', () => {
      const image = gray(4, 1, 0)
      image.data[0] = 255
      expect(Array.from(normalizePolarity(image).data)).toStrictEqual([
        0, 255, 255, 255,
      ])
    })
  })

  describe('clampRect', () => {
    test('keeps the rect inside the image, on whole pixels', () => {
      expect(
        clampRect({ x: -5.5, y: 2.2, width: 20, height: 3 }, 10, 4),
      ).toStrictEqual({ x: 0, y: 2, width: 10, height: 2 })
    })
  })

  describe('cropAndScale', () => {
    test('enlarges the crop and adds a white margin', () => {
      const image = gray(4, 4)
      image.data[1 * 4 + 1] = 0
      const out = cropAndScale(image, { x: 1, y: 1, width: 2, height: 2 }, 2, 3)
      expect(out.width).toBe(2 * 2 + 6)
      expect(out.height).toBe(2 * 2 + 6)
      expect(out.data[0]).toBe(255)
      // INFO: the dark source pixel lands on the first enlarged pixel
      expect(out.data[3 * out.width + 3]).toBeLessThan(128)
      expect(out.data[6 * out.width + 6]).toBe(255)
    })
  })

  describe('bandScale', () => {
    test.each([
      [600, 400, 3],
      [1000, 800, 2],
      [2500, 3000, 1],
    ])('%d x %d figure: %d x', (w, h, scale) => {
      expect(bandScale(w, h)).toBe(scale)
    })
  })

  describe('labelBands', () => {
    const coords = {
      x1: { xPx: 100, yPx: 400 },
      x2: { xPx: 900, yPx: 400 },
      y1: { xPx: 100, yPx: 400 },
      y2: { xPx: 100, yPx: 50 },
    }

    test('a strip below the x axis and one left of the y axis', () => {
      const bands = labelBands(gray(1000, 500), coords)
      expect(bands.map((b) => [b.axis, b.rect])).toStrictEqual([
        ['x', { x: 0, y: 385, width: 1000, height: 115 }],
        ['y', { x: 0, y: 0, width: 130, height: 500 }],
      ])
      expect(bands[0].scale).toBe(2)
      expect(bands[0].image.width).toBe(1000 * 2 + 2 * bands[0].pad)
    })

    test('a strip right of a right-hand y axis', () => {
      const bands = labelBands(gray(1000, 500), {
        ...coords,
        y1: { xPx: 900, yPx: 400 },
        y2: { xPx: 900, yPx: 50 },
      })
      expect(bands[1].rect).toStrictEqual({
        x: 870,
        y: 0,
        width: 130,
        height: 500,
      })
    })

    test('no strip for an axis without markers', () => {
      const bands = labelBands(gray(1000, 500), { x1: coords.x1 })
      expect(bands.map((b) => b.axis)).toStrictEqual(['x'])
    })
  })

  describe('wordsFromBand', () => {
    test('moves word boxes back to figure pixels', () => {
      const band = {
        axis: 'x' as const,
        rect: { x: 10, y: 100, width: 50, height: 20 },
        scale: 2,
        pad: 10,
        image: gray(1, 1),
      }
      const words = [{ text: '5', bbox: { x0: 10, y0: 30, x1: 30, y1: 50 } }]
      expect(wordsFromBand(words, band)).toStrictEqual([
        { text: '5', bbox: { x0: 10, y0: 110, x1: 20, y1: 120 } },
      ])
    })
  })
})
