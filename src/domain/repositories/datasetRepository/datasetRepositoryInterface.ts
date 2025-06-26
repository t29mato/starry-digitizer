import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'
import { Coord } from '@/@types/types'

export interface DatasetRepositoryInterface {
  datasets: DatasetInterface[]
  activeDatasetId: number

  get activeDataset(): DatasetInterface
  get nextPointId(): number
  get nextDatasetId(): number
  get lastDatasetId(): number
  get lastDataset(): DatasetInterface

  setPoints(coords: Coord[]): void
  sortPoints(): void
  setActiveDataset(id: number): void
  editDatasetName(datasetId: number, newName: string): void
  createNewDataset(): void
  addDataset(dataset: DatasetInterface): void
  removeDataset(id: number): void
  removeAllDatasets(): void
  activatePointsInRectangleArea(
    topLeftCoord: Coord,
    bottomRightCoord: Coord,
  ): void
}
