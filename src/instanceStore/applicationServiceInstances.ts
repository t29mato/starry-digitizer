import { ExtractorManager } from '@/application/services/extractor/manager/extractorManager'
import { InterpolatorManager } from '@/application/services/interpolator/manager/interpolatorManager'

export const interpolator = new InterpolatorManager().getInstance()
export const extractor = new ExtractorManager().getInstance()
