import { Coord, Plot } from '@/domains/datasetInterface'
import { InterpolatorInterface } from './interpolatorInterface'
import { HTMLCanvas } from '@/domains/dom/HTMLCanvas'
import { useDatasetsStore } from '@/store/datasets'
import { getInterpolatedCoordsList } from '../lib/CurveInterpolatorLib'
import { getPlotsTotalDistance } from '@/services/getPlotsTotalDistance'
import { useCanvasStore } from '@/store/canvas'
import { getLocalStorageDataByKey } from '../utils/localStorageUtils'

export class Interpolator implements InterpolatorInterface {
  private static instance: InterpolatorInterface

  private constructor() {}

  static getInstance(): InterpolatorInterface {
    if (!this.instance) {
      this.instance = new Interpolator()
    }

    return this.instance
  }

  public isActive: boolean = true
  public interval: number = 10
  public interpolatedCoords: Coord[] = []
  public interpolatedCoordsForGuideline: Coord[] = []
  public guideCanvas?: HTMLCanvas

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
    //TODO: pinia storeとドメインリポジトリを分けて、application serviceがpiniaに依存しないようにする
    const { canvas } = useCanvasStore()
    this.clearGuideCanvasContext()

    this.guideCanvas.context.beginPath()

    this.guideCanvas.context.lineWidth = 3
    this.guideCanvas.context.strokeStyle = '#ffd700'
    this.guideCanvas.context.moveTo(
      this.interpolatedCoordsForGuideline[0].xPx * canvas.scale,
      this.interpolatedCoordsForGuideline[0].yPx * canvas.scale,
    )

    for (let i = 1; i < this.interpolatedCoordsForGuideline.length; i++) {
      this.guideCanvas.context.lineTo(
        this.interpolatedCoordsForGuideline[i].xPx * canvas.scale,
        this.interpolatedCoordsForGuideline[i].yPx * canvas.scale,
      )
    }

    this.guideCanvas.context.stroke()
  }

  //TODO: canvas操作系は独立したapplicationとして、各serviceのcanvasを一括でそうさできたほうがいいかも
  public resizeGuideCanvas(): void {
    if (!this.guideCanvas) return

    const { canvas } = useCanvasStore()

    const newWidth = canvas.originalWidth * canvas.scale
    const newHeight = canvas.originalHeight * canvas.scale

    this.guideCanvas.element.width = newWidth
    this.guideCanvas.element.height = newHeight

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

  public updateInterval(interval: number) {
    this.interval = interval
  }

  public updatePreview(): void {
    //TODO: pinia storeとドメインリポジトリを分けて、application serviceがpiniaに依存しないようにする
    const { datasets } = useDatasetsStore()

    const activeDataset = datasets.activeDataset
    const anchorPlots = activeDataset.plots.filter((plot: Plot) =>
      activeDataset.manuallyAddedPlotIds.includes(plot.id),
    )

    this.clearGuideCanvasContext()

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

  public clearPreview(): void {
    //TODO: pinia storeとドメインリポジトリを分けて、application serviceがpiniaに依存しないようにする
    const { datasets } = useDatasetsStore()

    const activeDataset = datasets.activeDataset

    activeDataset.tempPlots.forEach((tempPlot) => {
      activeDataset.clearTempPlot(tempPlot.id)
    })

    this.clearGuideCanvasContext()
    this.clearInterpolatedCoords()
  }
}
