import {
  isScientificNotation,
  isPowerNotation,
  convertScientificNotationToNumber,
  convertPowerNotationToNumber
} from './XYInputUtils';

describe('isScientificNotation', () => {
  test('should return true for valid scientific notation', () => {
    expect(isScientificNotation('10e+2')).toBe(true);
    expect(isScientificNotation('-10e-2')).toBe(true);
    expect(isScientificNotation('1.5e3')).toBe(true);
    expect(isScientificNotation('0.1e-10')).toBe(true);
  });

  test('should return false for invalid scientific notation', () => {
    expect(isScientificNotation('10^2')).toBe(false);
    expect(isScientificNotation('10e')).toBe(false);
    expect(isScientificNotation('e10')).toBe(false);
    expect(isScientificNotation('1.5e')).toBe(false);
  });
});

describe('isPowerNotation', () => {
  test('should return true for valid power notation', () => {
    expect(isPowerNotation('10^2')).toBe(true);
    expect(isPowerNotation('-5^3')).toBe(true);
    expect(isPowerNotation('2^10')).toBe(true);
  });

  test('should return false for invalid power notation', () => {
    expect(isPowerNotation('10e2')).toBe(false);
    expect(isPowerNotation('10^')).toBe(false);
    expect(isPowerNotation('^2')).toBe(false);
    expect(isPowerNotation('10^2^3')).toBe(false);
  });
});

describe('convertScientificNotationToNumber', () => {
  test('should correctly convert scientific notation to number', () => {
    expect(convertScientificNotationToNumber('10e+2')).toBe(1000);
    expect(convertScientificNotationToNumber('-10e-2')).toBe(-0.1);
    expect(convertScientificNotationToNumber('1.5e3')).toBe(1500);
    expect(convertScientificNotationToNumber('0.1e-10')).toBe(1e-11);
  });
});

describe('convertPowerNotationToNumber', () => {
  test('should correctly convert power notation to number', () => {
    expect(convertPowerNotationToNumber('10^2')).toBe(100);
    expect(convertPowerNotationToNumber('-5^3')).toBe(-125);
    expect(convertPowerNotationToNumber('2^10')).toBe(1024);
  });
});
