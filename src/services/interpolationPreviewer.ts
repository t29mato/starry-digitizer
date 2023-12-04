//TODO テストの追加

import { Coord, DatasetInterface, Plot } from '@/domains/datasetInterface'
import { useCanvasStore } from '@/store/canvas'
import { useDatasetsStore } from '@/store/datasets'
import { useInterpolatorStore } from '@/store/interpolator'
import { useConfirmerStore } from '@/store/confirmer'
import { CanvasInterface } from '@/domains/canvasInterface'

const handleOnCancelInterpolation = (
  canvas: CanvasInterface,
  activeDataset: DatasetInterface,
) => {
  canvas.clearInterpolationGuideCanvas()

  activeDataset.manuallyAddedPlotIds.forEach((plotId: number) => {
    activeDataset.addVisiblePlotId(plotId)
  })
  activeDataset.tempPlots.forEach((tempPlot: Plot) => {
    activeDataset.clearTempPlot(tempPlot.id)
  })
}

const handleOnConfirmInterpolation = (activeDataset: DatasetInterface) => {
  activeDataset.manuallyAddedPlotIds.forEach((plotId: number) => {
    activeDataset.clearPlot(plotId)
  })
  activeDataset.tempPlots.forEach((tempPlot: Plot) => {
    activeDataset.moveTempPlotToPlot(tempPlot.id)
  })
}

const previewInterpolation = () => {
  const { canvas } = useCanvasStore()
  const { datasets } = useDatasetsStore()
  const { interpolator } = useInterpolatorStore()
  const { confirmer } = useConfirmerStore()

  const activeDataset = datasets.activeDataset

  activeDataset.manuallyAddedPlotIds.forEach((plotId) => {
    activeDataset.removeVisiblePlotId(plotId)
  })

  interpolator.interpolatedCoords.forEach((coord: Coord) => {
    activeDataset.addTempPlot(coord.xPx, coord.yPx)
  })

  //INFO 点群の描画を待ってから表示する
  setTimeout(() => {
    confirmer.activate({
      message: 'Do you want to apply these points?',
      onCancel: () => {
        handleOnCancelInterpolation(canvas, activeDataset)
      },
      onConfirm: () => {
        handleOnConfirmInterpolation(activeDataset)
      },
    })
  }, 200)
}

export { previewInterpolation }
