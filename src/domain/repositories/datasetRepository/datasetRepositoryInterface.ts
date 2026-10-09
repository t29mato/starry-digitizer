import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'
import { Coord } from '@/@types/types'

export interface DatasetRepositoryInterface {
  datasets: DatasetInterface[]
  activeDatasetId: number
  showAllDatasets: boolean

  get activeDataset(): DatasetInterface
  get isViewAllMode(): boolean
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
  clearAllDatasets(): void
  activatePointsInRectangleArea(
    topLeftCoord: Coord,
    bottomRightCoord: Coord,
  ): void
  movePoints(fromId: number, pointIds: number[], toId: number): number[]
  mergeDatasets(sourceId: number, targetId: number): void
  splitPointsToNewDataset(fromId: number, pointIds: number[]): number
  toggleShowAllDatasets(): void
  getDatasetColor(datasetId: number): string
}
