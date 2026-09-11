import { Point } from '@/@types/types'

/**
 * DTO (Data Transfer Object) for Dataset
 * Plain data representation for serialization/deserialization
 * This type contains only serializable data properties
 */
export interface DatasetDTO {
  id: number
  name: string
  axisSetId: number
  /** Pixel coordinates on the original (unscaled) image */
  points: Point[]
  visiblePointIds: number[]
  manuallyAddedPointIds: number[]
  /**
   * Opaque identifier owned by the host application (e.g. Starrydata's
   * sampleid). StarryDigitizer stores and round-trips it but never
   * interprets it.
   */
  externalId?: string
}
