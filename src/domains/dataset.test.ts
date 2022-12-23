import { Dataset } from './dataset'

test('sort in ascending order on X axis', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPlot(1, 1)
  dataset.addPlot(3, 3)
  dataset.addPlot(2, 2)
  expect(dataset.plotsSortedByXAscending()).toEqual([
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
  dataset.addPlot(1, 1)
  dataset.addPlot(3, 3)
  dataset.addPlot(2, 2)
  expect(dataset.plotsSortedByXDescending()).toEqual([
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
  dataset.addPlot(0, 1)
  dataset.addPlot(0, 3)
  dataset.addPlot(0, 2)
  expect(dataset.plotsSortedByYAscending()).toEqual([
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
  dataset.addPlot(0, 1)
  dataset.addPlot(0, 3)
  dataset.addPlot(0, 2)
  expect(dataset.plotsSortedByYDescending()).toEqual([
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
  dataset.addPlot(0, 1)
  dataset.addPlot(0, 3)
  dataset.addPlot(0, 2)
  expect(dataset.plotsSortedByIdAscending()).toEqual([
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
  dataset.addPlot(0, 1)
  dataset.addPlot(0, 3)
  dataset.addPlot(0, 2)
  expect(dataset.plotsSortedByIdDescending()).toEqual([
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

test('move plots', () => {
  const dataset = new Dataset('dataset 1', [], 1)
  dataset.addPlot(0, 0)
  dataset.moveActivePlot({direction: 'up', distancePx: 10})
  dataset.moveActivePlot({direction: 'right', distancePx: 10})
  dataset.moveActivePlot({direction: 'down', distancePx: 20})
  dataset.moveActivePlot({direction: 'left', distancePx: 20})
  expect(dataset.plots[0]).toEqual({
      id: 1,
      xPx: -10,
      yPx: 10,
  })
})
