import {
  MathUtils
} from './MathUtils';

describe('isScientificNotation', () => {
  test('should return true for valid scientific notation', () => {
    expect(MathUtils.isScientificNotation('10e+2')).toBe(true);
    expect(MathUtils.isScientificNotation('-10e-2')).toBe(true);
    expect(MathUtils.isScientificNotation('1.5e3')).toBe(true);
    expect(MathUtils.isScientificNotation('0.1e-10')).toBe(true);
  });

  test('should return false for invalid scientific notation', () => {
    expect(MathUtils.isScientificNotation('10^2')).toBe(false);
    expect(MathUtils.isScientificNotation('10e')).toBe(false);
    expect(MathUtils.isScientificNotation('e10')).toBe(false);
    expect(MathUtils.isScientificNotation('1.5e')).toBe(false);
  });
});

describe('isPowerNotation', () => {
  test('should return true for valid power notation', () => {
    expect(MathUtils.isPowerNotation('10^2')).toBe(true);
    expect(MathUtils.isPowerNotation('-5^3')).toBe(true);
    expect(MathUtils.isPowerNotation('2^10')).toBe(true);
  });

  test('should return false for invalid power notation', () => {
    expect(MathUtils.isPowerNotation('10e2')).toBe(false);
    expect(MathUtils.isPowerNotation('10^')).toBe(false);
    expect(MathUtils.isPowerNotation('^2')).toBe(false);
    expect(MathUtils.isPowerNotation('10^2^3')).toBe(false);
  });
});

describe('convertScientificNotationToDecimal', () => {
  test('should correctly convert scientific notation to number', () => {
    expect(MathUtils.convertScientificNotationToDecimal('10e+2')).toBe(1000);
    expect(MathUtils.convertScientificNotationToDecimal('-10e-2')).toBe(-0.1);
    expect(MathUtils.convertScientificNotationToDecimal('1.5e3')).toBe(1500);
    expect(MathUtils.convertScientificNotationToDecimal('0.1e-10')).toBe(1e-11);
  });
});

describe('convertPowerNotationToDecimal', () => {
  test('should correctly convert power notation to number', () => {
    expect(MathUtils.convertPowerNotationToDecimal('10^2')).toBe(100);
    expect(MathUtils.convertPowerNotationToDecimal('-5^3')).toBe(-125);
    expect(MathUtils.convertPowerNotationToDecimal('2^10')).toBe(1024);
  });
});
