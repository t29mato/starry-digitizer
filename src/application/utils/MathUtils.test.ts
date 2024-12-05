import { MathUtils } from './MathUtils'

describe('MathUtils', () => {
  describe('isScientificNotation', () => {
    test('should return true for valid scientific notation', () => {
      expect(MathUtils.isScientificNotation('1e+3')).toBe(true)
      expect(MathUtils.isScientificNotation('1e-3')).toBe(true)
      expect(MathUtils.isScientificNotation('-1.23e+4')).toBe(true)
    })

    test('should return false for invalid scientific notation', () => {
      expect(MathUtils.isScientificNotation('123')).toBe(false)
      expect(MathUtils.isScientificNotation('1.23^3')).toBe(false)
      expect(MathUtils.isScientificNotation('e+3')).toBe(false)
    })
  })

  describe('isPowerNotation', () => {
    test('should return true for valid power notation', () => {
      expect(MathUtils.isPowerNotation('10^3')).toBe(true)
      expect(MathUtils.isPowerNotation('-2^5')).toBe(true)
    })

    test('should return false for invalid power notation', () => {
      expect(MathUtils.isPowerNotation('10e3')).toBe(false)
      expect(MathUtils.isPowerNotation('10^')).toBe(false)
      expect(MathUtils.isPowerNotation('^3')).toBe(false)
    })
  })

  describe('convertScientificNotationToDecimal', () => {
    test('should correctly convert scientific notation to decimal', () => {
      expect(MathUtils.convertScientificNotationToDecimal('1e3')).toBe(1000)
      expect(MathUtils.convertScientificNotationToDecimal('1e-3')).toBe(0.001)
    })
  })

  describe('convertPowerNotationToDecimal', () => {
    test('should correctly convert power notation to decimal', () => {
      expect(MathUtils.convertPowerNotationToDecimal('2^3')).toBe(8)
      expect(MathUtils.convertPowerNotationToDecimal('-2^3')).toBe(-8)
    })
  })

  describe('isConvertibleToDecimal', () => {
    test('should return true for valid decimal strings', () => {
      expect(MathUtils.isConvertibleToDecimal('123')).toBe(true)
      expect(MathUtils.isConvertibleToDecimal('-123.45')).toBe(true)
    })

    test('should return false for invalid decimal strings', () => {
      expect(MathUtils.isConvertibleToDecimal('abc')).toBe(false)
      expect(MathUtils.isConvertibleToDecimal('123.45.67')).toBe(false)
    })
  })

  describe('incrementExponent', () => {
    test('should increment the exponent for valid scientific notation', () => {
      expect(MathUtils.incrementExponent('1e+3')).toBe('1e4')
      expect(MathUtils.incrementExponent('1e3')).toBe('1e4')
    })

    test('should throw an error for invalid input', () => {
      expect(() => MathUtils.incrementExponent('123')).toThrowError()
      expect(() => MathUtils.incrementExponent('1^3')).toThrowError()
    })
  })

  describe('decrementExponent', () => {
    test('should decrement the exponent for valid scientific notation', () => {
      expect(MathUtils.decrementExponent('1e+3')).toBe('1e2')
      expect(MathUtils.decrementExponent('1e3')).toBe('1e2')
    })

    test('should throw an error for invalid input', () => {
      expect(() => MathUtils.decrementExponent('123')).toThrowError()
      expect(() => MathUtils.decrementExponent('1^3')).toThrowError()
    })
  })
})
