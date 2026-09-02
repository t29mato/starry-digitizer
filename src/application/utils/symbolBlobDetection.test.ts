import {
  floodFillBlob,
  centroidOfPixels,
  diameterFromPixelCount,
} from './symbolBlobDetection'

describe('floodFillBlob', () => {
  function createImageData(pixels: number[][]): Uint8ClampedArray {
    // pixels: [[r,g,b,a], ...]
    return new Uint8ClampedArray(pixels.flat())
  }

  it('collects only the connected, color-matching pixels reachable from the seed', () => {
    // r r w
    // r w w
    // w w r  <- isolated, unreachable from the top-left blob
    const width = 3
    const height = 3
    const red = [255, 0, 0, 255]
    const white = [255, 255, 255, 255]
    const imageColors = createImageData([
      red, red, white,
      red, white, white,
      white, white, red,
    ])
    const bounds = { minX: 0, minY: 0, maxXExclusive: width, maxYExclusive: height }
    const visitedArea: boolean[][] = [...Array(height)].map(() =>
      Array(width).fill(false),
    )

    const pixels = floodFillBlob(
      0,
      0,
      width,
      imageColors,
      [255, 0, 0],
      10,
      visitedArea,
      bounds,
    )

    expect(pixels.sort((a, b) => a.xPx - b.xPx || a.yPx - b.yPx)).toEqual([
      { xPx: 0, yPx: 0 },
      { xPx: 0, yPx: 1 },
      { xPx: 1, yPx: 0 },
    ])
    // the isolated red pixel at (2,2) must not have been visited/consumed
    expect(visitedArea[2][2]).toBe(false)
  })

  it('stays within the given bounds even if a matching pixel is just outside them', () => {
    // r r r  (row 0)
    const width = 3
    const height = 1
    const red = [255, 0, 0, 255]
    const imageColors = createImageData([red, red, red])
    // Only x in [0,1) is allowed to grow into
    const bounds = { minX: 0, minY: 0, maxXExclusive: 1, maxYExclusive: 1 }
    const visitedArea: boolean[][] = [Array(1).fill(false)]

    const pixels = floodFillBlob(
      0,
      0,
      width,
      imageColors,
      [255, 0, 0],
      10,
      visitedArea,
      bounds,
    )

    expect(pixels).toEqual([{ xPx: 0, yPx: 0 }])
  })
})

describe('centroidOfPixels', () => {
  it('averages pixel coordinates', () => {
    expect(
      centroidOfPixels([
        { xPx: 0, yPx: 0 },
        { xPx: 2, yPx: 0 },
        { xPx: 1, yPx: 3 },
      ]),
    ).toEqual({ xPx: 1, yPx: 1 })
  })
})

describe('diameterFromPixelCount', () => {
  it('derives the diameter of a circle with an equivalent area', () => {
    // area = πr^2 with r = 1 -> area ≈ π
    expect(diameterFromPixelCount(Math.PI)).toBeCloseTo(2, 5)
  })
})
