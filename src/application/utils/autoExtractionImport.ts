import { MarkerStyle, Point, Rect } from '@/@types/types'
import {
  AUTO_EXTRACTION_FORMAT,
  AUTO_EXTRACTION_VERSION,
  AutoExtractionDocumentDTO,
  AutoExtractionMarkerDTO,
  AutoExtractionRectDTO,
  XY,
} from '@/application/dto/autoExtractionDTO'
import { ReviewCalibration } from '@/application/services/reviewSession/reviewSession'
import { ParsedAutoExtraction } from '@/application/utils/autoExtractionParser'
import { ReviewAxesState, ReviewState } from '@/application/utils/editLogDiff'
import { POINT_MODE } from '@/constants'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { Dataset } from '@/domain/models/dataset/dataset'
import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'
import AxisSetCalculator from '@/domain/services/axisSetCalculator'
import { AxisFit, fitAxisTicks } from '@/domain/services/axisTickFitter'

// INFO: The state-building half of the auto-extraction import and the edit
// log (docs/design/auto-extraction-review-design.md). Builds domain objects
// from a parsed document and reads state back out of them, but touches no
// singleton, DOM or network — autoExtractionOperations.ts does that.

// INFO: a calibration whose tick fit is worse than this is suspicious
// enough (wrong OCR'd value, a tick matched to the wrong label…) to warn
export const RESIDUAL_WARNING_PX = 2

export const IMPORTED_AXIS_SET_ID = 1

export type ImportPlan = {
  axisSet: AxisSetInterface
  datasets: DatasetInterface[]
  initialState: ReviewState
  calibration: ReviewCalibration | null
  warnings: string[]
}

export function buildImportPlan(
  parsed: ParsedAutoExtraction,
  imageSize: { width: number; height: number } | null,
): ImportPlan {
  const warnings: string[] = []

  if (imageSize) {
    const { width, height } = parsed.image
    if (
      (width !== null && width !== imageSize.width) ||
      (height !== null && height !== imageSize.height)
    ) {
      warnings.push(
        `image size in the document (${width ?? '?'}x${
          height ?? '?'
        }) differs from the loaded image (${imageSize.width}x${
          imageSize.height
        }); pixel coordinates may be off`,
      )
    }
  }

  const axisSet = createEmptyAxisSet()
  let calibration: ReviewCalibration | null = null
  if (parsed.axes) {
    const xFit = fitAxisTicks(parsed.axes.x.ticks, parsed.axes.x.scale)
    const yFit = fitAxisTicks(parsed.axes.y.ticks, parsed.axes.y.scale)
    applyFitsToAxisSet(axisSet, xFit, yFit)
    calibration = { x: toCalibration(xFit), y: toCalibration(yFit) }
    ;(['x', 'y'] as const).forEach((name) => {
      if (
        calibration &&
        calibration[name].maxAbsResidualPx > RESIDUAL_WARNING_PX
      ) {
        warnings.push(
          `${name} axis ticks fit with a max residual of ${calibration[
            name
          ].maxAbsResidualPx.toFixed(2)}px; check the tick values`,
        )
      }
    })
  }

  axisSet.plotArea = parsed.plotArea
  axisSet.legendArea = parsed.legendArea

  const calculator = new AxisSetCalculator(axisSet, {
    x: axisSet.xIsLogScale,
    y: axisSet.yIsLogScale,
  })
  let outOfImage = 0
  const datasets = parsed.series.map((series, seriesIndex) => {
    const coords: XY[] =
      series.pointsPx ??
      (series.pointsValue as XY[]).map(([xValue, yValue], index) => {
        const coord = calculator.calculatePixelCoordinates(xValue, yValue)
        if (
          !coord ||
          !Number.isFinite(coord.xPx) ||
          !Number.isFinite(coord.yPx)
        ) {
          throw new Error(
            `series[${seriesIndex}].points_value[${index}] cannot be placed on the image with the given axes`,
          )
        }
        return [coord.xPx, coord.yPx]
      })
    const points: Point[] = coords.map(([xPx, yPx], index) => {
      if (
        imageSize &&
        (xPx < 0 || yPx < 0 || xPx > imageSize.width || yPx > imageSize.height)
      ) {
        outOfImage++
      }
      const point: Point = {
        id: index + 1,
        xPx,
        yPx,
        origin: { series: seriesIndex, index },
      }
      if (series.scores) {
        point.score = series.scores[index]
      }
      return point
    })
    const dataset = new Dataset(series.label, points, seriesIndex + 1)
    dataset.axisSetId = axisSet.id
    if (series.marker) {
      dataset.marker = series.marker
    }
    dataset.visiblePointIds = points.map((p) => p.id)
    return dataset
  })
  if (outOfImage > 0) {
    warnings.push(`${outOfImage} point(s) lie outside the image`)
  }

  return {
    axisSet,
    datasets,
    initialState: captureReviewState([axisSet], datasets),
    calibration,
    warnings,
  }
}

