import { Plot } from '@/domains/datasetInterface'
import { useCanvasStore } from '@/store/canvas'
import { useDatasetsStore } from '@/store/datasets'
import { useInterpolatorStore } from '@/store/interpolator'

const updateInterpolationPreview = () => {
  const { datasets } = useDatasetsStore()
  const { canvas } = useCanvasStore()
  const { interpolator } = useInterpolatorStore()

  const anchorPlots = datasets.activeDataset.plots.filter((plot: Plot) =>
    //TODO: 本来はinterpolatorに属するanchor coordsのようなものを使うべきだが、暫定仕様としてplotのロジックを流用
    datasets.activeDataset.manuallyAddedPlotIds.includes(plot.id),
  )

  canvas.clearInterpolationGuideCanvas()

  if (anchorPlots.length <= 1) {
    return
  }

  interpolator.setSplineInterpolatedCoords(anchorPlots)

  canvas.drawInterpolationGuideLine(interpolator.interpolatedCoords)
}

export { updateInterpolationPreview }
