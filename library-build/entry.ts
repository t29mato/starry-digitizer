import StarryDigitizer from '../src/presentation/components/StarryDigitizer.vue'

export { StarryDigitizer }

// INFO: Auto-extraction review API (docs/design/
// auto-extraction-review-design.md). Call after <StarryDigitizer> is
// mounted; it operates on the same state the component shows.
export {
  loadAutoExtraction,
  buildEditLog,
  downloadEditLog,
  buildDataDocument,
  downloadDataJson,
  installAutoExtractionMessageBridge,
  MESSAGE_TYPE,
} from '../src/application/utils/autoExtractionOperations'
export type {
  AutoExtractionLoadOptions,
  AutoExtractionLoadResult,
} from '../src/application/utils/autoExtractionOperations'
export {
  parseAutoExtraction,
  AutoExtractionFormatError,
} from '../src/application/utils/autoExtractionParser'
export type { AutoExtractionDocumentDTO as AutoExtractionDocument } from '../src/application/dto/autoExtractionDTO'
export type { EditLog } from '../src/application/services/reviewSession/reviewSession'
