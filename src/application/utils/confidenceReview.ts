import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'
import { ConfidenceReviewCursor } from '@/application/services/confidenceReview/confidenceReview'

// INFO: Pure helpers for the confidence review (docs/design/
// auto-extraction-review-design.md, "2.").

export type LowConfidencePoint = ConfidenceReviewCursor & { score: number }

export function isLowConfidence(
  score: number | undefined,
  threshold: number,
): boolean {
  return score !== undefined && score < threshold
}

// INFO: lowest score first; ties by dataset order, then point id
export function listLowConfidencePoints(
  datasets: DatasetInterface[],
  threshold: number,
): LowConfidencePoint[] {
  const list: (LowConfidencePoint & { datasetIndex: number })[] = []
  datasets.forEach((dataset, datasetIndex) => {
    dataset.points.forEach((point) => {
      if (isLowConfidence(point.score, threshold)) {
        list.push({
          datasetId: dataset.id,
          pointId: point.id,
          score: point.score as number,
          datasetIndex,
        })
      }
    })
  })
  return list
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.datasetIndex - b.datasetIndex ||
        a.pointId - b.pointId,
    )
    .map(({ datasetId, pointId, score }) => ({ datasetId, pointId, score }))
}

// INFO: the next (direction 1) or previous (-1) entry after `current`,
// wrapping around. If `current` is no longer in the list (deleted, moved,
// fixed by raising its score…), continue from where its score would sort.
export function stepLowConfidencePoint(
  list: LowConfidencePoint[],
  current: ConfidenceReviewCursor | null,
  direction: 1 | -1,
): LowConfidencePoint | null {
  if (list.length === 0) return null
  if (!current) return direction === 1 ? list[0] : list[list.length - 1]

  const index = list.findIndex(
    (p) => p.datasetId === current.datasetId && p.pointId === current.pointId,
  )
  if (index !== -1) {
    return list[(index + direction + list.length) % list.length]
  }
  if (current.score === undefined) {
    return direction === 1 ? list[0] : list[list.length - 1]
  }
  const score = current.score
  if (direction === 1) {
    return list.find((p) => p.score >= score) ?? list[0]
  }
  return (
    [...list].reverse().find((p) => p.score <= score) ?? list[list.length - 1]
  )
}

export function countScoredPoints(datasets: DatasetInterface[]): number {
  return datasets.reduce(
    (sum, dataset) =>
      sum +
      dataset.points.filter((p) => p.score !== undefined).length +
      dataset.scoreRemovedPoints.length,
    0,
  )
}
