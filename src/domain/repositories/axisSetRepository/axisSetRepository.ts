import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { AxisSetRepositoryInterface } from './axisSetRepositoryInterface'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { Axis } from '@/domain/models/axis/axis'

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

  get nextAxisSetId(): number {
    if (this.axisSets.length === 0) {
      return 1
    }
    return this.axisSets[this.axisSets.length - 1].id + 1
  }

  get lastAxisSetId(): number {
    return this.axisSets[this.axisSets.length - 1].id
  }

  setActiveAxisSet(id: number): void {
    this.activeAxisSetId = id
  }

  createNewAxisSet(): void {
    this.addAxisSet(
      new AxisSet(
        new Axis('x1', 0),
        new Axis('x2', 1),
        new Axis('y1', 0),
        new Axis('y2', 1),
        new Axis('x2y2', -1),
        this.nextAxisSetId,
        `XY Axes ${this.nextAxisSetId}`,
      ),
    )
  }

  addAxisSet(axisSet: AxisSetInterface): void {
    this.axisSets.push(axisSet)
  }

  removeAxisSet(id: number): void {
    this.axisSets = this.axisSets.filter((axisSet) => axisSet.id !== id)
    this.setActiveAxisSet(this.axisSets[0].id)
  }
}
