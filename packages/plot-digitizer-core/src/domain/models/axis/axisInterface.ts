import { Coord } from '../../types'

/**
 * Axis domain model (Entity/Value Object)
 * Represents an axis with its value and coordinate in the domain
 */
export interface AxisInterface {
  name: string
  value: number
  coord: Coord
  initialCoord: Coord

  // Methods (behavior)
  clearCoord(): void

  // Computed properties
  get coordIsFilled(): boolean
}
