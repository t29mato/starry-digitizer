import { reactive } from 'vue'
import { CanvasHandlerManager } from '@/application/services/canvasHandler/manager/canvasHandlerManager'
import { ConfirmerManager } from '@/application/services/confirmer/manager/confirmerManager'
import { ExtractorManager } from '@/application/services/extractor/manager/extractorManager'
import { InterpolatorManager } from '@/application/services/interpolator/manager/interpolatorManager'
import { MagnifierManager } from '@/application/services/magnifier/manager/magnifierManager'
import { ProjectService } from '@/application/services/projectService/projectService'
import { HistoryManager } from '@/application/services/historyManager/historyManager'
import { ReviewSession } from '@/application/services/reviewSession/reviewSession'
import { ConfidenceReview } from '@/application/services/confidenceReview/confidenceReview'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

export const interpolator = new InterpolatorManager().getInstance()
export const extractor = new ExtractorManager().getInstance()
export const confirmer = new ConfirmerManager().getInstance()
export const canvasHandler = new CanvasHandlerManager().getInstance()
export const magnifier = new MagnifierManager().getInstance()

// ReviewSession: wrapped in reactive() here (unlike the instances above,
// which become reactive only through a component's data()) because it is
// mostly mutated from outside components — the HistoryManager subscription
// below, URL-param/postMessage imports, the library API — and
// ReviewSessionPanel.vue must still re-render. See docs/design/
// auto-extraction-review-design.md.
export const reviewSession = reactive(new ReviewSession()) as ReviewSession

// ConfidenceReview: reactive for the same reason (the `n` shortcut in
// CanvasMain and the panel both drive it).
export const confidenceReview = reactive(
  new ConfidenceReview(),
) as ConfidenceReview

// ProjectService: Directly instantiated to ensure same canvasHandler instance
export const projectService = new ProjectService(
  axisSetRepository,
  datasetRepository,
  canvasHandler,
  reviewSession,
)

// HistoryManager: Directly instantiated (not via Manager/InstanceManager) so
// it always operates on the same axisSetRepository/datasetRepository
// singletons — same rationale as ProjectService above. See docs/design/
// ux-ideas-implementation-design.md.
export const historyManager = new HistoryManager(
  axisSetRepository,
  datasetRepository,
)
historyManager.subscribe((action) => reviewSession.record(action))
