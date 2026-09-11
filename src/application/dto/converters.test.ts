import { expect, describe, it } from '@jest/globals'
import {
  toAxisSetDTO,
  fromAxisSetDTO,
  toDatasetDTO,
  fromDatasetDTO,
} from './converters'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { Dataset } from '@/domain/models/dataset/dataset'

// INFO: A DTO is a snapshot, not a window onto live state. Hosts keep the
// object handed to them by getProject() / `update:project` and compare it
// against a later one, so sharing the entity's own arrays and coord objects
// would make those two reads indistinguishable. The reverse matters too: a
// host's DTO must not turn into the library's mutable state.

function buildAxisSet(): AxisSet {
  return new AxisSet(
    new Axis('x1', 0, { xPx: 10, yPx: 20 }),
    new Axis('x2', 1, { xPx: 30, yPx: 20 }),
    new Axis('y1', 0, { xPx: 10, yPx: 40 }),
    new Axis('y2', 1, { xPx: 10, yPx: 5 }),
    new Axis('x2y2', -1, { xPx: -999, yPx: -999 }),
    1,
    'XY Axes 1',
  )
}

describe('toAxisSetDTO', () => {
  it('copies the axis coords instead of sharing them', () => {
    const axisSet = buildAxisSet()
    const dto = toAxisSetDTO(axisSet)

    expect(dto.x1.coord).toEqual({ xPx: 10, yPx: 20 })
    expect(dto.x1.coord).not.toBe(axisSet.x1.coord)

    axisSet.x1.coord = { xPx: 999, yPx: 999 }
    axisSet.y2.coord.yPx = 123

    expect(dto.x1.coord).toEqual({ xPx: 10, yPx: 20 })
    expect(dto.y2.coord).toEqual({ xPx: 10, yPx: 5 })
  })
})

describe('fromAxisSetDTO', () => {
  it('does not write into the DTO it was given', () => {
    const dto = toAxisSetDTO(buildAxisSet())
    const restored = fromAxisSetDTO(dto)

    expect(restored.x1.coord).not.toBe(dto.x1.coord)

    restored.x1.coord.xPx = 777
    expect(dto.x1.coord.xPx).toBe(10)
  })
})

describe('toDatasetDTO', () => {
  it('copies points and the id arrays instead of sharing them', () => {
    const dataset = new Dataset(
      'dataset 1',
      [
        { id: 1, xPx: 5, yPx: 6 },
        { id: 2, xPx: 7, yPx: 8 },
      ],
      1,
    )
    dataset.visiblePointIds = [1, 2]
    dataset.manuallyAddedPointIds = [1]

    const dto = toDatasetDTO(dataset)

    expect(dto.points).not.toBe(dataset.points)
    expect(dto.points[0]).not.toBe(dataset.points[0])
    expect(dto.visiblePointIds).not.toBe(dataset.visiblePointIds)
    expect(dto.manuallyAddedPointIds).not.toBe(dataset.manuallyAddedPointIds)

    // INFO: this is the host-visible symptom the copies prevent — carry on
    // digitising and the DTO handed out earlier must not change.
    dataset.addPoint(9, 10)
    dataset.points[0].xPx = 999
    dataset.visiblePointIds.push(3)

    expect(dto.points).toHaveLength(2)
    expect(dto.points[0]).toEqual({ id: 1, xPx: 5, yPx: 6 })
    expect(dto.visiblePointIds).toEqual([1, 2])
  })
})

describe('fromDatasetDTO', () => {
  it('does not write into the DTO it was given', () => {
    const dto = toDatasetDTO(
      new Dataset('dataset 1', [{ id: 1, xPx: 5, yPx: 6 }], 1),
    )
    const restored = fromDatasetDTO(dto)

    expect(restored.points).not.toBe(dto.points)
    expect(restored.points[0]).not.toBe(dto.points[0])

    restored.addPoint(11, 12)
    restored.points[0].xPx = 999

    expect(dto.points).toHaveLength(1)
    expect(dto.points[0]).toEqual({ id: 1, xPx: 5, yPx: 6 })
  })
})
