import { DigitizerContext } from '@/application/digitizerContext'
import { AnnotationTarget, MarkerStyle, Rect } from '@/@types/types'
import { activateDataset } from '@/application/utils/datasetOperations'

// INFO: Series editing and figure annotations (docs/design/
// auto-extraction-review-design.md, "3." and "5."). Each use case captures
// history right before its mutation, so it is undoable and named in the edit
// log's events; the edit log's COUNTS still come from the state diff, not
// from these names. Points moved between datasets carry `origin` / `score`
// along, which is what lets that diff see a split, a merge or a reassignment.
//
// None of these refuses in view-all or read-only mode: that is the caller's
// policy, as for the other use cases in this directory.

function beforeEdit(ctx: DigitizerContext, action: string): void {
  ctx.historyManager.capture(action)
  if (ctx.interpolator.isActive) ctx.interpolator.clearPreview()
}

/**
 * Move the selected points of the active dataset to another dataset.
 * @returns how many points moved (0 = nothing selected; nothing captured).
 */
export function moveSelectedPointsTo(
  ctx: DigitizerContext,
  datasetId: number,
): number {
  const { datasetRepository } = ctx
  const active = datasetRepository.activeDataset
  const ids = [...active.activePointIds]
  if (ids.length === 0 || datasetId === active.id) return 0
  beforeEdit(ctx, 'points.move-to-series')
  return datasetRepository.movePoints(active.id, ids, datasetId).length
}

/**
 * Move the selected points of the active dataset into a new dataset
 * ("<name> (split)", same axis set).
 * @returns the new dataset's id, or null when nothing was selected.
 */
export function splitSelectedPoints(ctx: DigitizerContext): number | null {
  const { datasetRepository } = ctx
  const active = datasetRepository.activeDataset
  const ids = [...active.activePointIds]
  if (ids.length === 0) return null
  beforeEdit(ctx, 'points.split-to-new-series')
  return datasetRepository.splitPointsToNewDataset(active.id, ids)
}

/**
 * Merge the active dataset into `targetId` (its points are appended there and
 * it is removed), then follow the user to the target.
 */
export function mergeActiveDatasetInto(
  ctx: DigitizerContext,
  targetId: number,
): void {
  const { datasetRepository } = ctx
  const sourceId = datasetRepository.activeDatasetId
  if (sourceId === targetId) return
  if (!datasetRepository.datasets.some((d) => d.id === targetId)) return
  beforeEdit(ctx, 'series.merge')
  datasetRepository.mergeDatasets(sourceId, targetId)
  // INFO: the merged-away dataset was active; activate the target with the
  // same clean-up a switch in the dataset list does
  activateDataset(ctx, targetId)
}

/**
 * Collapse near-duplicate points of the active dataset (within
 * `maxDistancePx` of a representative; see duplicatePointFinder.ts).
 * @returns how many points were merged away.
 */
export function mergeDuplicatePoints(
  ctx: DigitizerContext,
  maxDistancePx: number,
): number {
  if (!(maxDistancePx >= 0)) return 0
  beforeEdit(ctx, 'points.merge-duplicates')
  return ctx.datasetRepository.activeDataset.mergeDuplicatePoints(maxDistancePx)
}

/**
 * Set (or clear, with null) the plot / legend rectangle of the active axis
 * set, in original-image pixels.
 */
export function setAnnotationArea(
  ctx: DigitizerContext,
  target: AnnotationTarget,
  rect: Rect | null,
): void {
  ctx.historyManager.capture(
    target === 'plotArea' ? 'annotation.plot-area' : 'annotation.legend-area',
  )
  ctx.axisSetRepository.activeAxisSet[target] = rect ? { ...rect } : null
}

/**
 * Set one field of the active dataset's marker style; null / undefined
 * removes the field. Nothing is captured when the value does not change.
 */
export function setDatasetMarker<K extends keyof MarkerStyle>(
  ctx: DigitizerContext,
  key: K,
  value: MarkerStyle[K] | null,
): void {
  const dataset = ctx.datasetRepository.activeDataset
  const current = dataset.marker ?? {}
  if ((current[key] ?? null) === (value ?? null)) return
  ctx.historyManager.capture('series.marker')
  const next: MarkerStyle = { ...current }
  if (value === null || value === undefined) {
    delete next[key]
  } else {
    next[key] = value
  }
  dataset.marker = next
}
