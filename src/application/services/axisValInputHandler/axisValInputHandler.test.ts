import { AxisValInputHandler } from './axisValInputHandler'
import { AxisSetRepositoryInterface } from '../../../domain/repositories/axisSetRepository/axisSetRepositoryInterface'
import { MathUtils } from '../../../application/utils/MathUtils'
import { AxisSetRepositoryManager } from "../../../domain/repositories/axisSetRepository/manager/axisSetRepositoryManager"

// モックデータと依存の設定
const mockAxisSetRepository: AxisSetRepositoryInterface = new AxisSetRepositoryManager().getNewInstance()

describe('AxisValInputHandler', () => {
  let handler: AxisValInputHandler

  beforeEach(() => {
    handler = new AxisValInputHandler(mockAxisSetRepository)
  })

  test('getAxisSetInputValues should return default values if not set', () => {
    const inputValues = handler.getAxisSetInputValues(1)
    expect(inputValues).toEqual({ x1: '0', x2: '0', y1: '0', y2: '0' })
  })

  test('setInputValue should correctly set values', () => {
    handler.setInputValue(1, 'x1', '10')
    const inputValues = handler.getAxisSetInputValues(1)
    expect(inputValues.x1).toBe('10')
  })

  test('convertAxisValueToDecimal should correctly convert values', () => {
    jest.spyOn(MathUtils, 'isPowerNotation').mockReturnValueOnce(true)
    jest.spyOn(MathUtils, 'convertPowerNotationToDecimal').mockReturnValueOnce(1000)

    const decimalValue = handler.convertAxisValueToDecimal('1k')
    expect(decimalValue).toBe(1000)
  })

  test('handleMultiplyAxisValue should multiply values by 10', () => {
    handler.setInputValue(1, 'x1', '2')
    handler.handleMultiplyAxisValue(1, 'x1')
    const inputValues = handler.getAxisSetInputValues(1)
    expect(inputValues.x1).toBe('20')
  })

  test('handleDivideAxisValue should divide values by 10', () => {
    handler.setInputValue(1, 'x1', '20')
    handler.handleDivideAxisValue(1, 'x1')
    const inputValues = handler.getAxisSetInputValues(1)
    expect(inputValues.x1).toBe('2')
  })

  test('getValidationMessage should return appropriate messages', () => {
    handler.setInputValue(1, 'x1', 'invalid')
    handler.setInputValue(1, 'x2', '0')
    const message = handler.getValidationMessage(1)
    expect(message).toContain('x1 value is invalid')
  })
})
