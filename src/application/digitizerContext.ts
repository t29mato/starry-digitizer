import { reactive } from '@vue/reactivity'
import { AxisSetRepositoryManager } from '@/domain/repositories/axisSetRepository/manager/axisSetRepositoryManager'
import { DatasetRepositoryManager } from '@/domain/repositories/datasetRepository/manager/datasetRepositoryManager'
import { CanvasHandlerManager } from '@/application/services/canvasHandler/manager/canvasHandlerManager'
import { ConfirmerManager } from '@/application/services/confirmer/manager/confirmerManager'
import { ExtractorManager } from '@/application/services/extractor/manager/extractorManager'
import { MagnifierManager } from '@/application/services/magnifier/manager/magnifierManager'
import { ValueFormatManager } from '@/application/services/valueFormat/manager/valueFormatManager'
import { InterpolatorManager } from '@/application/services/interpolator/manager/interpolatorManager'
import { ProjectService } from '@/application/services/projectService/projectService'
import { HistoryManager } from '@/application/services/historyManager/historyManager'
import type { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'
import type { DatasetRepositoryInterface } from '@/domain/repositories/datasetRepository/datasetRepositoryInterface'
import type { CanvasHandlerInterface } from '@/application/services/canvasHandler/canvasHandlerInterface'
import type { ConfirmerInterface } from '@/application/services/confirmer/confirmerInterface'
import type { ExtractorInterface } from '@/application/services/extractor/extractorInterface'
import type { MagnifierInterface } from '@/application/services/magnifier/magnifierInterface'
import type { ValueFormatInterface } from '@/application/services/valueFormat/valueFormatInterface'
import type { InterpolatorInterface } from '@/application/services/interpolator/interpolatorInterface'
import type { ProjectServiceInterface } from '@/application/services/projectService/projectServiceInterface'
import type { HistoryManagerInterface } from '@/application/services/historyManager/historyManagerInterface'

// INFO: One complete set of application state (repositories + services) for
// a single <StarryDigitizer> instance. It replaces the former module-level
// singletons in src/instanceStore/* so that mounting a fresh component gets
// fresh state and nothing leaks between mounts. Vue components reach it
// through provide/inject (see presentation/digitizerContextProvider); the
// standalone app keeps one shared instance in src/appContext.ts for its menu
// bar.
//
// INFO: this module is part of the `starry-digitizer/core` entry, so it must
// not import Vue's renderer. `reactive` comes from @vue/reactivity, which the
// `vue` package depends on — a Vue host therefore shares the very same copy
// (verified: `require('vue').reactive === require('@vue/reactivity').reactive`)
// and a non-Vue host can subscribe with the `effect` re-exported from core.
// See docs/design/engine-boundary.md §1.
export interface DigitizerContext {
  axisSetRepository: AxisSetRepositoryInterface
  datasetRepository: DatasetRepositoryInterface
  canvasHandler: CanvasHandlerInterface
  interpolator: InterpolatorInterface
  extractor: ExtractorInterface
  confirmer: ConfirmerInterface
  magnifier: MagnifierInterface
  // INFO: how extracted values are presented (significant digits). Read by
  // the CSV copy, the data table, getDatasetValues() and the magnifier's
  // read-out alike, so it is its own service rather than magnifier state.
  valueFormat: ValueFormatInterface
  projectService: ProjectServiceInterface
  historyManager: HistoryManagerInterface
}

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
  // target, so every consumer observes the same reactive object. Non-Vue
  // hosts observe the same mutations through core's `effect`.
  //
  // NOTE (design debt, see docs/design/framework-dependency-review.md §1.2):
  // this reactive() wrapper is the ONLY change-notification mechanism the
  // engine has. Domain/application classes expose no observer/subscribe API;
  // the UI re-renders because Vue's Proxy observes direct mutations made by
  // components on repositories/services. A non-Vue host would need an
  // explicit notification layer. Until that exists, avoid adding new direct
  // mutations of domain objects from components — go through service methods
  // so a future observer can hook in one place.
  return reactive({
    axisSetRepository,
    datasetRepository,
    canvasHandler,
    interpolator,
    extractor: new ExtractorManager().getNewInstance(),
    confirmer: new ConfirmerManager().getNewInstance(),
    magnifier: new MagnifierManager().getNewInstance(),
    valueFormat: new ValueFormatManager().getNewInstance(),
    projectService: new ProjectService(
      axisSetRepository,
      datasetRepository,
      canvasHandler,
    ),
    historyManager: new HistoryManager(axisSetRepository, datasetRepository),
  }) as DigitizerContext
}
