import { Dataset } from '@/domain/models/dataset/dataset'
import { DatasetInterface } from '../../models/dataset/datasetInterface'
import { DatasetRepositoryInterface } from './datasetRepositoryInterface'
import { Coord } from '@/@types/types'

export class DatasetRepository implements DatasetRepositoryInterface {
  datasets: DatasetInterface[]
  activeDatasetId = 1

  constructor() {
    this.datasets = [new Dataset('dataset 1', [], 1)]
  }

  get activeDataset(): DatasetInterface {
    const targetDataset = this.datasets.find((dataset) => {
      return dataset.id === this.activeDatasetId
    })
    if (!targetDataset) {
      throw new Error('There are no active datasets.')
    }
    return targetDataset
  }

  get nextPointId(): number {
    return this.activeDataset.nextPointId
  }

  get nextDatasetId(): number {
    if (this.datasets.length === 0) {
      return 1
    }
    return this.datasets[this.datasets.length - 1].id + 1
  }

  get lastDatasetId(): number {
    return this.datasets[this.datasets.length - 1].id
  }

  get lastDataset(): Dataset {
    const targetDataset = this.datasets.find(
      (dataset) => dataset.id === this.lastDatasetId,
    )
    if (!targetDataset) {
      throw new Error(
        'Unexpected Error: There are no dataset matched with the lastDatasetId',
      )
    }
    return targetDataset
  }

  setPoints(coords: Coord[]) {
    this.activeDataset.clearPoints()
    coords.forEach((coord) => {
      this.activeDataset.addPoint(coord.xPx, coord.yPx)
    })
  }

  sortPoints() {
    this.activeDataset.points.sort((a, b) => {
      return a.xPx - b.xPx
    })
  }

  setActiveDataset(id: number) {
    this.activeDatasetId = id
  }

  editDatasetName(datasetId: number, newName: string) {
    const targetDataset = this.datasets.find((dataset) => {
      return dataset.id === datasetId
    })
    if (!targetDataset) {
      throw new Error(datasetId + "doesn't exist.")
    }
    targetDataset.name = newName
  }

  createNewDataset(): void {
    this.addDataset(
      new Dataset(`dataset ${this.nextDatasetId}`, [], this.nextDatasetId),
    )
  }

  addDataset(dataset: DatasetInterface): void {
    this.datasets.push(dataset)
  }

  removeDataset(id: number): void {
    const datasetIndex = this.datasets.findIndex((dataset) => dataset.id === id)
    this.datasets = this.datasets.filter((dataset) => dataset.id !== id)
    this.setActiveDataset(
      this.datasets[datasetIndex - 1]
        ? this.datasets[datasetIndex - 1].id
        : this.datasets[0].id,
    )
  }

  removeAllDatasets(): void {
    this.datasets = []
    this.createNewDataset()
    this.setActiveDataset(1)
  }

  activatePointsInRectangleArea(topLeftCoord: Coord, bottomRightCoord: Coord) {
    this.activeDataset.activatePointsInRectangleArea(
      topLeftCoord,
      bottomRightCoord,
    )
  }
}
