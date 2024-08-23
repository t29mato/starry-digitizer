import { XYAxisSetInterface } from '@/domain/models/XYAxisSet/XYAxisSetInterface'
import { XYAxisSetRepositoryInterface } from './XYAxisSetRepositoryInterfaceRepositoryInterface'

export class XYAxisSetRipository implements XYAxisSetRepositoryInterface {
  XYAxisSets: XYAxisSetInterface[]
  activeAxisId = 1

  constructor(XYAxisSet: XYAxisSetInterface) {
    this.XYAxisSets = [XYAxisSet]
  }
}
