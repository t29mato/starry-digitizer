import { AxisName, AxisValFormat, AxisValState } from '@/@types/types'

export interface XYAxisValHandlerInterface {
  axisValStates: Array<AxisValState>

  getAxisValState(axisSetId: number): AxisValState

  setAxisValState({
    axisSetId,
    axisName,
    displayedValue,
    format,
  }: {
    axisSetId: number
    axisName: AxisName
    displayedValue: string
    format: AxisValFormat
  }): void
}
