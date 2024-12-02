import { AxisKey, AxisValFormat, AxisValuesInput } from '@/@types/types'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'

export interface AxisValInputHandlerInterface {
  axisSetRepository: AxisSetRepositoryInterface
  inputValues: Map<number, AxisValuesInput>

  getAxisSetInputValues(axisSetId: number): AxisValuesInput
  getInputValueFormat(inputVal: string): AxisValFormat

  convertAxisValueToDecimal(inputVal: string): number
  setInputValue(axisSetId: number, axisKey: AxisKey, inpuVal: string): void
  setConvertedAxisValToAxisSet(axisSetId: number, axisKey: AxisKey): void

  validateInputValues(axisSetId: number): void
  getValidationStatus(axisSetId: number): {
    isInvalidInputFormat: {
      x1: boolean
      x2: boolean
      y1: boolean
      y2: boolean
    }
    isXLogScaleAndSameValue: boolean
    isXLogScaleAndZero: boolean
    isYLogScaleAndSameValue: boolean
    isYLogScaleAndZero: boolean
  }
}
