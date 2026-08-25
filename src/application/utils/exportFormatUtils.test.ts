import { toCsv, toJson } from './exportFormatUtils'

describe('exportFormatUtils', () => {
  describe('toCsv', () => {
    test('converts rows of X/Y pairs into comma-separated lines', () => {
      const rows = [
        { X: '1', Y: '2' },
        { X: '3', Y: '4' },
      ]

      expect(toCsv(rows)).toBe('1,2\n3,4')
    })

    test('returns an empty string for an empty array', () => {
      expect(toCsv([])).toBe('')
    })
  })

  describe('toJson', () => {
    test('converts rows of X/Y pairs into a pretty-printed JSON array', () => {
      const rows = [
        { X: '1', Y: '2' },
        { X: '3', Y: '4' },
      ]

      expect(toJson(rows)).toBe(
        JSON.stringify(
          [
            { x: '1', y: '2' },
            { x: '3', y: '4' },
          ],
          null,
          2,
        ),
      )
    })

    test('returns an empty array literal for an empty array', () => {
      expect(toJson([])).toBe('[]')
    })
  })
})
