import { flattenOcrWords } from './axisOcrMatcher'

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
})
