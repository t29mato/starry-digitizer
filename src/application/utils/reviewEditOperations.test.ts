import {
  mergeActiveDatasetInto,
  mergeDuplicatePoints,
  moveSelectedPointsTo,
  setAnnotationArea,
  setDatasetMarker,
  splitSelectedPoints,
} from './reviewEditOperations'
import { buildEditLog, loadAutoExtraction } from './autoExtractionOperations'
import {
  createDigitizerContext,
  DigitizerContext,
} from '@/application/digitizerContext'

describe('series editing and figure annotations', () => {
  let ctx: DigitizerContext

  beforeEach(async () => {
    ctx = createDigitizerContext()
    await loadAutoExtraction(ctx, {
      version: 1,
      series: [
        { label: 'A', points_px: [[10, 10], [20, 20], [21, 21]] },
        { label: 'B', points_px: [[30, 30]] },
      ],
    })
  })

  const actions = () => buildEditLog(ctx)?.events.map((e) => e.action)

  test('moving the selection to another series is undoable and shows in the edit log', () => {
    ctx.datasetRepository.activeDataset.switchActivatedPoint(1)
    expect(moveSelectedPointsTo(ctx, 2)).toBe(1)
    expect(ctx.datasetRepository.datasets.map((d) => d.points.length)).toEqual(
      [2, 2],
    )
    expect(buildEditLog(ctx)?.summary.points.reassigned).toBe(1)
    expect(actions()).toEqual(['points.move-to-series'])

    ctx.historyManager.undo()
    expect(ctx.datasetRepository.datasets.map((d) => d.points.length)).toEqual(
      [3, 1],
    )
  })

  test('nothing selected: no move, no split, no undo step', () => {
    expect(moveSelectedPointsTo(ctx, 2)).toBe(0)
    expect(splitSelectedPoints(ctx)).toBeNull()
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  test('split, merge and duplicate merge', () => {
    ctx.datasetRepository.activeDataset.switchActivatedPoint(1)
    const id = splitSelectedPoints(ctx)
    expect(ctx.datasetRepository.datasets.find((d) => d.id === id)?.name).toBe(
      'A (split)',
    )

    // INFO: merge the split-off series into B; A keeps its two near points
    ctx.datasetRepository.setActiveDataset(id as number)
    mergeActiveDatasetInto(ctx, 2)
    expect(ctx.datasetRepository.activeDatasetId).toBe(2)
    expect(ctx.datasetRepository.datasets.map((d) => d.name)).toEqual([
      'A',
      'B',
    ])

    ctx.datasetRepository.setActiveDataset(1)
    expect(mergeDuplicatePoints(ctx, 3)).toBe(1)
    expect(actions()).toEqual([
      'points.split-to-new-series',
      'series.merge',
      'points.merge-duplicates',
    ])
  })

  test('annotations and markers', () => {
    setAnnotationArea(ctx, 'plotArea', {
      xPx: 1,
      yPx: 2,
      widthPx: 3,
      heightPx: 4,
    })
    expect(ctx.axisSetRepository.activeAxisSet.plotArea).toEqual({
      xPx: 1,
      yPx: 2,
      widthPx: 3,
      heightPx: 4,
    })
    setAnnotationArea(ctx, 'plotArea', null)
    expect(ctx.axisSetRepository.activeAxisSet.plotArea).toBeNull()

    setDatasetMarker(ctx, 'shape', 'circle')
    setDatasetMarker(ctx, 'shape', 'circle')
    setDatasetMarker(ctx, 'sizePx', 8)
    setDatasetMarker(ctx, 'sizePx', null)
    expect(ctx.datasetRepository.activeDataset.marker).toEqual({
      shape: 'circle',
    })
    expect(actions()).toEqual([
      'annotation.plot-area',
      'annotation.plot-area',
      'series.marker',
      'series.marker',
      'series.marker',
    ])
  })
})
