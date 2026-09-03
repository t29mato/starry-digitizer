import { InterpolatorInterface } from './interpolatorInterface'
import { InterpolatorCanvasInterface } from './interpolatorCanvasInterface'
import { HTMLCanvas } from '@/presentation/dom/HTMLCanvas'
import { getInterpolatedCoordsList } from '../../lib/CurveInterpolatorLib'
import { getLocalStorageDataByKey } from '../../utils/localStorageUtils'
import { getPointsTotalDistance } from '../../utils/pointsUtils'
import { Coord, Point } from '@/@types/types'
import { DatasetRepositoryInterface } from '@/domain/repositories/datasetRepository/datasetRepositoryInterface'
import { CanvasHandlerInterface } from '@/application/services/canvasHandler/canvasHandlerInterface'

export class Interpolator implements InterpolatorInterface {
  public isActive: boolean = false
  public interval: number = 10
  public interpolatedCoords: Coord[] = []
  public interpolatedCoordsForGuideline: Coord[] = []
  private canvas: InterpolatorCanvasInterface
  private datasetRepository: DatasetRepositoryInterface
  private canvasHandler: CanvasHandlerInterface

  // INFO: repositories/services are injected (instead of imported as module
  // singletons) so that each DigitizerContext owns its own Interpolator.
  constructor(
    canvas: InterpolatorCanvasInterface,
    datasetRepository: DatasetRepositoryInterface,
    canvasHandler: CanvasHandlerInterface,
  ) {
    this.canvas = canvas
    this.datasetRepository = datasetRepository
    this.canvasHandler = canvasHandler
  }

  private clearInterpolatedCoords(): void {
    this.interpolatedCoords = []
    this.interpolatedCoordsForGuideline = []
  }

  private setInterpolatedCoords(anchorPoints: Point[]) {
    const manualPointsTotalDistance = getPointsTotalDistance(anchorPoints)

    const segments = Math.max(
      Math.floor(
        manualPointsTotalDistance / (this.interval * Math.sqrt(2)), //INFO: intervalが10の時、点同士の間隔がおよそ16pxになるようにした比例式
      ),
      1,
    )

    const guidelineSegments = Math.max(
      Math.floor(manualPointsTotalDistance / 4), //INFO: 補助線は常に高精度の曲線にする
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
    if (!this.canvas.hasCanvas()) return

    const newWidth = this.canvasHandler.originalWidth * this.canvasHandler.scale
    const newHeight =
      this.canvasHandler.originalHeight * this.canvasHandler.scale

    this.canvas.resize(newWidth, newHeight)

    if (this.interpolatedCoords.length) {
      this.canvas.drawInterpolationLine(
        this.interpolatedCoordsForGuideline,
        this.canvasHandler.scale,
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
    this.canvas.setGuideCanvas(guideCanvas)
  }

  public setMagnifierCanvas(magnifierCanvas: HTMLCanvas): void {
    this.canvas.setMagnifierCanvas(magnifierCanvas)
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
    const activeDataset = this.datasetRepository.activeDataset
    const anchorPoints = activeDataset.points.filter((point: Point) =>
      activeDataset.manuallyAddedPointIds.includes(point.id),
    )

    this.canvas.clearGuideCanvasContext()
    this.canvas.clearMagnifierCanvasContext()

    activeDataset.tempPoints.forEach((tempPoint) => {
      activeDataset.clearTempPoint(tempPoint.id)
    })

    if (anchorPoints.length <= 1) {
      return
    }

    this.setInterpolatedCoords(anchorPoints)

    this.canvas.drawInterpolationLine(
      this.interpolatedCoordsForGuideline,
      this.canvasHandler.scale,
    )

    this.interpolatedCoords.forEach((coord: Coord) => {
      activeDataset.addTempPoint(coord.xPx, coord.yPx)
    })
  }

  public clearPreview(): void {
    const activeDataset = this.datasetRepository.activeDataset

    activeDataset.tempPoints.forEach((tempPoint) => {
      activeDataset.clearTempPoint(tempPoint.id)
    })

    activeDataset.manuallyAddedPointIds.forEach((pId) =>
      activeDataset.clearPoint(pId),
    )

    this.canvas.clearGuideCanvasContext()
    this.canvas.clearMagnifierCanvasContext()
    this.clearInterpolatedCoords()
  }
}
