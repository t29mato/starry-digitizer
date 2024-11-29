import { AxisKey, AxisValuesInput } from '@/@types/types'
import { AxisValInputHandlerInterface } from './axisValInputHandlerInterface'
import { MathUtils } from '@/application/utils/MathUtils'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'

export class AxisValInputHandler implements AxisValInputHandlerInterface {
  axisSetRepository: AxisSetRepositoryInterface
  inputValues: Map<number, AxisValuesInput> = new Map()

  constructor(axisSetRepository: AxisSetRepositoryInterface) {
    this.axisSetRepository = axisSetRepository
  }

  getAxisSetInputValues(axisSetId: number): AxisValuesInput {
    return (
      this.inputValues.get(axisSetId) || {
        x1: '0',
        x2: '0',
        y1: '0',
        y2: '0',
      }
    )
  }

  convertAxisValueToDecimal(inputVal: string): number {
    if (MathUtils.isScientificNotation(inputVal)) {
      return MathUtils.convertPowerNotationToDecimal(inputVal)
    }

    if (MathUtils.isPowerNotation(inputVal)) {
      return MathUtils.convertScientificNotationToDecimal(inputVal)
    }

    if (MathUtils.isConvertibleToDecimal(inputVal)) {
      return parseFloat(inputVal)
    }

    throw new Error('Axis value is in the invalid format')
  }

  setInputValue(axisSetId: number, axisKey: AxisKey, inpuVal: string): void {
    this.inputValues.set(axisSetId, {
      ...(this.inputValues.get(axisSetId) || {
        x1: '0',
        x2: '0',
        y1: '0',
        y2: '0',
      }),
      [axisKey]: inpuVal,
    })
  }

  setConvertedAxisValToActiveAxisSet(axisKey: AxisKey): void {
    const inputAxisVal = this.activeAxisSetInputValues[axisKey]

    if (!inputAxisVal) {
      throw new Error('Unexpected error: input axis val has not been found')
    }

    const convertedAxisValue = this.convertAxisValueToDecimal(inputAxisVal)
    this.axisSetRepository.activeAxisSet[axisKey].value = convertedAxisValue
  }
}
