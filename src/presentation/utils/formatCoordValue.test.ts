import { formatCoordValue } from './formatCoordValue'

describe('formatCoordValue', () => {
  it('formats a value in plain decimal notation instead of exponential', () => {
    expect(formatCoordValue(306.5, 4)).toBe('306.5')
    expect(formatCoordValue(-10.07, 4)).toBe('-10.07')
  })

  it('keeps a consistent mantissa digit count across values with a trailing zero (#271)', () => {
    // Both rows use the same effectiveDigits, so both should render with the
    // same number of significant digits, even though -10.07 has a "hidden"
    // trailing zero at this precision.
    expect(formatCoordValue(-10.07, 5)).toBe('-10.070')
    expect(formatCoordValue(-10.653, 5)).toBe('-10.653')
  })

  it('rounds to the requested number of significant digits', () => {
    expect(formatCoordValue(5.5, 5)).toBe('5.5000')
    expect(formatCoordValue(123.456, 3)).toBe('123')
    expect(formatCoordValue(0.001234, 2)).toBe('0.0012')
  })

  it('handles zero', () => {
    expect(formatCoordValue(0, 4)).toBe('0.000')
  })

  it('handles negative values', () => {
    expect(formatCoordValue(-306.5, 4)).toBe('-306.5')
  })

  it('carries a rounding-induced magnitude change into the digit count', () => {
    // 9.996 rounded to 3 significant digits becomes 10.0, not 10.00
    expect(formatCoordValue(9.996, 3)).toBe('10.0')
  })

  it('never falls back to exponential notation for large or small magnitudes', () => {
    expect(formatCoordValue(123456789, 4)).toBe('123500000')
    expect(formatCoordValue(0.000001234, 4)).toBe('0.000001234')
  })

  it('returns a plain string for non-finite input', () => {
    expect(formatCoordValue(NaN, 4)).toBe('NaN')
    expect(formatCoordValue(Infinity, 4)).toBe('Infinity')
  })
})
