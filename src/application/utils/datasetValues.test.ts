import { expect, describe, it } from '@jest/globals'
import {
  calculatePhysicalValue,
  datasetToValues,
  getDatasetValues,
} from './datasetValues'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { Dataset } from '@/domain/models/dataset/dataset'
import { AxisSetRepository } from '@/domain/repositories/axisSetRepository/axisSetRepository'
import { DatasetRepository } from '@/domain/repositories/datasetRepository/datasetRepository'

const EFFECTIVE_DIGITS = 4

/**
 * A rectilinear axis set: x runs 0px..1000px for x1Value..x2Value, y runs
 * 1000px..0px for y1Value..y2Value.
 */
const buildAxisSet = (
  id = 1,
  {
    x1Value = 1,
    x2Value = 10,
    y1Value = 1,
    y2Value = 10,
  }: Partial<
    Record<'x1Value' | 'x2Value' | 'y1Value' | 'y2Value', number>
  > = {},
): AxisSet =>
  new AxisSet(
    new Axis('x1', x1Value, { xPx: 0, yPx: 0 }),
    new Axis('x2', x2Value, { xPx: 1000, yPx: 0 }),
    new Axis('y1', y1Value, { xPx: 0, yPx: 1000 }),
    new Axis('y2', y2Value, { xPx: 0, yPx: 0 }),
    new Axis('x2y2', -1, { xPx: -999, yPx: -999 }),
    id,
    `XY Axes ${id}`,
  )

/** An axis set whose coordinates have never been placed on the image. */
const buildUncalibratedAxisSet = (id = 1): AxisSet =>
  new AxisSet(
    new Axis('x1', 0),
    new Axis('x2', 1),
    new Axis('y1', 0),
    new Axis('y2', 1),
    new Axis('x2y2', -1),
    id,
    `XY Axes ${id}`,
  )

describe('calculatePhysicalValue', () => {
  it('interpolates linearly between the axis coordinates', () => {
    const result = calculatePhysicalValue(
      buildAxisSet(),
      500,
      500,
      EFFECTIVE_DIGITS,
    )

    expect(result).toEqual({ x: 5.5, y: 5.5 })
  })

  it('interpolates logarithmically when the x axis is a log scale', () => {
    const axisSet = buildAxisSet(1, { x2Value: 100 })
    axisSet.xIsLogScale = true

    const result = calculatePhysicalValue(axisSet, 500, 500, EFFECTIVE_DIGITS)

    expect(result.x).toBeCloseTo(10, 6)
    expect(result.y).toBeCloseTo(5.5, 6)
  })

  it('interpolates logarithmically when the y axis is a log scale', () => {
    const axisSet = buildAxisSet(1, { y2Value: 100 })
    axisSet.yIsLogScale = true

    const result = calculatePhysicalValue(axisSet, 500, 500, EFFECTIVE_DIGITS)

    expect(result.x).toBeCloseTo(5.5, 6)
    expect(result.y).toBeCloseTo(10, 6)
  })

  it('projects onto the tilted axes when considerGraphTilt is on', () => {
    // INFO: the x axis runs from (0,0) to (1000,100), i.e. the graph is
    // rotated slightly; the point (500,550) sits on the axis-parallel grid
    // line for y = 5.5, which only the tilt-aware projection recovers.
    const axisSet = new AxisSet(
      new Axis('x1', 1, { xPx: 0, yPx: 0 }),
      new Axis('x2', 10, { xPx: 1000, yPx: 100 }),
      new Axis('y1', 1, { xPx: 0, yPx: 1000 }),
      new Axis('y2', 10, { xPx: 0, yPx: 0 }),
      new Axis('x2y2', -1, { xPx: -999, yPx: -999 }),
      1,
      'XY Axes 1',
    )

    const withoutTilt = calculatePhysicalValue(axisSet, 500, 550, 4)
    expect(withoutTilt.y).toBeCloseTo(5.05, 6)

    axisSet.considerGraphTilt = true
    const withTilt = calculatePhysicalValue(axisSet, 500, 550, 4)

    expect(withTilt.x).toBeCloseTo(5.5, 6)
    expect(withTilt.y).toBeCloseTo(5.5, 6)
  })

  it('returns no usable value for an axis set whose coordinates were never placed', () => {
    const result = calculatePhysicalValue(
      buildUncalibratedAxisSet(),
      500,
      500,
      EFFECTIVE_DIGITS,
    )

    // INFO: every axis coordinate still sits on the (-999, -999) placeholder;
    // calculatePhysicalValue guards this and returns NaN (hosts see null in
    // JSON) instead of the Infinity the raw calculator would produce.
    expect(result.x).toBeNaN()
    expect(result.y).toBeNaN()
  })

  it('returns NaN when the two axis values are identical', () => {
    const axisSet = buildAxisSet(1, { x1Value: 5, x2Value: 5 })

    const result = calculatePhysicalValue(axisSet, 500, 500, EFFECTIVE_DIGITS)

    expect(result.x).toBeNaN()
    expect(result.y).toBeNaN()
  })
})

