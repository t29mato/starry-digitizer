import { AxisSetInterface } from '@/domain/models/AxisSet/AxisSetInterface'
import { AxisSetRepositoryInterface } from './AxisSetRepositoryInterface'

export class AxisSetRepository implements AxisSetRepositoryInterface {
  axisSets: AxisSetInterface[]
  activeAxisSetId = 1

  constructor(axisSet: AxisSetInterface) {
    this.axisSets = [axisSet]
  }

  get activeAxisSet(): AxisSetInterface {
    const targetAxisSet = this.axisSets.find(
      (axisSet) => axisSet.id === this.activeAxisSetId,
    )
    if (!targetAxisSet) {
      throw new Error('There is no active axis set')
    }

    return targetAxisSet
  }
}
