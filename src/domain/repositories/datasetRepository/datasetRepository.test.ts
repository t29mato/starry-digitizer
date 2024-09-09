import { expect } from '@jest/globals'
import { Dataset } from '../../models/dataset/dataset'
import { DatasetRepository } from './datasetRepository'

test('next dataset ID', () => {
  const datasets = new DatasetRepository(new Dataset('dataset 1', [], 1))
  expect(datasets.nextDatasetId).toBe(2)
})

test('add a dataset', () => {
  const datasets = new DatasetRepository(new Dataset('dataset 1', [], 1))
  datasets.addDataset(new Dataset('dataset 2', [], datasets.nextDatasetId))
  expect(datasets.datasets[0].id).toBe(1)
  expect(datasets.datasets[1].id).toBe(2)
})

test('remove a dataset', () => {
  const datasets = new DatasetRepository(new Dataset('dataset 1', [], 1))
  datasets.addDataset(new Dataset('dataset 2', [], datasets.nextDatasetId))
  datasets.addDataset(new Dataset('dataset 3', [], datasets.nextDatasetId))

  datasets.removeDataset(3)
  expect(datasets.activeDatasetId).toBe(1)
})

test('set points', () => {
  const datasets = new DatasetRepository(new Dataset('dataset 1', [], 1))
  datasets.addDataset(new Dataset('dataset 2', [], datasets.nextDatasetId))
  datasets.setPoints([{ xPx: 1, yPx: 1 }])
  expect(datasets.activeDataset.points).toStrictEqual([
    { id: 1, xPx: 1, yPx: 1 },
  ])
  datasets.setPoints([{ xPx: 2, yPx: 2 }])
  expect(datasets.activeDataset.points).toStrictEqual([
    { id: 1, xPx: 2, yPx: 2 },
  ])
})
