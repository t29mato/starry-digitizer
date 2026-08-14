import { expect } from '@jest/globals'
import { Dataset } from './dataset'

test('sort in ascending order on X axis', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPoint(1, 1)
  dataset.addPoint(3, 3)
  dataset.addPoint(2, 2)
  expect(dataset.pointsSortedByXAscending()).toEqual([
    {
      id: 1,
      xPx: 1,
      yPx: 1,
    },
    {
      id: 3,
      xPx: 2,
      yPx: 2,
    },
    {
      id: 2,
      xPx: 3,
      yPx: 3,
    },
  ])
})

test('sort in descending order on X axis', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPoint(1, 1)
  dataset.addPoint(3, 3)
  dataset.addPoint(2, 2)
  expect(dataset.pointsSortedByXDescending()).toEqual([
    {
      id: 2,
      xPx: 3,
      yPx: 3,
    },
    {
      id: 3,
      xPx: 2,
      yPx: 2,
    },
    {
      id: 1,
      xPx: 1,
      yPx: 1,
    },
  ])
})

test('sort in ascending order on Y axis', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPoint(0, 1)
  dataset.addPoint(0, 3)
  dataset.addPoint(0, 2)
  expect(dataset.pointsSortedByYAscending()).toEqual([
    {
      id: 1,
      xPx: 0,
      yPx: 1,
    },
    {
      id: 3,
      xPx: 0,
      yPx: 2,
    },
    {
      id: 2,
      xPx: 0,
      yPx: 3,
    },
  ])
})

test('sort in descending order on Y axis', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPoint(0, 1)
  dataset.addPoint(0, 3)
  dataset.addPoint(0, 2)
  expect(dataset.pointsSortedByYDescending()).toEqual([
    {
      id: 2,
      xPx: 0,
      yPx: 3,
    },
    {
      id: 3,
      xPx: 0,
      yPx: 2,
    },
    {
      id: 1,
      xPx: 0,
      yPx: 1,
    },
  ])
})

test('sort in ascending order on ID', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPoint(0, 1)
  dataset.addPoint(0, 3)
  dataset.addPoint(0, 2)
  expect(dataset.pointsSortedByIdAscending()).toEqual([
    {
      id: 1,
      xPx: 0,
      yPx: 1,
    },
    {
      id: 2,
      xPx: 0,
      yPx: 3,
    },
    {
      id: 3,
      xPx: 0,
      yPx: 2,
    },
  ])
})

test('sort in descending order on ID', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPoint(0, 1)
  dataset.addPoint(0, 3)
  dataset.addPoint(0, 2)
  expect(dataset.pointsSortedByIdDescending()).toEqual([
    {
      id: 3,
      xPx: 0,
      yPx: 2,
    },
    {
      id: 2,
      xPx: 0,
      yPx: 3,
    },
    {
      id: 1,
      xPx: 0,
      yPx: 1,
    },
  ])
})

test('move points', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPoint(0, 0)
  dataset.moveActivePoint({ direction: 'up', distancePx: 10 })
  dataset.moveActivePoint({ direction: 'right', distancePx: 10 })
  dataset.moveActivePoint({ direction: 'down', distancePx: 20 })
  dataset.moveActivePoint({ direction: 'left', distancePx: 20 })
  expect(dataset.points[0]).toEqual({
    id: 1,
    xPx: -10,
    yPx: 10,
  })
})
test('scale points', () => {
  const dataset = new Dataset(
    'dataset 1',
    [
      { id: 1, xPx: 1, yPx: 1 },
      { id: 2, xPx: 2, yPx: 2 },
      { id: 3, xPx: 3, yPx: 3 },
    ],
    1,
  )

  const scaledPoints = dataset.scaledPoints(2)

  expect(scaledPoints).toEqual([
    { id: 1, xPx: 2, yPx: 2 },
    { id: 2, xPx: 4, yPx: 4 },
    { id: 3, xPx: 6, yPx: 6 },
  ])
})

test('scale empty points', () => {
  const dataset = new Dataset('dataset 1', [], 1)

  const scaledPoints = dataset.scaledPoints(2)

  expect(scaledPoints).toEqual([])
})
test('scale temp points', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addTempPoint(1, 1)
  dataset.addTempPoint(2, 2)
  dataset.addTempPoint(3, 3)
  const scaledTempPoints = dataset.scaledTempPoints(2)
  expect(scaledTempPoints).toEqual([
    { id: 1, xPx: 2, yPx: 2 },
    { id: 2, xPx: 4, yPx: 4 },
    { id: 3, xPx: 6, yPx: 6 },
  ])
})

test('scale empty temp points', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  const scaledTempPoints = dataset.scaledTempPoints(2)
  expect(scaledTempPoints).toEqual([])
})
test('pointsAreActive should return false when there are no active points', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  expect(dataset.pointsAreActive).toBe(false)
})

test('pointsAreActive should return true when there are active points', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPoint(1, 1)
  dataset.switchActivatedPoint(1)
  expect(dataset.pointsAreActive).toBe(true)
})
test('toggleActivatedPoint should activate the point if it is not already active', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPoint(1, 1)
  dataset.toggleActivatedPoint(1)
  expect(dataset.activePointIds).toEqual([])
})

test('toggleActivatedPoint should deactivate the point if it is already active', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPoint(1, 1)
  dataset.switchActivatedPoint(1)
  dataset.toggleActivatedPoint(1)
  expect(dataset.activePointIds).toEqual([])
})

test('toggleActivatedPoint should activate the point if it is not already active and deactivate other active points', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPoint(1, 1)
  dataset.addPoint(2, 2)
  dataset.switchActivatedPoint(1)
  dataset.toggleActivatedPoint(2)
  expect(dataset.activePointIds).toEqual([1, 2])
})

