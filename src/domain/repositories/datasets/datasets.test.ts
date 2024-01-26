import { expect } from '@jest/globals'
import { Dataset } from '../../models/dataset/dataset'
import { Datasets } from './datasets'

test('next dataset ID', () => {
  const datasets = new Datasets(new Dataset('dataset 1', [], 1))
  expect(datasets.nextDatasetId).toBe(2)
})

test('add a dataset', () => {
  const datasets = new Datasets(new Dataset('dataset 1', [], 1))
  datasets.addDataset(new Dataset('dataset 2', [], datasets.nextDatasetId))
  expect(datasets.datasets[0].id).toBe(1)
  expect(datasets.datasets[1].id).toBe(2)
})

test('pop a dataset', () => {
  const datasets = new Datasets(new Dataset('dataset 1', [], 1))
  datasets.addDataset(new Dataset('dataset 2', [], datasets.nextDatasetId))
  datasets.addDataset(new Dataset('dataset 3', [], datasets.nextDatasetId))
  datasets.addDataset(new Dataset('dataset 4', [], datasets.nextDatasetId))
  expect(datasets.datasets[datasets.datasets.length - 1].id).toBe(4)
  datasets.popDataset()
  expect(datasets.datasets[datasets.datasets.length - 1].id).toBe(3)
})

test('set plots', () => {
  const datasets = new Datasets(new Dataset('dataset 1', [], 1))
  datasets.addDataset(new Dataset('dataset 2', [], datasets.nextDatasetId))
  datasets.setPlots([{ xPx: 1, yPx: 1 }])
  expect(datasets.activeDataset.plots).toStrictEqual([
    { id: 1, xPx: 1, yPx: 1 },
  ])
  datasets.setPlots([{ xPx: 2, yPx: 2 }])
  expect(datasets.activeDataset.plots).toStrictEqual([
    { id: 1, xPx: 2, yPx: 2 },
  ])
})
