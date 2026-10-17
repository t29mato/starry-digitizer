import { MarkerStyle, Point } from '@/@types/types'

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
  // INFO: optional, and written only when set, so projects saved before
  // these existed still load and projects that never use them keep their
  // shape. `scoreRemovedPoints` holds the points the confidence review took
  // out below the threshold, so "Restore removed" can bring them back.
  marker?: MarkerStyle
  scoreRemovedPoints?: Point[]
}
