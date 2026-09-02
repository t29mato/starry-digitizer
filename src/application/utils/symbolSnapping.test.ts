import { findNearestSymbolCentroid } from './symbolSnapping'

describe('findNearestSymbolCentroid', () => {
  const width = 20
  const height = 20
  const white: [number, number, number, number] = [255, 255, 255, 255]
  const red: [number, number, number, number] = [255, 0, 0, 255]

  function buildGrid(
    redPixels: Array<[number, number]>,
  ): Uint8ClampedArray {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        const i = (h * width + w) * 4
        const isRed = redPixels.some(([x, y]) => x === w && y === h)
        const [r, g, b, a] = isRed ? red : white
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        data[i + 3] = a
      }
    }
    return data
  }

  it('returns the centroid when the click lands exactly on a matching pixel', () => {
    const imageColors = buildGrid([[10, 10]])

    const result = findNearestSymbolCentroid(
      10,
      10,
      width,
      height,
      imageColors,
      [255, 0, 0],
      10,
    )

    expect(result).toEqual({ xPx: 10.5, yPx: 10.5 })
  })

  it('finds a nearby blob within the search radius even off-target', () => {
    const imageColors = buildGrid([[10, 10]])

    // click a few pixels away from the actual symbol
    const result = findNearestSymbolCentroid(
      13,
      10,
      width,
      height,
      imageColors,
      [255, 0, 0],
      10,
      { searchRadiusPx: 5 },
    )

    expect(result).toEqual({ xPx: 10.5, yPx: 10.5 })
  })

  it('returns null when no matching blob is within the search radius', () => {
    const imageColors = buildGrid([[10, 10]])

    const result = findNearestSymbolCentroid(
      1,
      1,
      width,
      height,
      imageColors,
      [255, 0, 0],
      10,
      { searchRadiusPx: 3 },
    )

    expect(result).toBeNull()
  })

  it('returns null when the nearest blob is smaller than minDiameterPx', () => {
    const imageColors = buildGrid([[10, 10]])

    const result = findNearestSymbolCentroid(
      10,
      10,
      width,
      height,
      imageColors,
      [255, 0, 0],
      10,
      { minDiameterPx: 5 },
    )

    expect(result).toBeNull()
  })

  it('returns null when the nearest blob is larger than maxDiameterPx', () => {
    // a 3x3 red square
    const redPixels: Array<[number, number]> = []
    for (let x = 9; x <= 11; x++) {
      for (let y = 9; y <= 11; y++) {
        redPixels.push([x, y])
      }
    }
    const imageColors = buildGrid(redPixels)

    const result = findNearestSymbolCentroid(
      10,
      10,
      width,
      height,
      imageColors,
      [255, 0, 0],
      10,
      { maxDiameterPx: 2 },
    )

    expect(result).toBeNull()
  })

  it('returns null for an empty image', () => {
    const result = findNearestSymbolCentroid(
      0,
      0,
      0,
      0,
      new Uint8ClampedArray(0),
      [255, 0, 0],
      10,
    )

    expect(result).toBeNull()
  })
})
