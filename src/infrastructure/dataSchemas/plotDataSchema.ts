//NOTE: Includes the actual data collected from a figure: axis values, axis scale, data point values and so
//NOTE: Do not include any data which depends on StarryDigitizer app(e.g. setting axis by 2 points or 4 points etc...)

import { Coord, SemanticVersion, XYValue } from '@/@types/types'
//TODO: move definition of type Coord to more global directoly (e.g. @types)

//NOTE: Other interfaces have a prefix 'Interface' but this one doesn't have: It is intentional, mainly because this interface is kind of special one to just define data schema literally
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
    //TODO: create type AxisScale: 'linear' | 'log'
    xScale: 'linear' | 'log'
    yScale: 'linear' | 'log'
  }>
  datasets: Array<{
    id: number
    name: string
    axisSetId: number
    points: Array<{
      value: XYValue
      coord: Coord
    }>
  }>
}
