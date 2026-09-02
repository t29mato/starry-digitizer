import { InterpolatorInterface } from './interpolatorInterface'
import { InterpolatorCanvasInterface } from '@/presentation/dom/InterpolatorCanvasInterface'
import { HTMLCanvas } from '@/presentation/dom/HTMLCanvas'
import { getInterpolatedCoordsList } from '../../lib/CurveInterpolatorLib'
import { getLocalStorageDataByKey } from '../../utils/localStorageUtils'
import { getPointsTotalDistance } from '../../utils/pointsUtils'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { Coord, Point } from '@/@types/types'

export class Interpolator implements InterpolatorInterface {
  public isActive: boolean = false
  public interval: number = 10
  public interpolatedCoords: Coord[] = []
  public interpolatedCoordsForGuideline: Coord[] = []

  // INFO: All canvas-drawing logic lives in InterpolatorCanvas (presentation
  // layer), injected here by constructor injection so this class stays free
  // of DOM/canvas concerns and is easier to unit test. See #111.
  constructor(private interpolatorCanvas: InterpolatorCanvasInterface) {}

  public get guideCanvas(): HTMLCanvas | undefined {
    return this.interpolatorCanvas.guideCanvas
  }

  public get magnifierCanvas(): HTMLCanvas | undefined {
    return this.interpolatorCanvas.magnifierCanvas
  }

  private clearInterpolatedCoords(): void {
    this.interpolatedCoords = []
    this.interpolatedCoordsForGuideline = []
  }

  private setInterpolatedCoords(anchorPoints: Point[]) {
    const manualPointsTotalDistance = getPointsTotalDistance(anchorPoints)

    const segments = Math.max(
      Math.floor(
        manualPointsTotalDistance / (this.interval * Math.sqrt(2)), //INFO: proportional formula so that when interval is 10, the spacing between points is about 16px
      ),
      1,
    )

    const guidelineSegments = Math.max(
      Math.floor(manualPointsTotalDistance / 4), //INFO: the guideline should always be a high-precision curve
      1,
    )

    const [interpCoords, interpForGuidelineCoords] = getInterpolatedCoordsList({
      points: anchorPoints,
      segmentsList: [segments, guidelineSegments],
    })

    this.interpolatedCoords = interpCoords
    this.interpolatedCoordsForGuideline = interpForGuidelineCoords
  }

  public resizeCanvas(): void {
    if (
      !this.interpolatorCanvas.guideCanvas ||
      !this.interpolatorCanvas.magnifierCanvas
    )
      return

    const newWidth = canvasHandler.originalWidth * canvasHandler.scale
    const newHeight = canvasHandler.originalHeight * canvasHandler.scale

    this.interpolatorCanvas.resize(newWidth, newHeight)

    if (this.interpolatedCoords.length) {
      this.interpolatorCanvas.drawInterpolationLineOnGuideCanvas(
        this.interpolatedCoordsForGuideline,
        canvasHandler.scale,
      )
    }
  }

  public initialize(): void {
    const isActive = getLocalStorageDataByKey('isInterpolatorActive')

    if (isActive === 'true') {
      this.isActive = true
    } else if (isActive === 'false') {
      this.isActive = false
    }
  }

  public setIsActive(isActive: boolean): void {
    this.isActive = isActive
  }

  public setGuideCanvas(guideCanvas: HTMLCanvas): void {
    this.interpolatorCanvas.setGuideCanvas(guideCanvas)
  }

  public setMagnifierCanvas(magnifierCanvas: HTMLCanvas): void {
    this.interpolatorCanvas.setMagnifierCanvas(magnifierCanvas)
  }

  public updateInterval(interval: number) {
    this.interval = interval
  }

  public updatePreview(): void {
    if (!this.isActive) {
      throw new Error(
        'interpolator.updatePreview was called but interpolator is not activated',
      )
    }
    const activeDataset = datasetRepository.activeDataset
    const anchorPoints = activeDataset.points.filter((point: Point) =>
      activeDataset.manuallyAddedPointIds.includes(point.id),
    )

    this.interpolatorCanvas.clearGuideCanvasContext()
    this.interpolatorCanvas.clearMagnifierCanvasContext()

    activeDataset.tempPoints.forEach((tempPoint) => {
      activeDataset.clearTempPoint(tempPoint.id)
    })

    if (anchorPoints.length <= 1) {
      return
    }

    this.setInterpolatedCoords(anchorPoints)

    this.interpolatorCanvas.drawInterpolationLineOnGuideCanvas(
      this.interpolatedCoordsForGuideline,
      canvasHandler.scale,
    )

    this.interpolatedCoords.forEach((coord: Coord) => {
      activeDataset.addTempPoint(coord.xPx, coord.yPx)
    })
  }

  public clearPreview(): void {
    const activeDataset = datasetRepository.activeDataset

    activeDataset.tempPoints.forEach((tempPoint) => {
      activeDataset.clearTempPoint(tempPoint.id)
    })

    activeDataset.manuallyAddedPointIds.forEach((pId) =>
      activeDataset.clearPoint(pId),
    )

    this.interpolatorCanvas.clearGuideCanvasContext()
    this.interpolatorCanvas.clearMagnifierCanvasContext()
    this.clearInterpolatedCoords()
  }
}
