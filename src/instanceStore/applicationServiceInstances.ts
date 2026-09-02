import { reactive } from 'vue'
import { CanvasHandlerManager } from '@/application/services/canvasHandler/manager/canvasHandlerManager'
import { ConfirmerManager } from '@/application/services/confirmer/manager/confirmerManager'
import { ExtractorManager } from '@/application/services/extractor/manager/extractorManager'
import { InterpolatorManager } from '@/application/services/interpolator/manager/interpolatorManager'
import { MagnifierManager } from '@/application/services/magnifier/manager/magnifierManager'
import { ProjectService } from '@/application/services/projectService/projectService'
import { HistoryManager } from '@/application/services/historyManager/historyManager'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

// INFO: Wrapped with reactive() here at the source — see the same note in
// repositoryInatances.ts and issue #122. Keeps application-layer code (which
// imports these singletons directly) and Vue components (which reach them
// via `data()`) on the same reactive proxy.
export const interpolator = reactive(new InterpolatorManager().getInstance())
export const extractor = reactive(new ExtractorManager().getInstance())
export const confirmer = reactive(new ConfirmerManager().getInstance())
export const canvasHandler = reactive(new CanvasHandlerManager().getInstance())
export const magnifier = reactive(new MagnifierManager().getInstance())

// ProjectService: Directly instantiated to ensure same canvasHandler instance
export const projectService = new ProjectService(
  axisSetRepository,
  datasetRepository,
  canvasHandler,
)

// HistoryManager: Directly instantiated (not via Manager/InstanceManager) so
// it always operates on the same axisSetRepository/datasetRepository
// singletons — same rationale as ProjectService above. See docs/design/
// ux-ideas-implementation-design.md.
export const historyManager = new HistoryManager(
  axisSetRepository,
  datasetRepository,
)
