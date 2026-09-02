import { InterpolatorInterface } from './interpolatorInterface'
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
  public guideCanvas?: HTMLCanvas
  public magnifierCanvas?: HTMLCanvas

  private clearInterpolatedCoords(): void {
    this.interpolatedCoords = []
    this.interpolatedCoordsForGuideline = []
  }

  private clearGuideCanvasContext(): void {
    if (!this.guideCanvas) {
      throw new Error('interpolator guide canvas is not set')
    }

    this.guideCanvas.context.clearRect(
      0,
      0,
      this.guideCanvas.element.width,
      this.guideCanvas.element.height,
    )
  }

  private clearMagnifierCanvasContext(): void {
    if (!this.magnifierCanvas) {
      throw new Error('interpolator guide canvas is not set')
    }

    this.magnifierCanvas.context.clearRect(
      0,
      0,
      this.magnifierCanvas.element.width,
      this.magnifierCanvas.element.height,
    )
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

  private drawInterpolationLineOnGuideCanvas() {
    if (!this.guideCanvas) {
      throw new Error('interpolator guide canvas is not set')
    }

    this.clearGuideCanvasContext()

    this.guideCanvas.context.beginPath()

    this.guideCanvas.context.lineWidth = 3
    this.guideCanvas.context.strokeStyle = '#ffd700'
    this.guideCanvas.context.moveTo(
      this.interpolatedCoordsForGuideline[0].xPx * canvasHandler.scale,
      this.interpolatedCoordsForGuideline[0].yPx * canvasHandler.scale,
    )

    for (let i = 1; i < this.interpolatedCoordsForGuideline.length; i++) {
      this.guideCanvas.context.lineTo(
        this.interpolatedCoordsForGuideline[i].xPx * canvasHandler.scale,
        this.interpolatedCoordsForGuideline[i].yPx * canvasHandler.scale,
      )
    }

    this.guideCanvas.context.stroke()

    this.magnifierCanvas?.context.drawImage(
      this.guideCanvas.element,
      0,
      0,
      this.guideCanvas.element.width,
      this.guideCanvas.element.height,
    )
  }

  //TODO: it might be better to make canvas operations an independent application so each service's canvas can be operated on collectively
  public resizeCanvas(): void {
    if (!this.guideCanvas || !this.magnifierCanvas) return

    const newWidth = canvasHandler.originalWidth * canvasHandler.scale
    const newHeight = canvasHandler.originalHeight * canvasHandler.scale

    this.guideCanvas.element.width = newWidth
    this.guideCanvas.element.height = newHeight

    this.magnifierCanvas.element.width = newWidth
    this.magnifierCanvas.element.height = newHeight

    this.magnifierCanvas.context.drawImage(
      this.guideCanvas.element,
      0,
      0,
      newWidth,
      newHeight,
    )

    if (this.interpolatedCoords.length) {
      this.drawInterpolationLineOnGuideCanvas()
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
    this.guideCanvas = guideCanvas
  }

  public setMagnifierCanvas(magnifierCanvas: HTMLCanvas): void {
    this.magnifierCanvas = magnifierCanvas
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

    this.clearGuideCanvasContext()
    this.clearMagnifierCanvasContext()

    activeDataset.tempPoints.forEach((tempPoint) => {
      activeDataset.clearTempPoint(tempPoint.id)
    })

    if (anchorPoints.length <= 1) {
      return
    }

    this.setInterpolatedCoords(anchorPoints)

    this.drawInterpolationLineOnGuideCanvas()

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

    this.clearGuideCanvasContext()
    this.clearMagnifierCanvasContext()
    this.clearInterpolatedCoords()
  }
}
