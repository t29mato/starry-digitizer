// INFO: View state of the confidence review (docs/design/
// auto-extraction-review-design.md, "2."): which score counts as suspicious
// and which suspicious point the user is on. Not part of undo history or
// project files — it changes nothing in the data.
export type ConfidenceReviewCursor = {
  datasetId: number
  pointId: number
  // INFO: remembered so stepping can continue sensibly after the point
  // itself was deleted or moved
  score?: number
}

export const DEFAULT_SCORE_THRESHOLD = 0.5

export class ConfidenceReview {
  threshold = DEFAULT_SCORE_THRESHOLD
  current: ConfidenceReviewCursor | null = null

  setThreshold(threshold: number): void {
    this.threshold = threshold
  }

  setCurrent(cursor: ConfidenceReviewCursor | null): void {
    this.current = cursor
  }
}
