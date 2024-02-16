import { DatasetRepositoryInterface } from '@/domain/repositories/datasetRepository/datasetRepositoryInterface'

//🔥HACK!! A workaround for rare cases where canvas plots are not redrawn. Do not use unless it is absolutely unavoidable
export const forceRenderCanvasPlots = (
  datasetRepository: DatasetRepositoryInterface,
) => {
  datasetRepository.activeDataset.addPlot(9999, 9999)
  datasetRepository.activeDataset.clearPlot(
    datasetRepository.activeDataset.lastPlotId,
  )
}
