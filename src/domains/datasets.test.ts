import { Dataset } from './dataset'
import { Datasets } from './datasets'

test('next dataset ID', () => {
  const datasets = new Datasets(new Dataset('dataset 1', [], 1))
  expect(datasets.nextDatasetId).toBe(2)
})

test('Adding dataset', () => {
  const datasets = new Datasets(new Dataset('dataset 1', [], 1))
  datasets.addDataset()
  expect(datasets.datasets[0].id).toBe(1)
  expect(datasets.datasets[1].id).toBe(2)
})

test('Deleting dataset', () => {
  const datasets = new Datasets(new Dataset('dataset 1', [], 1))
  datasets.addDataset()
  datasets.addDataset()
  datasets.addDataset()
  expect(datasets.datasets[datasets.datasets.length - 1].id).toBe(4)
  datasets.popDataset()
  expect(datasets.datasets[datasets.datasets.length - 1].id).toBe(3)
})
