import { expect } from '@jest/globals'
import { Dataset } from '@plot-digitizer/core'
import { DatasetRepository } from './datasetRepository'

test('next dataset ID', () => {
  const datasets = new DatasetRepository()
  expect(datasets.nextDatasetId).toBe(2)
})

test('add a dataset', () => {
  const datasets = new DatasetRepository()
  datasets.addDataset(new Dataset('dataset 2', [], datasets.nextDatasetId))
  expect(datasets.datasets[0].id).toBe(1)
  expect(datasets.datasets[1].id).toBe(2)
})

test('remove a dataset', () => {
  const datasets = new DatasetRepository()
  datasets.addDataset(new Dataset('dataset 2', [], datasets.nextDatasetId))
  datasets.addDataset(new Dataset('dataset 3', [], datasets.nextDatasetId))

  datasets.removeDataset(3)
  expect(datasets.activeDatasetId).toBe(2)
})

test('set points', () => {
  const datasets = new DatasetRepository()
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

test('clearAllDatasets clears datasets without resetting activeDatasetId', () => {
  const datasets = new DatasetRepository()
  datasets.addDataset(new Dataset('dataset 2', [], datasets.nextDatasetId))
  datasets.addDataset(new Dataset('dataset 3', [], datasets.nextDatasetId))
  datasets.setActiveDataset(2)

  expect(datasets.datasets.length).toBe(3)
  expect(datasets.activeDatasetId).toBe(2)

  datasets.clearAllDatasets()

  expect(datasets.datasets.length).toBe(0)
  // activeDatasetId is not reset - caller is responsible for setting it
  expect(datasets.activeDatasetId).toBe(2)
})

test('removeAllDatasets vs clearAllDatasets', () => {
  const repository1 = new DatasetRepository()
  const repository2 = new DatasetRepository()

  // removeAllDatasets creates a new dataset
  repository1.removeAllDatasets()
  expect(repository1.datasets.length).toBe(1)
  expect(repository1.activeDatasetId).toBe(1)

  // clearAllDatasets does not create a new dataset and does not reset activeDatasetId
  repository2.setActiveDataset(1) // Set to 1 initially (same as constructor default)
  repository2.clearAllDatasets()
  expect(repository2.datasets.length).toBe(0)
  // activeDatasetId remains unchanged (still 1 from constructor)
  expect(repository2.activeDatasetId).toBe(1)
})

test('isViewAllMode returns true when activeDatasetId is 0', () => {
  const repository = new DatasetRepository()
  expect(repository.isViewAllMode).toBe(false)

  repository.setActiveDataset(0)
  expect(repository.isViewAllMode).toBe(true)

  repository.setActiveDataset(1)
  expect(repository.isViewAllMode).toBe(false)
})

test('activeDataset returns first dataset in view all mode', () => {
  const repository = new DatasetRepository()
  repository.addDataset(new Dataset('dataset 2', [], repository.nextDatasetId))

  repository.setActiveDataset(0) // View all mode
  // In view all mode, activeDataset returns the first dataset as fallback
  expect(repository.activeDataset.id).toBe(1)
})

test('activeDataset throws error in view all mode with no datasets', () => {
  const repository = new DatasetRepository()
  repository.clearAllDatasets()
  repository.setActiveDataset(0)

  expect(() => repository.activeDataset).toThrow('There are no datasets.')
})

test('getDatasetColor returns dataset color if set', () => {
  const repository = new DatasetRepository()
  repository.datasets[0].color = '#FF0000'

  expect(repository.getDatasetColor(1)).toBe('#FF0000')
})

test('getDatasetColor returns default color based on index', () => {
  const repository = new DatasetRepository()
  repository.addDataset(new Dataset('dataset 2', [], repository.nextDatasetId))
  repository.addDataset(new Dataset('dataset 3', [], repository.nextDatasetId))

  // Default colors based on index
  expect(repository.getDatasetColor(1)).toBe('#2196F3') // Blue (index 0)
  expect(repository.getDatasetColor(2)).toBe('#FF9800') // Orange (index 1)
  expect(repository.getDatasetColor(3)).toBe('#4CAF50') // Green (index 2)
})

test('toggleShowAllDatasets toggles the flag', () => {
  const repository = new DatasetRepository()
  expect(repository.showAllDatasets).toBe(false)

  repository.toggleShowAllDatasets()
  expect(repository.showAllDatasets).toBe(true)

  repository.toggleShowAllDatasets()
  expect(repository.showAllDatasets).toBe(false)
})
