import { AxisSetInterface } from '@/domain/models/AxisSet/AxisSetInterface'

export interface AxisSetRepositoryInterface {
  axisSets: AxisSetInterface[]

  activeAxisSet: AxisSetInterface
}
