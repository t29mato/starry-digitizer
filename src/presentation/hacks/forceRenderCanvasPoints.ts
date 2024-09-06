import { DatasetRepositoryInterface } from '@/domain/repositories/datasetRepository/datasetRepositoryInterface'

//🔥HACK!! A workaround for rare cases where canvas points are not redrawn. Do not use unless it is absolutely unavoidable
export const forceRenderCanvasPoints = (
  datasetRepository: DatasetRepositoryInterface,
) => {
  datasetRepository.activeDataset.addPoint(9999, 9999)
  datasetRepository.activeDataset.clearPoint(
    datasetRepository.activeDataset.lastPointId,
  )
}
