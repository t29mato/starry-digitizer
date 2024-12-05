import { CanvasHandlerManager } from '@/application/services/canvasHandler/manager/canvasHandlerManager'
import { ConfirmerManager } from '@/application/services/confirmer/manager/confirmerManager'
import { ExtractorManager } from '@/application/services/extractor/manager/extractorManager'
import { InterpolatorManager } from '@/application/services/interpolator/manager/interpolatorManager'
import { MagnifierManager } from '@/application/services/magnifier/manager/magnifierManager'
import { AxisValInputHandlerManager } from '@/application/services/axisValInputHandler/manager/axisValInputHandlerManager'

export const interpolator = new InterpolatorManager().getInstance()
export const extractor = new ExtractorManager().getInstance()
export const confirmer = new ConfirmerManager().getInstance()
export const canvasHandler = new CanvasHandlerManager().getInstance()
export const magnifier = new MagnifierManager().getInstance()
export const axisValInputHandler =
  new AxisValInputHandlerManager().getInstance()
