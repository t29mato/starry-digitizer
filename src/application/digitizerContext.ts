import { inject, provide, reactive } from 'vue'
import type { InjectionKey } from 'vue'
import { AxisSetRepositoryManager } from '@/domain/repositories/axisSetRepository/manager/axisSetRepositoryManager'
import { DatasetRepositoryManager } from '@/domain/repositories/datasetRepository/manager/datasetRepositoryManager'
import { CanvasHandlerManager } from '@/application/services/canvasHandler/manager/canvasHandlerManager'
import { ConfirmerManager } from '@/application/services/confirmer/manager/confirmerManager'
import { ExtractorManager } from '@/application/services/extractor/manager/extractorManager'
import { MagnifierManager } from '@/application/services/magnifier/manager/magnifierManager'
import { InterpolatorManager } from '@/application/services/interpolator/manager/interpolatorManager'
import { ProjectService } from '@/application/services/projectService/projectService'
import { HistoryManager } from '@/application/services/historyManager/historyManager'
import type { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'
import type { DatasetRepositoryInterface } from '@/domain/repositories/datasetRepository/datasetRepositoryInterface'
import type { CanvasHandlerInterface } from '@/application/services/canvasHandler/canvasHandlerInterface'
import type { ConfirmerInterface } from '@/application/services/confirmer/confirmerInterface'
import type { ExtractorInterface } from '@/application/services/extractor/extractorInterface'
import type { MagnifierInterface } from '@/application/services/magnifier/magnifierInterface'
import type { InterpolatorInterface } from '@/application/services/interpolator/interpolatorInterface'
import type { ProjectServiceInterface } from '@/application/services/projectService/projectServiceInterface'
import type { HistoryManagerInterface } from '@/application/services/historyManager/historyManagerInterface'

// INFO: One complete set of application state (repositories + services) for
// a single <StarryDigitizer> instance. It replaces the former module-level
// singletons in src/instanceStore/* so that mounting a fresh component gets
// fresh state and nothing leaks between mounts. Components reach it through
// provide/inject (see useDigitizerContext); the standalone app keeps one
// shared instance in src/appContext.ts for its menu bar.
export interface DigitizerContext {
  axisSetRepository: AxisSetRepositoryInterface
  datasetRepository: DatasetRepositoryInterface
  canvasHandler: CanvasHandlerInterface
  interpolator: InterpolatorInterface
  extractor: ExtractorInterface
  confirmer: ConfirmerInterface
  magnifier: MagnifierInterface
  projectService: ProjectServiceInterface
  historyManager: HistoryManagerInterface
}

export const DIGITIZER_CONTEXT_KEY: InjectionKey<DigitizerContext> = Symbol(
  'starry-digitizer-context',
)

export function createDigitizerContext(): DigitizerContext {
  const axisSetRepository = new AxisSetRepositoryManager().getNewInstance()
  const datasetRepository = new DatasetRepositoryManager().getNewInstance()
  const canvasHandler = new CanvasHandlerManager().getNewInstance()
  const interpolator = new InterpolatorManager(
    datasetRepository,
    canvasHandler,
  ).getNewInstance()
  interpolator.initialize()

  // INFO: reactive() so that Options API components can expose the members
  // from setup() and keep the same reactivity they had when the singletons
  // were returned from data(). reactive() returns the same proxy for the same
  // target, so every consumer observes the same reactive object.
  return reactive({
    axisSetRepository,
    datasetRepository,
    canvasHandler,
    interpolator,
    extractor: new ExtractorManager().getNewInstance(),
    confirmer: new ConfirmerManager().getNewInstance(),
    magnifier: new MagnifierManager().getNewInstance(),
    projectService: new ProjectService(
      axisSetRepository,
      datasetRepository,
      canvasHandler,
    ),
    historyManager: new HistoryManager(axisSetRepository, datasetRepository),
  }) as DigitizerContext
}

export function provideDigitizerContext(context: DigitizerContext): void {
  provide(DIGITIZER_CONTEXT_KEY, context)
}

export function useDigitizerContext(): DigitizerContext {
  const context = inject(DIGITIZER_CONTEXT_KEY)
  if (!context) {
    throw new Error(
      'DigitizerContext is not provided. Components must be rendered inside <StarryDigitizer>.',
    )
  }
  return context
}
