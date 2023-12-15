import { Coord, Plot } from '@/domains/datasetInterface'
import { useCanvasStore } from '@/store/canvas'
import { useDatasetsStore } from '@/store/datasets'
import { useInterpolatorStore } from '@/store/interpolator'

const updateInterpolationPreview = () => {
  const { datasets } = useDatasetsStore()
  const { canvas } = useCanvasStore()
  const { interpolator } = useInterpolatorStore()

  const activeDataset = datasets.activeDataset

  const anchorPlots = activeDataset.plots.filter((plot: Plot) =>
    //TODO: 本来はinterpolatorに属するanchor coordsのようなものを使うべきだが、暫定仕様としてplotのロジックを流用
    activeDataset.manuallyAddedPlotIds.includes(plot.id),
  )

  canvas.clearInterpolationGuideCanvas()
  activeDataset.tempPlots.forEach((tempPlot) => {
    activeDataset.clearTempPlot(tempPlot.id)
  })

  if (anchorPlots.length <= 1) {
    return
  }

  interpolator.setSplineInterpolatedCoords(anchorPlots)

  canvas.drawInterpolationGuideLine(interpolator.interpolatedCoordsForGuideline)

  interpolator.interpolatedCoords.forEach((coord: Coord) => {
    activeDataset.addTempPlot(coord.xPx, coord.yPx)
  })
}

const clearInterpolationPreview = () => {
  const { datasets } = useDatasetsStore()
  const { canvas } = useCanvasStore()
  const { interpolator } = useInterpolatorStore()

  const activeDataset = datasets.activeDataset

  activeDataset.tempPlots.forEach((tempPlot) => {
    activeDataset.clearTempPlot(tempPlot.id)
  })

  canvas.clearInterpolationGuideCanvas()

  interpolator.cleatInterpolatedCoords()
}

export { updateInterpolationPreview, clearInterpolationPreview }
