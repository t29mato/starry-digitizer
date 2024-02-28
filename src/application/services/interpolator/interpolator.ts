import { Coord, Plot } from '@/domain/models/dataset/datasetInterface'
import { InterpolatorInterface } from './interpolatorInterface'
import { HTMLCanvas } from '@/presentation/dom/HTMLCanvas'
import { getInterpolatedCoordsList } from '../../lib/CurveInterpolatorLib'
import { getLocalStorageDataByKey } from '../../utils/localStorageUtils'
import { getPlotsTotalDistance } from '../../utils/pointsUtils'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'

export class Interpolator implements InterpolatorInterface {
  public isActive: boolean = true
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

  private setInterpolatedCoords(anchorPlots: Plot[]) {
    const manualPlotsTotalDistance = getPlotsTotalDistance(anchorPlots)

    const segments = Math.max(
      Math.floor(
        manualPlotsTotalDistance / (this.interval * Math.sqrt(2)), //INFO: intervalが10の時、点同士の間隔がおよそ16pxになるようにした比例式
      ),
      1,
    )

    const guidelineSegments = Math.max(
      Math.floor(manualPlotsTotalDistance / 4), //INFO: 補助線は常に高精度の曲線にする
      1,
    )

    const [interpCoords, interpForGuidelineCoords] = getInterpolatedCoordsList({
      plots: anchorPlots,
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

  //TODO: canvas操作系は独立したapplicationとして、各serviceのcanvasを一括でそうさできたほうがいいかも
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
    const activeDataset = datasetRepository.activeDataset
    const anchorPlots = activeDataset.plots.filter((plot: Plot) =>
      activeDataset.manuallyAddedPlotIds.includes(plot.id),
    )

    this.clearGuideCanvasContext()
    this.clearMagnifierCanvasContext()

    activeDataset.tempPlots.forEach((tempPlot) => {
      activeDataset.clearTempPlot(tempPlot.id)
    })

    if (anchorPlots.length <= 1) {
      return
    }

    this.setInterpolatedCoords(anchorPlots)

    this.drawInterpolationLineOnGuideCanvas()

    this.interpolatedCoords.forEach((coord: Coord) => {
      activeDataset.addTempPlot(coord.xPx, coord.yPx)
    })
  }

  public clearPreview({
    anchorPointsShouldRemain,
  }: {
    anchorPointsShouldRemain: boolean
  }): void {
    const activeDataset = datasetRepository.activeDataset

    activeDataset.tempPlots.forEach((tempPlot) => {
      activeDataset.clearTempPlot(tempPlot.id)
    })

    if (!anchorPointsShouldRemain) {
      activeDataset.manuallyAddedPlotIds.forEach((pId) =>
        activeDataset.clearPlot(pId),
      )
    }

    this.clearGuideCanvasContext()
    this.clearMagnifierCanvasContext()
    this.clearInterpolatedCoords()
  }
}
