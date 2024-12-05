import {
  AxisKey,
  AxisValFormat,
  AxisValuesInput,
  AxisValuesInputValidationStatus,
} from '@/@types/types'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'

export interface AxisValInputHandlerInterface {
  axisSetRepository: AxisSetRepositoryInterface
  inputValues: Record<number, AxisValuesInput>

  getAxisSetInputValues(axisSetId: number): AxisValuesInput
  getInputValueFormat(inputVal: string): AxisValFormat

  convertAxisValueToDecimal(inputVal: string): number
  setInputValue(axisSetId: number, axisKey: AxisKey, inpuVal: string): void
  setConvertedAxisValToAxisSet(axisSetId: number, axisKey: AxisKey): void

  validateInputValues(axisSetId: number): void
  getValidationStatus(axisSetId: number): AxisValuesInputValidationStatus

  canInputValueMultipliedAndDividedByTen(inputVal: string): boolean
  getInputValueMultipliedByTen(axisSetId: number, axisKey: AxisKey): string
  getInputValueDividedByTen(axisSetId: number, axisKey: AxisKey): string
  handleMultiplyAxisValue(axisSetId: number, axisKey: AxisKey): void
  handleDivideAxisValue(axisSetId: number, axisKey: AxisKey): void
}
