import {
  flattenOcrWords,
  matchOcrWordsToAxisValues,
  OcrWord,
} from './axisOcrMatcher'

describe('axisOcrMatcher', () => {
  describe('flattenOcrWords', () => {
    test('flattens blocks > paragraphs > lines > words into a single list', () => {
      const word = (text: string) => ({
        text,
        bbox: { x0: 0, y0: 0, x1: 1, y1: 1 },
      })

      const page = {
        blocks: [
          {
            paragraphs: [
              {
                lines: [
                  { words: [word('0'), word('10')] },
                  { words: [word('20')] },
                ],
              },
            ],
          },
        ],
      }

      expect(flattenOcrWords(page as any).map((w) => w.text)).toStrictEqual([
        '0',
        '10',
        '20',
      ])
    })

    test('returns an empty array when blocks is null', () => {
      expect(flattenOcrWords({ blocks: null } as any)).toStrictEqual([])
    })
  })

  describe('matchOcrWordsToAxisValues', () => {
    const word = (text: string, x: number, y: number): OcrWord => ({
      text,
      bbox: { x0: x, y0: y, x1: x, y1: y },
    })

    test('assigns each axis the value of the nearest numeric word', () => {
      const words = [word('0', 10, 100), word('100', 500, 100)]
      const axisCoords = {
        x1: { xPx: 12, yPx: 100 },
        x2: { xPx: 490, yPx: 100 },
      }

      expect(matchOcrWordsToAxisValues(words, axisCoords)).toStrictEqual({
        x1: 0,
        x2: 100,
      })
    })

    test('ignores non-numeric OCR noise', () => {
      const words = [word('Fig.', 10, 100), word('42', 12, 100)]
      const axisCoords = { x1: { xPx: 10, yPx: 100 } }

      expect(matchOcrWordsToAxisValues(words, axisCoords)).toStrictEqual({
        x1: 42,
      })
    })

    test('leaves an axis unset when the nearest numeric word is beyond maxDistancePx', () => {
      const words = [word('99', 1000, 1000)]
      const axisCoords = { x1: { xPx: 0, yPx: 0 } }

      expect(
        matchOcrWordsToAxisValues(words, axisCoords, { maxDistancePx: 150 }),
      ).toStrictEqual({})
    })

    test('skips axes without a coord', () => {
      const words = [word('5', 0, 0)]
      const axisCoords = { x1: undefined }

      expect(matchOcrWordsToAxisValues(words, axisCoords)).toStrictEqual({})
    })

    test('returns an empty object when no numeric words are present', () => {
      const words = [word('abc', 0, 0)]
      const axisCoords = { x1: { xPx: 0, yPx: 0 } }

      expect(matchOcrWordsToAxisValues(words, axisCoords)).toStrictEqual({})
    })

    test('parses negative and decimal numbers', () => {
      const words = [word('-3.5', 0, 0)]
      const axisCoords = { y1: { xPx: 0, yPx: 0 } }

      expect(matchOcrWordsToAxisValues(words, axisCoords)).toStrictEqual({
        y1: -3.5,
      })
    })

    // Regression test for #277: in 2-point calibration mode x1 and y1 are
    // placed at the same pixel position. The x-axis tick label sits below
    // that point and the y-axis tick label sits to its left; each axis must
    // pick its own label instead of both collapsing onto whichever numeric
    // word happens to be Euclidean-nearest.
    test('picks the below label for x1 and the left label for y1 when they share a coord (2-point mode)', () => {
      const sharedCoord = { xPx: 200, yPx: 200 }
      const xAxisLabel = word('300', 198, 230) // below the marker
      const yAxisLabel = word('5', 150, 202) // left of the marker, and
      // nearer to the marker than xAxisLabel is, so a plain nearest-word
      // search (no direction awareness) would incorrectly still prefer
      // xAxisLabel for y1 too.
      const words = [xAxisLabel, yAxisLabel]
      const axisCoords = { x1: sharedCoord, y1: sharedCoord }

      expect(matchOcrWordsToAxisValues(words, axisCoords)).toStrictEqual({
        x1: 300,
        y1: 5,
      })
    })

    test('leaves an axis unset when no numeric word is on its expected side', () => {
      // Only a label below the marker exists; y1 requires a label to the
      // left, so it should stay unset rather than borrowing the x-axis one.
      const words = [word('300', 200, 230)]
      const axisCoords = { y1: { xPx: 200, yPx: 200 } }

      expect(matchOcrWordsToAxisValues(words, axisCoords)).toStrictEqual({})
    })
  })
})
