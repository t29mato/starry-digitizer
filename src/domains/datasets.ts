import { DatasetInterface, Plots } from './datasetInterface'

export class Datasets {
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

  setPlots(plots: Plots) {
    this.activeDataset.plots = plots
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

  addDataset(dataset: DatasetInterface) {
    this.datasets.push(dataset)
  }

  popDataset() {
    if (this.datasets.length === 1) {
      return
    }
    if (this.datasets[this.datasets.length - 1].id === this.activeDatasetId) {
      this.setActiveDataset(this.datasets[this.datasets.length - 2].id)
    }
    this.datasets.pop()
  }
}
