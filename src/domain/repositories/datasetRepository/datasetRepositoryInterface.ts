import type { DatasetInterface } from '@plot-digitizer/core'
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
  toggleShowAllDatasets(): void
  getDatasetColor(datasetId: number): string
}
