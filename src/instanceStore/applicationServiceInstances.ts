import { CanvasHandlerManager } from '@/presentation/services/canvasHandler/manager/canvasHandlerManager'
import { ConfirmerManager } from '@/application/services/confirmer/manager/confirmerManager'
import { ExtractorManager } from '@/application/services/extractor/manager/extractorManager'
import { InterpolatorManager } from '@/presentation/services/interpolator/manager/interpolatorManager'
import { MagnifierManager } from '@/application/services/magnifier/manager/magnifierManager'
import { ProjectService } from '@/application/services/projectService/projectService'
import { BrowserPixelSourceAdapter } from '@/presentation/adapters/browserPixelSourceAdapter'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

export const interpolator = new InterpolatorManager().getInstance()
export const extractor = new ExtractorManager().getInstance()
export const confirmer = new ConfirmerManager().getInstance()
export const canvasHandler = new CanvasHandlerManager().getInstance()
export const magnifier = new MagnifierManager().getInstance()

// BrowserPixelSourceAdapter: implements plot-digitizer-core's PixelSourcePort
// on top of the canvasHandler singleton (see docs/design/
// plot-digitizer-architecture.md Phase 2). Directly instantiated (not a
// Manager) to ensure it always reads from the same canvasHandler instance.
export const browserPixelSourceAdapter = new BrowserPixelSourceAdapter(
  canvasHandler,
)

// ProjectService: Directly instantiated to ensure same canvasHandler instance
export const projectService = new ProjectService(
  axisSetRepository,
  datasetRepository,
  canvasHandler,
)
