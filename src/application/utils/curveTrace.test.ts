import {
  dominantColor,
  pickColor,
  RGB,
  sampleAlongPath,
  sampleAlongX,
  traceCurve,
  TraceImage,
  TraceOptions,
} from './curveTrace'

const RED: RGB = [220, 20, 20]
const BLUE: RGB = [20, 20, 220]
const BLACK: RGB = [0, 0, 0]

function blank(width: number, height: number): TraceImage {
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255)
  return { width, height, pixels }
}

function set(image: TraceImage, x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return
  const i = (y * image.width + x) * 4
  image.pixels[i] = c[0]
  image.pixels[i + 1] = c[1]
  image.pixels[i + 2] = c[2]
  image.pixels[i + 3] = 255
}

/** Draw y = f(x) with the given thickness, for x in [x0, x1]. */
function drawFunction(
  image: TraceImage,
  f: (x: number) => number,
  x0: number,
  x1: number,
  c: RGB,
  thickness = 2,
  dash?: { on: number; off: number },
): void {
  for (let x = x0; x <= x1; x += 0.25) {
    if (dash && (x - x0) % (dash.on + dash.off) >= dash.on) continue
    const y = f(x)
    for (let t = -thickness / 2; t <= thickness / 2; t += 0.5) {
      set(image, Math.floor(x), Math.floor(y + t), c)
    }
  }
}

function drawVertical(
  image: TraceImage,
  x: number,
  y0: number,
  y1: number,
  c: RGB,
  thickness = 2,
): void {
  for (let y = y0; y <= y1; y++) {
    for (let t = 0; t < thickness; t++) set(image, x + t, y, c)
  }
}

const options = (extra: Partial<TraceOptions> = {}): TraceOptions => ({
  colorDistancePct: 5,
  maxGapPx: 10,
  spacingPx: 10,
  sampling: 'path',
  ...extra,
})

const xs = (points: { xPx: number }[]) => points.map((p) => p.xPx)

