import { reactive } from 'vue'
import { AxisSetRepositoryManager } from '@/domain/repositories/axisSetRepository/manager/axisSetRepositoryManager'
import { DatasetRepositoryManager } from '@/domain/repositories/datasetRepository/manager/datasetRepositoryManager'

// INFO: Wrapped with reactive() here at the source so that every consumer —
// whether it reaches this singleton through a Vue component's `data()` or by
// importing it directly in an application-layer class — mutates the same
// reactive proxy and reliably triggers re-renders. See issue #122.
export const datasetRepository = reactive(
  new DatasetRepositoryManager().getInstance(),
)
export const axisSetRepository = reactive(
  new AxisSetRepositoryManager().getInstance(),
)
