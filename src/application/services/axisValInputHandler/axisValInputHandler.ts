import { AxisKey, AxisValuesInput } from '@/@types/types'
import { AxisValInputHandlerInterface } from './AxisValInputHandlerInterface'
import { MathUtils } from '@/application/utils/MathUtils'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'

export class AxisValInputHandler implements AxisValInputHandlerInterface {
  axisSetRepository: AxisSetRepositoryInterface
  inputValues: Map<number, AxisValuesInput> = new Map()

  constructor(axisSetRepository: AxisSetRepositoryInterface) {
    this.axisSetRepository = axisSetRepository
  }

  convertAxisValueToDecimal(inputVal: string): number {
    if (MathUtils.isScientificNotation(inputVal)) {
      return 1
    }

    if (MathUtils.isPowerNotation(inputVal)) {
      return 1
    }

    if (MathUtils.isConvertibleToDecimal(inputVal)) {
      return 1
    }

    throw new Error('Axis value is in the invalid format')
  }

  setInputValue(axisSetId: number, axisKey: AxisKey, inpuVal: string): void {
    this.inputValues.set(axisSetId, {
      ...(this.inputValues.get(axisSetId) || {
        x1: '',
        x2: '',
        y1: '',
        y2: '',
      }),
      [axisKey]: inpuVal,
    })
  }

  setConvertedAxisValToActiveAxisSet(axisKey: AxisKey): void {
    const activeAxisSet = this.axisSetRepository.activeAxisSet
    const inputAxisVal = this.inputValues.get(activeAxisSet.id)?.[axisKey]

    if (!inputAxisVal) {
      throw new Error('Unexpected error: input axis val has not been found')
    }

    const convertedAxisValue = this.convertAxisValueToDecimal(inputAxisVal)
    activeAxisSet[axisKey].value = convertedAxisValue
  }
}
