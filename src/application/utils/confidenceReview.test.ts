import {
  countScoredPoints,
  isLowConfidence,
  listLowConfidencePoints,
  stepLowConfidencePoint,
} from './confidenceReview'
import { Dataset } from '@/domain/models/dataset/dataset'

const dataset = (id: number, scores: (number | undefined)[]) =>
  new Dataset(
    `d${id}`,
    scores.map((score, i) => ({ id: i + 1, xPx: i, yPx: i, score })),
    id,
  )

describe('confidence review helpers', () => {
  test('isLowConfidence ignores unscored points', () => {
    expect(isLowConfidence(0.1, 0.5)).toBe(true)
    expect(isLowConfidence(0.5, 0.5)).toBe(false)
    expect(isLowConfidence(undefined, 0.5)).toBe(false)
  })

  test('lists low points lowest score first, then dataset order, then id', () => {
    const list = listLowConfidencePoints(
      [dataset(2, [0.3, 0.1, 0.9, undefined]), dataset(1, [0.3, 0.2])],
      0.5,
    )
    expect(list).toEqual([
      { datasetId: 2, pointId: 2, score: 0.1 },
      { datasetId: 1, pointId: 2, score: 0.2 },
      { datasetId: 2, pointId: 1, score: 0.3 },
      { datasetId: 1, pointId: 1, score: 0.3 },
    ])
  })

  test('countScoredPoints includes points removed by threshold', () => {
    const d = dataset(1, [0.1, undefined])
    d.removePointsBelowScore(0.5)
    expect(countScoredPoints([d, dataset(2, [undefined])])).toBe(1)
  })

  describe('stepLowConfidencePoint', () => {
    const list = [
      { datasetId: 1, pointId: 1, score: 0.1 },
      { datasetId: 1, pointId: 2, score: 0.2 },
      { datasetId: 2, pointId: 1, score: 0.3 },
    ]

    test('empty list', () => {
      expect(stepLowConfidencePoint([], null, 1)).toBeNull()
    })

    test('starts at either end', () => {
      expect(stepLowConfidencePoint(list, null, 1)).toBe(list[0])
      expect(stepLowConfidencePoint(list, null, -1)).toBe(list[2])
    })

    test('steps and wraps around', () => {
      expect(stepLowConfidencePoint(list, list[0], 1)).toBe(list[1])
      expect(stepLowConfidencePoint(list, list[2], 1)).toBe(list[0])
      expect(stepLowConfidencePoint(list, list[0], -1)).toBe(list[2])
    })

    test('continues by score when the current point has gone', () => {
      const gone = { datasetId: 9, pointId: 9, score: 0.15 }
      expect(stepLowConfidencePoint(list, gone, 1)).toBe(list[1])
      expect(stepLowConfidencePoint(list, gone, -1)).toBe(list[0])
      expect(
        stepLowConfidencePoint(list, { ...gone, score: 0.99 }, 1),
      ).toBe(list[0])
      expect(
        stepLowConfidencePoint(list, { ...gone, score: 0.01 }, -1),
      ).toBe(list[2])
      expect(
        stepLowConfidencePoint(list, { datasetId: 9, pointId: 9 }, -1),
      ).toBe(list[2])
    })
  })
})
