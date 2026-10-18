import {
  evaluateCalibrationExpression,
  isPlainNumber,
  parseCalibrationValue,
} from './calibrationExpression'

function value(text: string): number {
  const result = evaluateCalibrationExpression(text)
  if (!result.ok) throw new Error(`"${text}" failed: ${result.error}`)
  return result.value
}

function error(text: string): string {
  const result = evaluateCalibrationExpression(text)
  if (result.ok) throw new Error(`"${text}" evaluated to ${result.value}`)
  return result.error
}

describe('evaluateCalibrationExpression', () => {
  describe('numbers', () => {
    it.each([
      ['0', 0],
      ['12', 12],
      ['-0.5', -0.5],
      ['.5', 0.5],
      ['3.', 3],
      ['1e-3', 0.001],
      ['2e5', 200000],
      ['1E+5', 100000],
      ['  42  ', 42],
    ])('reads %s', (text, expected) => {
      expect(value(text)).toBe(expected)
    })
  })

  describe('the examples printed on papers', () => {
    it.each([
      ['10^-3', 0.001],
      ['10^(-3)', 0.001],
      ['10⁻³', 0.001],
      ['10³', 1000],
      ['10⁺²', 100],
      ['2×10^5', 200000],
      ['2×10⁵', 200000],
      ['2·10^5', 200000],
      ['2 * 10 ** 5', 200000],
      ['1/300', 1 / 300],
      ['6÷3', 2],
      ['−5', -5],
      ['–5', -5],
    ])('%s = %d', (text, expected) => {
      expect(value(text)).toBeCloseTo(expected, 12)
    })
  })

  describe('precedence', () => {
    it('multiplies before adding', () => {
      expect(value('1+2*3')).toBe(7)
    })

    it('reads ^ right-associatively', () => {
      expect(value('2^3^2')).toBe(512)
    })

    it('binds ^ tighter than unary minus', () => {
      expect(value('-2^2')).toBe(-4)
      expect(value('(-2)^2')).toBe(4)
    })

    it('lets the exponent carry its own sign', () => {
      expect(value('2^-1')).toBe(0.5)
      expect(value('2^--1')).toBe(2)
    })

    it('divides left to right', () => {
      expect(value('8/4/2')).toBe(1)
    })

    it('honours parentheses', () => {
      expect(value('(1+2)*3')).toBe(9)
    })
  })

  describe('constants and functions', () => {
    it.each([
      ['pi', Math.PI],
      ['PI', Math.PI],
      ['π', Math.PI],
      ['pi/2', Math.PI / 2],
      ['2*π', 2 * Math.PI],
      ['e', Math.E],
      ['sqrt(16)', 4],
      ['log10(1000)', 3],
      ['ln(e)', 1],
      ['exp(0)', 1],
      ['1/18+log10(10)', 1 / 18 + 1],
    ])('%s', (text, expected) => {
      expect(value(text)).toBeCloseTo(expected, 12)
    })
  })

  describe('errors', () => {
    it.each([
      ['', 'Enter a value'],
      ['   ', 'Enter a value'],
      ['10^', "Missing a number after '^'"],
      ['2*', "Missing a number after '*'"],
      ['(1+2', "Missing ')'"],
      ['1+2)', "Unexpected ')'"],
      ['2pi', "Missing an operator before 'pi'"],
      ['2(3)', "Missing an operator before '('"],
      ['2e', "Missing an operator before 'e'"],
      ['foo', "Unknown name 'foo'"],
      ['log(10)', 'Use log10(…) or ln(…) instead of log'],
      ['sqrt 4', 'Write sqrt(…) with parentheses'],
      ['1,5', "Use '.' as the decimal point"],
      ['1/0', 'The result is not a finite number'],
      ['1e400', 'The result is not a finite number'],
      ['sqrt(-1)', 'The result is not a finite number'],
      ['10 K', "Missing an operator before 'K'"],
      ['1 = 1', "Unexpected character '='"],
      ['2*/3', "Missing a number between '*' and '/'"],
    ])('%j → %s', (text, message) => {
      expect(error(text)).toBe(message)
    })

    it('limits the nesting depth', () => {
      expect(error('('.repeat(40) + '1' + ')'.repeat(40))).toBe(
        'The expression is nested too deeply',
      )
      expect(error('-'.repeat(100) + '1')).toBe(
        'The expression is nested too deeply',
      )
    })

    it('limits the length', () => {
      expect(error('1+'.repeat(150) + '1')).toBe('The expression is too long')
    })

    it('does not reach JavaScript globals or prototype members', () => {
      for (const name of [
        'constructor',
        'toString',
        'Math',
        'alert',
        'window',
      ]) {
        expect(error(name)).toBe(`Unknown name '${name}'`)
      }
      expect(error('constructor(1)')).toBe("Unknown name 'constructor'")
      expect(error('__proto__')).toBe("Unexpected character '_'")
    })
  })
})

describe('parseCalibrationValue', () => {
  it('returns the value of a valid expression', () => {
    expect(parseCalibrationValue('10^-3')).toBe(0.001)
  })

  it('returns NaN for an empty or invalid text', () => {
    expect(parseCalibrationValue('')).toBeNaN()
    expect(parseCalibrationValue('10^')).toBeNaN()
  })
})

describe('isPlainNumber', () => {
  it.each(['1', '-1', '0.5', '.5', '1e-3', '2E+5', ' 3 '])('%s is', (text) => {
    expect(isPlainNumber(text)).toBe(true)
  })

  it.each(['10^-3', '1/3', 'pi', '2×10⁵', '', '-'])('%s is not', (text) => {
    expect(isPlainNumber(text)).toBe(false)
  })
})