describe('datasetToValues', () => {
  it('mirrors the pixel points alongside the physical values', () => {
    const dataset = new Dataset(
      'dataset 1',
      [
        { id: 1, xPx: 500, yPx: 500 },
        { id: 2, xPx: 0, yPx: 1000 },
      ],
      1,
    )

    const values = datasetToValues(dataset, buildAxisSet(), EFFECTIVE_DIGITS)

    expect(values.pixelPoints).toEqual([
      { x: 500, y: 500 },
      { x: 0, y: 1000 },
    ])
    expect(values.points).toEqual([
      { x: 5.5, y: 5.5 },
      { x: 1, y: 1 },
    ])
    expect(values.id).toBe(1)
    expect(values.name).toBe('dataset 1')
    expect(values.axisSetId).toBe(1)
  })

  it('returns NaN values when no axis set is given', () => {
    const dataset = new Dataset('dataset 1', [{ id: 1, xPx: 5, yPx: 6 }], 1)

    const values = datasetToValues(dataset, undefined, EFFECTIVE_DIGITS)

    expect(values.points[0].x).toBeNaN()
    expect(values.points[0].y).toBeNaN()
    // INFO: the pixel coordinates are still usable without calibration
    expect(values.pixelPoints).toEqual([{ x: 5, y: 6 }])
  })

  it('propagates externalId when the dataset has one', () => {
    const dataset = new Dataset('dataset 1', [], 1)
    dataset.externalId = 'sample-42'

    expect(datasetToValues(dataset, buildAxisSet(), 4).externalId).toBe(
      'sample-42',
    )
  })

  it('omits externalId when the dataset does not have one', () => {
    const dataset = new Dataset('dataset 1', [], 1)

    expect(datasetToValues(dataset, buildAxisSet(), 4)).not.toHaveProperty(
      'externalId',
    )
  })
})

describe('getDatasetValues', () => {
  const setup = () => {
    const axisSetRepository = new AxisSetRepository()
    const datasetRepository = new DatasetRepository()
    axisSetRepository.axisSets = []
    datasetRepository.clearAllDatasets()
    return { axisSetRepository, datasetRepository }
  }

  it('converts every dataset with its own axis set', () => {
    const { axisSetRepository, datasetRepository } = setup()
    axisSetRepository.addAxisSet(buildAxisSet(1))
    // INFO: axis set 2 spans 0..100 instead of 1..10, so the same pixel
    // coordinate must produce a different physical value.
    axisSetRepository.addAxisSet(
      buildAxisSet(2, { x1Value: 0, x2Value: 100, y1Value: 0, y2Value: 100 }),
    )

    const first = new Dataset('dataset 1', [{ id: 1, xPx: 500, yPx: 500 }], 1)
    first.axisSetId = 1
    const second = new Dataset('dataset 2', [{ id: 1, xPx: 500, yPx: 500 }], 2)
    second.axisSetId = 2
    second.externalId = 'sample-2'
    datasetRepository.addDataset(first)
    datasetRepository.addDataset(second)

    const values = getDatasetValues(
      axisSetRepository,
      datasetRepository,
      EFFECTIVE_DIGITS,
    )

    expect(values).toHaveLength(2)
    expect(values[0].points).toEqual([{ x: 5.5, y: 5.5 }])
    expect(values[1].points).toEqual([{ x: 50, y: 50 }])
    expect(values[1].externalId).toBe('sample-2')
  })

  it('returns NaN values for a dataset whose axisSetId matches nothing', () => {
    const { axisSetRepository, datasetRepository } = setup()
    axisSetRepository.addAxisSet(buildAxisSet(1))

    const orphan = new Dataset('orphan', [{ id: 1, xPx: 500, yPx: 500 }], 1)
    orphan.axisSetId = 99
    datasetRepository.addDataset(orphan)

    const values = getDatasetValues(
      axisSetRepository,
      datasetRepository,
      EFFECTIVE_DIGITS,
    )

    expect(values[0].axisSetId).toBe(99)
    expect(values[0].points[0].x).toBeNaN()
    expect(values[0].points[0].y).toBeNaN()
  })

  it('returns no usable values when the dataset axis set is uncalibrated', () => {
    const { axisSetRepository, datasetRepository } = setup()
    axisSetRepository.addAxisSet(buildUncalibratedAxisSet(1))

    const dataset = new Dataset('dataset 1', [{ id: 1, xPx: 500, yPx: 500 }], 1)
    datasetRepository.addDataset(dataset)

    const values = getDatasetValues(
      axisSetRepository,
      datasetRepository,
      EFFECTIVE_DIGITS,
    )

    expect(values[0].points[0].x).toBeNaN()
    expect(values[0].points[0].y).toBeNaN()
  })
})