describe('traceCurve', () => {
  test('follows a straight line both ways from a click in the middle', () => {
    const image = blank(300, 100)
    drawFunction(image, () => 50, 20, 280, RED)
    const result = traceCurve(image, { xPx: 150, yPx: 51 }, options())
    expect(result.error).toBeUndefined()
    expect(result.color).toEqual(RED)
    expect(Math.min(...xs(result.points))).toBeLessThan(24)
    expect(Math.max(...xs(result.points))).toBeGreaterThan(276)
    // left to right
    expect(result.points[0].xPx).toBeLessThan(
      result.points[result.points.length - 1].xPx,
    )
    result.points.forEach((p) =>
      expect(Math.abs(p.yPx - 50.5)).toBeLessThan(1.5),
    )
  })

  test('follows a sine and stays on it', () => {
    const image = blank(400, 200)
    const f = (x: number) => 100 + 60 * Math.sin(x / 40)
    drawFunction(image, f, 10, 390, BLUE, 3)
    const result = traceCurve(image, { xPx: 200, yPx: f(200) }, options())
    expect(Math.min(...xs(result.points))).toBeLessThan(16)
    expect(Math.max(...xs(result.points))).toBeGreaterThan(384)
    result.points.forEach((p) =>
      expect(Math.abs(p.yPx - f(p.xPx))).toBeLessThan(3),
    )
  })

  test('picks the line colour from an anti-aliased click on a noisy background', () => {
    const image = blank(200, 100)
    // speckle the background a little
    for (let i = 0; i < image.width * image.height; i += 7) {
      image.pixels[i * 4] = 245
    }
    drawFunction(image, () => 50, 10, 190, RED, 2)
    // blended edge row
    drawFunction(image, () => 52, 10, 190, [238, 140, 140], 0)
    dominantColor(image).forEach((c) => expect(c).toBeGreaterThan(250))
    expect(pickColor(image, { xPx: 100, yPx: 52.5 })).toEqual(RED)
    const result = traceCurve(image, { xPx: 100, yPx: 52.5 }, options())
    expect(
      Math.max(...xs(result.points)) - Math.min(...xs(result.points)),
    ).toBeGreaterThan(170)
  })

  test('is not pulled off by a crossing line of another colour', () => {
    const image = blank(300, 300)
    drawFunction(image, (x) => x, 10, 290, RED, 3)
    drawFunction(image, (x) => 300 - x, 10, 290, BLUE, 3)
    const result = traceCurve(image, { xPx: 60, yPx: 60 }, options())
    expect(Math.max(...xs(result.points))).toBeGreaterThan(280)
    result.points.forEach((p) =>
      expect(Math.abs(p.yPx - p.xPx)).toBeLessThan(4),
    )
  })

  test('goes straight across a same-coloured crossing at 90°', () => {
    const image = blank(300, 300)
    drawFunction(image, () => 150, 10, 290, RED, 3)
    drawVertical(image, 150, 10, 290, RED, 3)
    const result = traceCurve(image, { xPx: 50, yPx: 151 }, options())
    expect(Math.min(...xs(result.points))).toBeLessThan(16)
    expect(Math.max(...xs(result.points))).toBeGreaterThan(284)
    result.points.forEach((p) => expect(Math.abs(p.yPx - 151)).toBeLessThan(4))
  })

  test('jumps a dash gap up to maxGapPx and stops at a longer one', () => {
    const image = blank(400, 100)
    drawFunction(image, () => 50, 10, 390, RED, 2, { on: 20, off: 6 })
    const jumped = traceCurve(
      image,
      { xPx: 15, yPx: 51 },
      options({ maxGapPx: 10 }),
    )
    expect(Math.max(...xs(jumped.points))).toBeGreaterThan(370)
    const stopped = traceCurve(
      image,
      { xPx: 15, yPx: 51 },
      options({ maxGapPx: 0 }),
    )
    expect(Math.max(...xs(stopped.points))).toBeLessThan(35)
    expect(stopped.stops[1]).toBe('end')
  })

  test('stops at the mask boundary and at the image edge', () => {
    const image = blank(300, 100)
    drawFunction(image, () => 50, 0, 299, RED)
    const mask = new Uint8ClampedArray(300 * 100 * 4)
    for (let y = 0; y < 100; y++) {
      for (let x = 100; x < 200; x++) {
        const i = (y * 300 + x) * 4
        mask.set([255, 255, 0, 255], i)
      }
    }
    const masked = traceCurve(
      { ...image, mask, hasMask: true },
      { xPx: 150, yPx: 51 },
      options(),
    )
    expect(masked.stops).toEqual(['mask', 'mask'])
    expect(Math.min(...xs(masked.points))).toBeGreaterThanOrEqual(99)
    expect(Math.max(...xs(masked.points))).toBeLessThanOrEqual(201)

    const edge = traceCurve(image, { xPx: 150, yPx: 51 }, options())
    expect(edge.stops).toEqual(['edge', 'edge'])
  })

  test('stops at a same-coloured axis it runs into instead of following it', () => {
    const image = blank(300, 300)
    // axis: vertical at x = 250
    drawVertical(image, 250, 10, 290, BLACK, 2)
    // curve rising to the axis at a slope
    drawFunction(image, (x) => 250 - 0.5 * x, 20, 250, BLACK, 2)
    const result = traceCurve(image, { xPx: 100, yPx: 200.5 }, options())
    expect(result.stops[1]).toBe('junction')
    // and it does not run up or down the axis
    expect(Math.max(...xs(result.points))).toBeLessThan(256)
    expect(Math.min(...result.points.map((p) => p.yPx))).toBeGreaterThan(115)
    result.points.forEach((p) =>
      expect(Math.abs(p.yPx - (250 - 0.5 * p.xPx))).toBeLessThan(6),
    )
  })

  test('a circle stops where it began', () => {
    const image = blank(200, 200)
    for (let a = 0; a < 2 * Math.PI; a += 0.002) {
      for (let t = -1; t <= 1; t += 0.5) {
        set(
          image,
          Math.floor(100 + (60 + t) * Math.cos(a)),
          Math.floor(100 + (60 + t) * Math.sin(a)),
          RED,
        )
      }
    }
    const result = traceCurve(image, { xPx: 160.5, yPx: 100.5 }, options())
    expect(result.stops).toContain('loop')
    // close to the full circumference, not twice around
    expect(result.lengthPx).toBeGreaterThan(2 * Math.PI * 60 * 0.85)
    expect(result.lengthPx).toBeLessThan(2 * Math.PI * 60 * 1.2)
  })

  test('colour distance decides what matches', () => {
    const image = blank(200, 100)
    drawFunction(image, () => 50, 10, 100, RED)
    drawFunction(image, () => 50, 101, 190, [200, 60, 60])
    const strict = traceCurve(
      image,
      { xPx: 50, yPx: 51 },
      options({ colorDistancePct: 1, maxGapPx: 0 }),
    )
    expect(Math.max(...xs(strict.points))).toBeLessThan(105)
    const loose = traceCurve(
      image,
      { xPx: 50, yPx: 51 },
      options({ colorDistancePct: 10, maxGapPx: 0 }),
    )
    expect(Math.max(...xs(loose.points))).toBeGreaterThan(185)
  })

  test('a click on the background is an error, not a point', () => {
    const image = blank(100, 100)
    drawFunction(image, () => 20, 10, 90, RED)
    const result = traceCurve(image, { xPx: 50, yPx: 80 }, options())
    expect(result.points).toEqual([])
    expect(result.error).toBeDefined()
  })

  test('a 2000×2000 image is traced quickly', () => {
    const image = blank(2000, 2000)
    const f = (x: number) => 1000 + 600 * Math.sin(x / 300)
    drawFunction(image, f, 5, 1995, RED, 3)
    const started = Date.now()
    const result = traceCurve(image, { xPx: 1000, yPx: f(1000) }, options())
    expect(Date.now() - started).toBeLessThan(2000)
    expect(
      Math.max(...xs(result.points)) - Math.min(...xs(result.points)),
    ).toBeGreaterThan(1970)
  })
})

describe('sampling', () => {
  const path = [
    { xPx: 0, yPx: 0 },
    { xPx: 25, yPx: 0 },
  ]
  test('along the path: every N px, ends kept', () => {
    expect(xs(sampleAlongPath(path, 10))).toEqual([0, 10, 20, 25])
  })
  test('along x: at each multiple of N, also going back', () => {
    expect(xs(sampleAlongX(path, 10))).toEqual([0, 10, 20, 25])
    const back = [
      { xPx: 5, yPx: 0 },
      { xPx: 32, yPx: 0 },
      { xPx: 18, yPx: 5 },
    ]
    expect(xs(sampleAlongX(back, 10))).toEqual([5, 10, 20, 30, 30, 20, 18])
  })
})
