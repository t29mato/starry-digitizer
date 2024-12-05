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

  test('convertAxisValueToDecimal should correctly convert power notation values', () => {
    const decimalValue = handler.convertAxisValueToDecimal('10^3')
    expect(decimalValue).toBe(1000)
  })

  test('convertAxisValueToDecimal should correctly convert scientific notation values', () => {
    const decimalValue = handler.convertAxisValueToDecimal('1e+3')
    expect(decimalValue).toBe(1000)
  })

  test('convertAxisValueToDecimal should correctly convert decimal values', () => {
    const decimalValue = handler.convertAxisValueToDecimal('0.1')
    expect(decimalValue).toBe(0.1)
  })

  test('convertAxisValueToDecimal should correctly return NaN for invalid vlaue', () => {
    const decimalValue = handler.convertAxisValueToDecimal('abc')
    expect(decimalValue).toBe(NaN)
  })

  test('canInputValueMultipliedAndDividedByTen correctly returns true when the input value can multiplied by ten', () => {
    const decimalValue = '100'
    const canInputValueMultipliedAndDividedByTen = handler.canInputValueMultipliedAndDividedByTen(decimalValue)
    expect(canInputValueMultipliedAndDividedByTen).toBe(true)
  })

  test('canInputValueMultipliedAndDividedByTen correctly returns true when the input value can multiplied by ten', () => {
    const scientificNotationValue = '1e+3'
    const canInputValueMultipliedAndDividedByTen = handler.canInputValueMultipliedAndDividedByTen(scientificNotationValue)
    expect(canInputValueMultipliedAndDividedByTen).toBe(true)
  })

  test('canInputValueMultipliedAndDividedByTen correctly returns false when the input value can multiplied by ten', () => {
    const powerNotationValue = '10^3'
    const canInputValueMultipliedAndDividedByTen = handler.canInputValueMultipliedAndDividedByTen(powerNotationValue)
    expect(canInputValueMultipliedAndDividedByTen).toBe(false)
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
