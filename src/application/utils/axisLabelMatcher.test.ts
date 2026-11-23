import {
  labelSides,
  matchAxisLabels,
  parseAxisNumber,
  repairCandidates,
} from './axisLabelMatcher'
import { OcrWord } from './axisOcrMatcher'

// INFO: a label `text` centred at (cx, cy), 8 px per character, 14 px high
const label = (text: string, cx: number, cy: number): OcrWord => ({
  text,
  bbox: {
    x0: cx - text.length * 4,
    y0: cy - 7,
    x1: cx + text.length * 4,
    y1: cy + 7,
  },
})

// INFO: a plot with its origin at (100, 400): x ticks every 100 px from
// x = 100, y ticks every 80 px up from y = 400. x labels sit 20 px below the
// x axis, y labels end 10 px left of the y axis.
const xLabels = (texts: string[]) =>
  texts.map((t, i) => label(t, 100 + i * 100, 420))
const yLabels = (texts: string[]) =>
  texts.map((t, i) => label(t, 90 - t.length * 4, 400 - i * 80))

const markers = {
  x1: { xPx: 100, yPx: 400 },
  x2: { xPx: 500, yPx: 400 },
  y1: { xPx: 100, yPx: 400 },
  y2: { xPx: 100, yPx: 80 },
}

