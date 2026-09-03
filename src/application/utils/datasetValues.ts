import AxisSetCalculator from '@/domain/services/axisSetCalculator'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'
import { DatasetRepositoryInterface } from '@/domain/repositories/datasetRepository/datasetRepositoryInterface'
import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'

/**
 * A dataset with its points converted to physical (axis-calibrated) values.
 * `points[i]` corresponds to `pixelPoints[i]`. When the dataset's axis set is
 * not fully calibrated, `points[i].x/y` are NaN (note: NaN serializes to
 * null in JSON).
 */
export interface DatasetValues {
  id: number
  name: string
  axisSetId: number
  externalId?: string
  /** Axis-calibrated physical values (log scale and graph tilt applied) */
  points: { x: number; y: number }[]
  /** Pixel coordinates on the original image */
  pixelPoints: { x: number; y: number }[]
}

export type XYValue = { x: number; y: number }

/**
 * Convert one pixel coordinate to physical values with the given axis set.
 * Returns NaN components when the axis set cannot be used for calibration.
 */
export function calculatePhysicalValue(
  axisSet: AxisSetInterface,
  xPx: number,
  yPx: number,
  effectiveDigits: number,
): XYValue {
  // INFO: AxisSetCalculator only guards against equal axis values; with the
  // (-999,-999) placeholder coords it would divide by a zero-length axis and
  // return Infinity. Hosts should see NaN for an uncalibrated axis set.
  // (Not Axis.coordIsFilled: that treats a legitimate (0,0) as unset.)
  const isSet = (c: { xPx: number; yPx: number }) => c.xPx >= 0 && c.yPx >= 0
  const calibrated =
    isSet(axisSet.x1.coord) &&
    isSet(axisSet.x2.coord) &&
    isSet(axisSet.y1.coord) &&
    isSet(axisSet.y2.coord)
  if (!calibrated) {
    return { x: NaN, y: NaN }
  }
  const calculator = new AxisSetCalculator(
    axisSet,
    { x: axisSet.xIsLogScale, y: axisSet.yIsLogScale },
    effectiveDigits,
  )
  const { xV, yV } = calculator.calculateXYValues(xPx, yPx)
  return { x: parseFloat(xV), y: parseFloat(yV) }
}

export function datasetToValues(
  dataset: DatasetInterface,
  axisSet: AxisSetInterface | undefined,
  effectiveDigits: number,
): DatasetValues {
  const values: DatasetValues = {
    id: dataset.id,
    name: dataset.name,
    axisSetId: dataset.axisSetId,
    points: dataset.points.map((p) =>
      axisSet
        ? calculatePhysicalValue(axisSet, p.xPx, p.yPx, effectiveDigits)
        : { x: NaN, y: NaN },
    ),
    pixelPoints: dataset.points.map((p) => ({ x: p.xPx, y: p.yPx })),
  }
  if (dataset.externalId !== undefined) {
    values.externalId = dataset.externalId
  }
  return values
}

/**
 * All datasets converted with EACH DATASET'S OWN axis set (dataset.axisSetId),
 * not the currently active one.
 */
export function getDatasetValues(
  axisSetRepository: AxisSetRepositoryInterface,
  datasetRepository: DatasetRepositoryInterface,
  effectiveDigits: number,
): DatasetValues[] {
  return datasetRepository.datasets.map((dataset) =>
    datasetToValues(
      dataset,
      axisSetRepository.axisSets.find((a) => a.id === dataset.axisSetId),
      effectiveDigits,
    ),
  )
}
