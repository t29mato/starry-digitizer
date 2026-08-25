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
  })
})
