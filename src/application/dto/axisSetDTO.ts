import { AxisDTO } from './axisDTO'
import { PointMode } from '@/@types/types'

/**
 * DTO (Data Transfer Object) for AxisSet
 * Plain data representation for serialization/deserialization
 * Uses AxisDTO to ensure all nested properties are also serializable
 */
export interface AxisSetDTO {
  id: number
  name: string
  x1: AxisDTO
  x2: AxisDTO
  y1: AxisDTO
  y2: AxisDTO
  xIsLogScale: boolean
  yIsLogScale: boolean
  considerGraphTilt: boolean
  pointMode: PointMode
  isVisible: boolean
}
