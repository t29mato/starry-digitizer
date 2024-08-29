import { XYAxisSetInterface } from '@/domain/models/XYAxisSet/XYAxisSetInterface'
import { XYAxisSetRepositoryInterface } from './XYAxisSetRepositoryInterface'

export class XYAxisSetRepository implements XYAxisSetRepositoryInterface {
  XYAxisSets: XYAxisSetInterface[]
  activeXYAxisSetId = 1

  constructor(XYAxisSet: XYAxisSetInterface) {
    this.XYAxisSets = [XYAxisSet]
  }

  get activeXYAxisSet() {
    return this.XYAxisSets.find(
      (XYAxisSet) => XYAxisSet.id === this.activeXYAxisSetId,
    )
  }
}