function createEmptyAxisSet(): AxisSet {
  const axisSet = new AxisSet(
    new Axis('x1', 0),
    new Axis('x2', 1),
    new Axis('y1', 0),
    new Axis('y2', 1),
    new Axis('x2y2', -1),
    IMPORTED_AXIS_SET_ID,
    'XY Axes 1',
  )
  // INFO: imported reference points are independent, so all 4 are shown
  // and editable on their own, like a loaded project
  axisSet.pointMode = POINT_MODE.FOUR_POINTS
  return axisSet
}

// INFO: Ticks are 1-D (axes parallel to the image edges), so the x1/x2
// markers need a y position and y1/y2 an x position just to be drawn. Put
// them where the two axes' lowest ticks are, i.e. around the plot's corner.
function applyFitsToAxisSet(axisSet: AxisSet, xFit: AxisFit, yFit: AxisFit) {
  const cornerX = xFit.reference.low.px
  const cornerY = yFit.reference.low.px
  axisSet.x1 = new Axis('x1', xFit.reference.low.value, {
    xPx: xFit.reference.low.px,
    yPx: cornerY,
  })
  axisSet.x2 = new Axis('x2', xFit.reference.high.value, {
    xPx: xFit.reference.high.px,
    yPx: cornerY,
  })
  axisSet.y1 = new Axis('y1', yFit.reference.low.value, {
    xPx: cornerX,
    yPx: yFit.reference.low.px,
  })
  axisSet.y2 = new Axis('y2', yFit.reference.high.value, {
    xPx: cornerX,
    yPx: yFit.reference.high.px,
  })
  axisSet.xIsLogScale = xFit.scale === 'log'
  axisSet.yIsLogScale = yFit.scale === 'log'
}

function toCalibration(fit: AxisFit): ReviewCalibration['x'] {
  return {
    scale: fit.scale,
    rmsResidualPx: fit.rmsResidualPx,
    maxAbsResidualPx: fit.maxAbsResidualPx,
    residuals: fit.residuals.map((r) => ({
      value: r.value,
      px: r.px,
      residualPx: r.residualPx,
    })),
  }
}

export function axisSetIsCalibrated(axisSet: AxisSetInterface): boolean {
  const axes = [axisSet.x1, axisSet.x2, axisSet.y1, axisSet.y2]
  return (
    axes.every((axis) => axis.coord.xPx >= 0 && axis.coord.yPx >= 0) &&
    axisSet.x1.value !== axisSet.x2.value &&
    axisSet.y1.value !== axisSet.y2.value
  )
}

// INFO: The axis set the review diffs against: the imported one if it
// still exists, otherwise whatever is first
function reviewedAxisSet(axisSets: AxisSetInterface[]): AxisSetInterface {
  return axisSets.find((a) => a.id === IMPORTED_AXIS_SET_ID) ?? axisSets[0]
}

