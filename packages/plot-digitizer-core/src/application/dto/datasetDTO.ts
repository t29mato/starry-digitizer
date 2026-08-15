import type { Point } from '../../domain/types'

/**
 * DTO (Data Transfer Object) for Dataset
 * Plain data representation for serialization/deserialization
 * This type contains only serializable data properties
 */
export interface DatasetDTO {
  id: number
  name: string
  axisSetId: number
  points: Point[]
  visiblePointIds: number[]
  manuallyAddedPointIds: number[]
}
