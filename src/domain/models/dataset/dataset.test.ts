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
  expect(dataset.activePointIds).toEqual([1])
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
  expect(dataset.activePointIds).toEqual([2])
})

test('toggleActivatedPoint should deactivate the point if it is already active and activate other points', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPoint(1, 1)
  dataset.addPoint(2, 2)
  dataset.switchActivatedPoint(1)
  dataset.toggleActivatedPoint(1)
  expect(dataset.activePointIds).toEqual([2])
})
