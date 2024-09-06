import { Dataset } from '@/domain/models/dataset/dataset'
import { DatasetInterface, Coord } from '../../models/dataset/datasetInterface'

export class DatasetRepository {
  datasets: DatasetInterface[]
  activeDatasetId = 1

  constructor(dataset: DatasetInterface) {
    this.datasets = [dataset]
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

  get nextPlotId(): number {
    return this.activeDataset.nextPlotId
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

  setPlots(coords: Coord[]) {
    this.activeDataset.clearPlots()
    coords.forEach((coord) => {
      this.activeDataset.addPlot(coord.xPx, coord.yPx)
    })
  }

  sortPlots() {
    this.activeDataset.plots.sort((a, b) => {
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
    this.datasets = this.datasets.filter((dataset) => dataset.id !== id)
    this.setActiveDataset(this.datasets[0].id)
  }

  activatePlotsInRectangleArea(topLeftCoord: Coord, bottomRightCoord: Coord) {
    this.activeDataset.activatePlotsInRectangleArea(
      topLeftCoord,
      bottomRightCoord,
    )
  }
}
