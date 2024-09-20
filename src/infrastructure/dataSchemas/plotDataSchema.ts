//NOTE: Includes the actual data collected from a figure: axis values, axis scale, data point values and so
//NOTE: Do not include any data which depends on StarryDigitizer app(e.g. setting axis by 2 points or 4 points etc...)

import { SemanticVersion } from '@/@types/types'
//TODO: move definition of type Coord to more global directoly (e.g. @types)
import { Coord } from '@/domain/models/dataset/datasetInterface'

export interface PlotDataSchema {
  schemaVersion: SemanticVersion
  axisSets: Array<{
    id: number
    name: string
    x1: {
      value: number
      coord: Coord
    }
    x2: {
      value: number
      coord: Coord
    }
    y1: {
      value: number
      coord: Coord
    }
    y2: {
      value: number
      coord: Coord
    }
    xScale: 'linear' | 'log' //TODO: create type AxisScale: 'linear' | 'log'
    yScale: 'linear' | 'log'
  }>
  datasets: Array<{
    id: number
    name: string
    axisSetId: number
    points: Array<{
      value: number
      coord: Coord
    }>
  }>
}