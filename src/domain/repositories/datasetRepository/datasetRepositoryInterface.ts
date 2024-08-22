import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'
import { Coord } from '@/domain/models/dataset/datasetInterface'

export interface DatasetRepositoryInterface {
  datasets: DatasetInterface[]
  activeDatasetId: number

  get activeDataset(): DatasetInterface
  get nextPlotId(): number
  get nextDatasetId(): number
  get lastDatasetId(): number

  setPlots(coords: Coord[]): void
  sortPlots(): void
  setActiveDataset(id: number): void
  editDatasetName(datasetId: number, newName: string): void
  createNewDataset(): void
  addDataset(dataset: DatasetInterface): void
  removeDataset(id: number): void
  activatePlotsInRectangleArea(
    topLeftCoord: Coord,
    bottomRightCoord: Coord,
  ): void
}
