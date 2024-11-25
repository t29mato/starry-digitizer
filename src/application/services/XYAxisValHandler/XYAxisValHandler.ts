import { AxisName, AxisValFormat, AxisValState } from '@/@types/types'
import { XYAxisValHandlerInterface } from './XYAxisValHandlerInterface'
import { MathUtils } from '@/application/utils/MathUtils'

export class XYAxisValHandler implements XYAxisValHandlerInterface {
  axisValStates: Array<AxisValState> = []

  getAxisValState(axisSetId: number): AxisValState {
    const targetState = this.axisValStates.find((axisValState) => {
      return axisValState.axisSetId === axisSetId
    })

    if (!targetState) {
      throw new Error(
        `Axis value state data does not exist for the following axisSetId: ${axisSetId}`,
      )
    }
    return targetState
  }

  private getAxisValFormat(displayedValue: string): AxisValFormat {
    if (MathUtils.isScientificNotation(displayedValue)) {
      return 'scientificNotation'
    }

    if (MathUtils.isPowerNotation(displayedValue)) {
      return 'powerNotation'
    }

    if (MathUtils.isConvertibleToDecimal(displayedValue)) {
      return 'decimal'
    }

    return 'invalidFormat'
  }

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
  }): void {
    const targetState = this.getAxisValState(axisSetId)

    if (!targetState) {
      throw new Error(
        `Axis value state data does not exist for the following axisSetId: ${axisSetId}`,
      )
    }

    targetState.displayedVal[axisName] = displayedValue
    targetState.displayedFormat[axisName] = format
  }

  //NOTE: Role of view model(Avoiding writing logic in Vue file). Might be better to have this logic on the other class, but temporary
  handleOnChangeDisplayedValue({
    axisSetId,
    axisName,
    displayedValue,
  }: {
    axisSetId: number
    axisName: AxisName
    displayedValue: string
  }) {
    const format = this.getAxisValFormat(displayedValue)

    if (format === 'invalidFormat') {
      throw new Error(`Axis value is invalid format`)
    }

    this.setAxisValState({
      axisSetId,
      axisName,
      displayedValue,
      format,
    })
  }
}
