import { Dataset } from './dataset'
import { DatasetRepository } from '@/domain/repositories/datasetRepository/datasetRepository'
import { Point } from '@/@types/types'

const imported = (index: number, xPx: number, score?: number): Point => ({
  id: index + 1,
  xPx,
  yPx: 0,
  origin: { series: 0, index },
  score,
})

const datasetWith = (points: Point[], id = 1) => {
  const dataset = new Dataset(`d${id}`, points, id)
  dataset.visiblePointIds = points.map((p) => p.id)
  return dataset
}

describe('Dataset series editing', () => {
  test('scaledPoints keeps score and origin', () => {
    const dataset = datasetWith([imported(0, 10, 0.3)])
    expect(dataset.scaledPoints(2)[0]).toEqual({
      id: 1,
      xPx: 20,
      yPx: 0,
      origin: { series: 0, index: 0 },
      score: 0.3,
    })
  })

  test('takePoints / appendPoints move points with origin, renumbering ids', () => {
    const from = datasetWith([imported(0, 1), imported(1, 2)])
    from.activePointIds = [1, 2]
    from.manuallyAddedPointIds = [2]
    const to = datasetWith([{ id: 1, xPx: 9, yPx: 9 }], 2)

    const newIds = to.appendPoints(from.takePoints([2]))

    expect(from.points.map((p) => p.id)).toEqual([1])
    expect(from.activePointIds).toEqual([1])
    expect(from.visiblePointIds).toEqual([1])
    expect(from.manuallyAddedPointIds).toEqual([])
    expect(newIds).toEqual([2])
    expect(to.points[1]).toMatchObject({ id: 2, origin: { index: 1 } })
    expect(to.visiblePointIds).toEqual([1, 2])
  })

  test('polygon and rectangle selection, replacing or adding', () => {
    const dataset = datasetWith([
      { id: 1, xPx: 1, yPx: 1 },
      { id: 2, xPx: 20, yPx: 20 },
    ])
    const box = [
      { xPx: 0, yPx: 0 },
      { xPx: 5, yPx: 0 },
      { xPx: 5, yPx: 5 },
      { xPx: 0, yPx: 5 },
    ]
    dataset.activatePointsInPolygon(box)
    expect(dataset.activePointIds).toEqual([1])
    dataset.activatePointsInRectangleArea(
      { xPx: 10, yPx: 10 },
      { xPx: 30, yPx: 30 },
      true,
    )
    expect(dataset.activePointIds).toEqual([1, 2])
    dataset.activatePointsInPolygon(box, true)
    expect(dataset.activePointIds).toEqual([1, 2])
    dataset.activatePointsInRectangleArea(
      { xPx: 10, yPx: 10 },
      { xPx: 30, yPx: 30 },
    )
    expect(dataset.activePointIds).toEqual([2])
  })

  test('mergeDuplicatePoints keeps the best point at the centroid', () => {
    const dataset = datasetWith([
      imported(0, 0, 0.2),
      imported(1, 2, 0.9),
      imported(2, 100, 0.5),
    ])
    expect(dataset.mergeDuplicatePoints(3)).toBe(1)
    expect(dataset.points).toEqual([
      { id: 2, xPx: 1, yPx: 0, origin: { series: 0, index: 1 }, score: 0.9 },
      { id: 3, xPx: 100, yPx: 0, origin: { series: 0, index: 2 }, score: 0.5 },
    ])
    expect(dataset.mergeDuplicatePoints(3)).toBe(0)
  })

  test('remove below score / restore; ids stay reserved meanwhile', () => {
    const dataset = datasetWith([
      imported(0, 1, 0.1),
      imported(1, 2, 0.9),
      { id: 3, xPx: 3, yPx: 3 },
    ])
    expect(dataset.removePointsBelowScore(0.5)).toBe(1)
    expect(dataset.points.map((p) => p.id)).toEqual([2, 3])
    expect(dataset.scoreRemovedPoints.map((p) => p.id)).toEqual([1])
    expect(dataset.visiblePointIds).toEqual([2, 3])

    dataset.removePointsBelowScore(0.95)
    // INFO: the unscored point 3 is never removed
    expect(dataset.points.map((p) => p.id)).toEqual([3])

    // INFO: removed ids are still taken
    expect(dataset.nextPointId).toBe(4)

    expect(dataset.restoreScoreRemovedPoints()).toBe(2)
    expect(dataset.points.map((p) => p.id).sort()).toEqual([1, 2, 3])
    expect(dataset.visiblePointIds.sort()).toEqual([1, 2, 3])
    expect(dataset.scoreRemovedPoints).toEqual([])
  })
})

describe('DatasetRepository series editing', () => {
  const setup = () => {
    const repository = new DatasetRepository()
    repository.datasets = [
      datasetWith([imported(0, 1), imported(1, 2)], 1),
      datasetWith([{ id: 1, xPx: 5, yPx: 5 }], 2),
    ]
    repository.datasets[1].axisSetId = 7
    return repository
  }

  test('movePoints moves selected points between datasets', () => {
    const repository = setup()
    expect(repository.movePoints(1, [2], 2)).toEqual([2])
    expect(repository.datasets[0].points).toHaveLength(1)
    expect(repository.datasets[1].points[1].origin).toEqual({
      series: 0,
      index: 1,
    })
    expect(repository.movePoints(1, [1], 1)).toEqual([])
    expect(() => repository.movePoints(1, [1], 99)).toThrow("doesn't exist")
  })

  test('mergeDatasets moves everything (incl. score-removed) and drops the source', () => {
    const repository = setup()
    repository.datasets[0].scoreRemovedPoints = [imported(5, 9, 0.1)]
    repository.setActiveDataset(1)
    repository.mergeDatasets(1, 2)
    expect(repository.datasets.map((d) => d.id)).toEqual([2])
    expect(repository.activeDatasetId).toBe(2)
    const target = repository.datasets[0]
    expect(target.points.map((p) => p.id)).toEqual([1, 2, 3])
    expect(target.scoreRemovedPoints.map((p) => p.id)).toEqual([4])
    repository.mergeDatasets(2, 2)
    expect(repository.datasets).toHaveLength(1)
  })

  test('mergeDatasets keeps the active dataset when it is the target', () => {
    const repository = setup()
    repository.setActiveDataset(2)
    repository.mergeDatasets(1, 2)
    expect(repository.activeDatasetId).toBe(2)
  })

  test('splitPointsToNewDataset creates a dataset on the same axis set', () => {
    const repository = setup()
    const id = repository.splitPointsToNewDataset(2, [1])
    expect(id).toBe(3)
    const created = repository.datasets[2]
    expect(created.name).toBe('d2 (split)')
    expect(created.axisSetId).toBe(7)
    expect(created.points).toHaveLength(1)
    expect(repository.datasets[1].points).toHaveLength(0)
  })
})
