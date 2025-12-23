import { ManualMode } from '@/@types/types'

/**
 * DTO (Data Transfer Object) for CanvasHandler
 * Plain data representation for serialization/deserialization
 * This type contains only data properties needed for project persistence
 */
export interface CanvasHandlerDTO {
  scale: number
  manualMode: ManualMode
}
