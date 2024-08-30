import { AxisSetInterface } from '@/domain/models/AxisSet/AxisSetInterface'

export interface AxisSetRepositoryInterface {
  axisSets: AxisSetInterface[]
  activeAxisSetId: number
  activeAxisSet: AxisSetInterface
  nextAxisSetId: number
  lastAxisSetId: number
  setActiveAxisSet(id: number): void
  createNewAxisSet(): void
  addAxisSet(dataset: AxisSetInterface): void
  removeAxisSet(id: number): void
}