describe('axisLabelMatcher', () => {
  describe('parseAxisNumber', () => {
    test.each([
      ['42', 42],
      ['-3.5', -3.5],
      ['−3.5', -3.5],
      ['–40', -40],
      ['0,1', 0.1],
      ['1,000', 1000],
      ['1e-3', 0.001],
      [' 7 ', 7],
    ])('reads %s as %d', (text, value) => {
      expect(parseAxisNumber(text)).toBe(value)
    })

    test.each(['abc', '1.2.3', '', '(a)', '10%'])('is null for %s', (text) => {
      expect(parseAxisNumber(text)).toBeNull()
    })
  })

  describe('repairCandidates', () => {
    test('offers a lost decimal point and a lost minus sign', () => {
      const values = repairCandidates('14').map((c) => c.value)
      expect(values).toEqual(expect.arrayContaining([14, 1.4, -14, -1.4]))
      expect(repairCandidates('14')[0]).toStrictEqual({
        value: 14,
        cost: 0,
        decimals: 0,
      })
    })

    test('does not take a leading zero integer as is', () => {
      const values = repairCandidates('08').map((c) => c.value)
      expect(values).toContain(0.8)
      expect(values).not.toContain(8)
    })

    test('dropping a minus that was read costs more than adding one', () => {
      const drop = repairCandidates('-5').find((c) => c.value === 5)
      const add = repairCandidates('5').find((c) => c.value === -5)
      expect(drop!.cost).toBeGreaterThan(add!.cost)
    })

    test('is empty for a non-number', () => {
      expect(repairCandidates('T(K)')).toStrictEqual([])
    })
  })

  describe('labelSides', () => {
    test('usual sides: x labels below, y labels left', () => {
      expect(labelSides(markers)).toStrictEqual({
        xAxisY: 400,
        yAxisX: 100,
        xLabelsAbove: false,
        yLabelsRight: false,
      })
    })

    test('a y axis right of the x markers is a right-hand axis', () => {
      const sides = labelSides({ ...markers, y1: { xPx: 520, yPx: 400 } })
      expect(sides.yLabelsRight).toBe(true)
    })

    test('an x axis above the y markers is a top axis', () => {
      const sides = labelSides({
        ...markers,
        x1: { xPx: 100, yPx: 60 },
        x2: { xPx: 500, yPx: 60 },
      })
      expect(sides.xLabelsAbove).toBe(true)
    })
  })

  describe('matchAxisLabels', () => {
    test('fills each marker with the label lined up with it', () => {
      const words = [
        ...xLabels(['300', '400', '500', '600', '700']),
        ...yLabels(['0', '10', '20', '30', '40']),
      ]
      expect(matchAxisLabels(words, markers)).toStrictEqual({
        x1: 300,
        x2: 700,
        y1: 0,
        y2: 40,
      })
    })

    test("does not take the other axis's label at the origin", () => {
      // INFO: the y axis's "0" is nearer to x1 than the x axis's "300"
      const words = [
        ...xLabels(['300', '400', '500', '600', '700']),
        ...yLabels(['0', '10', '20', '30', '40']),
      ]
      words[0] = label('300', 100, 440)
      expect(matchAxisLabels(words, markers).x1).toBe(300)
    })

    test('puts back a lost decimal point that the other labels call for', () => {
      const words = yLabels(['0.0', '0.4', '08', '1.2', '16'])
      expect(matchAxisLabels(words, markers)).toStrictEqual({
        y1: 0,
        y2: 1.6,
      })
    })

    test('reads labels that fit both ways in the usual direction', () => {
      const words = [
        label('60', 100, 420),
        label('40', 200, 420),
        label('20', 300, 420),
        label('0', 400, 420),
        label('20', 500, 420),
        label('40', 600, 420),
        label('60', 700, 420),
      ]
      expect(
        matchAxisLabels(words, { x1: markers.x1, x2: markers.x2 }),
      ).toStrictEqual({ x1: -60, x2: 20 })
    })

    test('fills a marker on a tick whose label was not read', () => {
      const words = xLabels(['300', '400', 'S00', '600', '7O0'])
      expect(
        matchAxisLabels(words, { x1: markers.x1, x2: markers.x2 }),
      ).toStrictEqual({ x1: 300, x2: 700 })
    })

    test('leaves a marker between ticks empty', () => {
      const words = xLabels(['300', '400', '500', '600'])
      const between = { x1: { xPx: 150, yPx: 400 }, x2: markers.x2 }
      expect(matchAxisLabels(words, between)).toStrictEqual({ x2: 700 })
    })

    test('leaves an axis empty with fewer than three labels', () => {
      const words = xLabels(['0', '14'])
      expect(
        matchAxisLabels(words, { x1: markers.x1, x2: { xPx: 200, yPx: 400 } }),
      ).toStrictEqual({})
    })

    test('leaves an axis empty when its labels do not form a line', () => {
      const words = xLabels(['3', '17', '5', '42', '8'])
      expect(
        matchAxisLabels(words, { x1: markers.x1, x2: markers.x2 }),
      ).toStrictEqual({})
    })

    test('leaves an axis empty when "10" is read at several ticks', () => {
      const words = yLabels(['10', '10', '10', '10', '10'])
      expect(
        matchAxisLabels(words, { y1: markers.y1, y2: markers.y2 }),
      ).toStrictEqual({})
    })

    test('reads a log axis', () => {
      const words = yLabels(['0.1', '1', '10', '100', '1000'])
      expect(
        matchAxisLabels(words, { y1: markers.y1, y2: markers.y2 }),
      ).toStrictEqual({ y1: 0.1, y2: 1000 })
    })

    test('reads a right-hand y axis', () => {
      const right = [0, 1, 2, 3, 4].map((i) =>
        label(String(i * 5), 530, 400 - i * 80),
      )
      const words = [...xLabels(['0', '1', '2', '3', '4']), ...right]
      const coords = {
        ...markers,
        y1: { xPx: 500, yPx: 400 },
        y2: { xPx: 500, yPx: 80 },
      }
      expect(matchAxisLabels(words, coords)).toStrictEqual({
        x1: 0,
        x2: 4,
        y1: 0,
        y2: 20,
      })
    })

    test('pools the readings of one label from several passes', () => {
      // INFO: one pass lost the minus signs, the other read them
      const words = [
        ...xLabels(['40', '20', '0', '20', '40']),
        ...xLabels(['-40', '-20', '0', '20', '40']),
      ]
      expect(
        matchAxisLabels(words, { x1: markers.x1, x2: markers.x2 }),
      ).toStrictEqual({ x1: -40, x2: 40 })
    })

    test('leaves an axis empty when a cleanly read tick contradicts it', () => {
      // INFO: "100 100 . 600 700" fits -100, 100, (500), 700 with a minus
      // put back, but the cleanly read "600" on its 500 tick says otherwise
      const words = [
        label('100', 100, 420),
        label('100', 200, 420),
        label('600', 400, 420),
        label('700', 500, 420),
      ]
      expect(
        matchAxisLabels(words, { x1: markers.x1, x2: markers.x2 }),
      ).toStrictEqual({})
    })

    test('skips axes without markers', () => {
      const words = xLabels(['300', '400', '500', '600', '700'])
      expect(matchAxisLabels(words, {})).toStrictEqual({})
    })
  })
})
