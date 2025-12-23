import { Coord } from '@/@types/types'

/**
 * DTO (Data Transfer Object) for Axis
 * Plain data representation for serialization/deserialization
 * This type contains only serializable properties
 */
export interface AxisDTO {
  name: string
  value: number
  coord: Coord
}