export function captureReviewState(
  axisSets: AxisSetInterface[],
  datasets: DatasetInterface[],
): ReviewState {
  const axisSet = reviewedAxisSet(axisSets)
  const axisPoint = (name: 'x1' | 'x2' | 'y1' | 'y2') => ({
    xPx: axisSet[name].coord.xPx,
    yPx: axisSet[name].coord.yPx,
    value: axisSet[name].value,
  })
  const axes: ReviewAxesState = {
    calibrated: axisSetIsCalibrated(axisSet),
    x1: axisPoint('x1'),
    x2: axisPoint('x2'),
    y1: axisPoint('y1'),
    y2: axisPoint('y2'),
    xIsLogScale: axisSet.xIsLogScale,
    yIsLogScale: axisSet.yIsLogScale,
  }
  return {
    axes,
    series: datasets.map((dataset) => ({
      label: dataset.name,
      points: dataset.points.map((p) => ({ ...p })),
      scoreRemovedPoints: dataset.scoreRemovedPoints.map((p) => ({ ...p })),
    })),
  }
}

// INFO: The current state in the import format itself, so the edit log's
// `final` can be loaded back in, or used as labels for a detector.
export function buildFinalDocument(
  axisSets: AxisSetInterface[],
  datasets: DatasetInterface[],
  imageSize: { width: number; height: number } | null,
  source: Record<string, unknown> | null,
): AutoExtractionDocumentDTO {
  const findAxisSet = (id: number) =>
    axisSets.find((a) => a.id === id) ?? reviewedAxisSet(axisSets)
  const axisSet = reviewedAxisSet(axisSets)
  const calibrated = axisSetIsCalibrated(axisSet)

  return {
    format: AUTO_EXTRACTION_FORMAT,
    version: AUTO_EXTRACTION_VERSION,
    image: imageSize
      ? { width: imageSize.width, height: imageSize.height }
      : null,
    axes: calibrated
      ? {
          x: {
            scale: axisSet.xIsLogScale ? 'log' : 'linear',
            ticks: [
              { px: axisSet.x1.coord.xPx, value: axisSet.x1.value },
              { px: axisSet.x2.coord.xPx, value: axisSet.x2.value },
            ],
          },
          y: {
            scale: axisSet.yIsLogScale ? 'log' : 'linear',
            ticks: [
              { px: axisSet.y1.coord.yPx, value: axisSet.y1.value },
              { px: axisSet.y2.coord.yPx, value: axisSet.y2.value },
            ],
          },
        }
      : null,
    series: datasets
      .filter((dataset) => dataset.points.length > 0)
      .map((dataset) => {
        const datasetAxisSet = findAxisSet(dataset.axisSetId)
        // INFO: effectiveDigits is raised so the export isn't rounded to
        // the 4 digits the UI shows
        const calculator = new AxisSetCalculator(
          datasetAxisSet,
          { x: datasetAxisSet.xIsLogScale, y: datasetAxisSet.yIsLogScale },
          10,
        )
        const points = dataset.points
        const valuesAvailable = axisSetIsCalibrated(datasetAxisSet)
        return {
          label: dataset.name,
          points_px: points.map((p): XY => [p.xPx, p.yPx]),
          points_value: valuesAvailable
            ? points.map((p): XY => {
                const { xV, yV } = calculator.calculateXYValues(p.xPx, p.yPx)
                return [parseFloat(xV), parseFloat(yV)]
              })
            : null,
          scores: points.every((p) => p.score !== undefined)
            ? points.map((p) => p.score as number)
            : null,
          origins: points.map((p): XY | null =>
            p.origin ? [p.origin.series, p.origin.index] : null,
          ),
          marker: toMarkerDTO(dataset.marker),
        }
      }),
    plot_area: toRectDTO(axisSet.plotArea),
    legend_area: toRectDTO(axisSet.legendArea),
    source: { tool: 'starry-digitizer', based_on: source },
  }
}

function toRectDTO(rect: Rect | null): AutoExtractionRectDTO | null {
  return rect
    ? { x: rect.xPx, y: rect.yPx, width: rect.widthPx, height: rect.heightPx }
    : null
}

// INFO: only the fields that were set; null when nothing is known
function toMarkerDTO(
  marker: MarkerStyle | undefined,
): AutoExtractionMarkerDTO | null {
  if (!marker) return null
  const dto: AutoExtractionMarkerDTO = {}
  if (marker.shape) dto.shape = marker.shape
  if (marker.fill) dto.fill = marker.fill
  if (marker.sizePx) dto.size_px = marker.sizePx
  return Object.keys(dto).length > 0 ? dto : null
}