test('toggleActivatedPoint should deactivate the point if it is already active and activate other points', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPoint(1, 1)
  dataset.addPoint(2, 2)
  dataset.switchActivatedPoint(1)
  dataset.toggleActivatedPoint(1)
  expect(dataset.activePointIds).toEqual([])
})

describe('lastPointId', () => {
  test('returns -1 when there are no points', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    expect(dataset.lastPointId).toBe(-1)
  })

  test('returns the id of the last point when points exist', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addPoint(1, 1)
    dataset.addPoint(2, 2)
    expect(dataset.lastPointId).toBe(2)
  })
})

describe('clearPoint / clearPoints', () => {
  test('clearPoint removes the point and its visible/manually-added ids', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addPoint(1, 1)
    dataset.addManuallyAddedPointId(1)
    dataset.clearPoint(1)
    expect(dataset.points).toEqual([])
    expect(dataset.visiblePointIds).toEqual([])
    expect(dataset.manuallyAddedPointIds).toEqual([])
    expect(dataset.activePointIds).toEqual([])
  })

  test('clearPoints removes every point', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addPoint(1, 1)
    dataset.addPoint(2, 2)
    dataset.clearPoints()
    expect(dataset.points).toEqual([])
  })
})

describe('inactivatePoints / clearActivePoints / activateAllPoints / hasActive', () => {
  test('inactivatePoints clears activePointIds without removing points', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addPoint(1, 1)
    dataset.inactivatePoints()
    expect(dataset.activePointIds).toEqual([])
    expect(dataset.points).toHaveLength(1)
  })

  test('clearActivePoints removes only the active points', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addPoint(1, 1)
    dataset.addPoint(2, 2)
    dataset.switchActivatedPoint(1)
    dataset.clearActivePoints()
    expect(dataset.points).toEqual([{ id: 2, xPx: 2, yPx: 2 }])
    expect(dataset.activePointIds).toEqual([])
  })

  test('activateAllPoints activates every existing point', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addPoint(1, 1)
    dataset.addPoint(2, 2)
    dataset.activateAllPoints()
    expect(dataset.activePointIds).toEqual([1, 2])
  })

  test('hasActive reflects whether any point is active', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    expect(dataset.hasActive()).toBe(false)
    dataset.addPoint(1, 1)
    dataset.switchActivatedPoint(1)
    expect(dataset.hasActive()).toBe(true)
  })
})

describe('visible / manually-added point id bookkeeping', () => {
  test('addVisiblePointId is idempotent', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addVisiblePointId(5)
    dataset.addVisiblePointId(5)
    expect(dataset.visiblePointIds).toEqual([5])
  })

  test('removeVisiblePointId removes only the given id', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addVisiblePointId(5)
    dataset.addVisiblePointId(6)
    dataset.removeVisiblePointId(5)
    expect(dataset.visiblePointIds).toEqual([6])
  })

  test('addManuallyAddedPointId is idempotent', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addManuallyAddedPointId(5)
    dataset.addManuallyAddedPointId(5)
    expect(dataset.manuallyAddedPointIds).toEqual([5])
  })

  test('removeManuallyAddedPointId removes only the given id', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addManuallyAddedPointId(5)
    dataset.addManuallyAddedPointId(6)
    dataset.removeManuallyAddedPointId(5)
    expect(dataset.manuallyAddedPointIds).toEqual([6])
  })

  test('manuallyAddedPoints returns only the points flagged as manually added', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addPoint(1, 1)
    dataset.addPoint(2, 2)
    dataset.addManuallyAddedPointId(2)
    expect(dataset.manuallyAddedPoints).toEqual([{ id: 2, xPx: 2, yPx: 2 }])
  })
})

describe('rectangle-area selection', () => {
  test('pointsInRectangleArea returns only the points within the bounds (inclusive)', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addPoint(0, 0)
    dataset.addPoint(5, 5)
    dataset.addPoint(20, 20)
    expect(
      dataset.pointsInRectangleArea({ xPx: 0, yPx: 0 }, { xPx: 10, yPx: 10 }),
    ).toEqual([
      { id: 1, xPx: 0, yPx: 0 },
      { id: 2, xPx: 5, yPx: 5 },
    ])
  })

  test('activatePointsInRectangleArea replaces the active selection with the points inside the bounds', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addPoint(0, 0)
    dataset.addPoint(5, 5)
    dataset.addPoint(20, 20)
    dataset.switchActivatedPoint(3) // pre-existing selection, should be replaced
    dataset.activatePointsInRectangleArea(
      { xPx: 0, yPx: 0 },
      { xPx: 10, yPx: 10 },
    )
    expect(dataset.activePointIds).toEqual([1, 2])
  })
})

describe('moveTempPointToPoint', () => {
  test('promotes a temp point to a real point and removes the temp point', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addTempPoint(3, 4)
    dataset.moveTempPointToPoint(1)
    expect(dataset.points).toEqual([{ id: 1, xPx: 3, yPx: 4 }])
    expect(dataset.tempPoints).toEqual([])
  })

  test('does nothing when the given temp point id does not exist', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.addTempPoint(3, 4)
    dataset.moveTempPointToPoint(999)
    expect(dataset.points).toEqual([])
    expect(dataset.tempPoints).toEqual([{ id: 1, xPx: 3, yPx: 4 }])
  })
})

test('setAxisSetId updates axisSetId', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.setAxisSetId(7)
  expect(dataset.axisSetId).toBe(7)
})
