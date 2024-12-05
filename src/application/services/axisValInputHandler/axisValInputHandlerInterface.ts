import { AxisKey, AxisValFormat, AxisValuesInput } from '@/@types/types'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'

export interface AxisValInputHandlerInterface {
  axisSetRepository: AxisSetRepositoryInterface
  inputValues: Record<number, AxisValuesInput>

  getAxisSetInputValues(axisSetId: number): AxisValuesInput
  getInputValueFormat(inputVal: string): AxisValFormat

  convertAxisValueToDecimal(inputVal: string): number
  setInputValue(axisSetId: number, axisKey: AxisKey, inpuVal: string): void
  setConvertedAxisValToAxisSet(axisSetId: number, axisKey: AxisKey): void
  canInputValueMultipliedAndDividedByTen(inputVal: string): boolean
  handleMultiplyAxisValue(axisSetId: number, axisKey: AxisKey): void
  handleDivideAxisValue(axisSetId: number, axisKey: AxisKey): void
  getValidationMessage(axisSetId: number): string
}
