export class XYInputConverter {
  //NOTE: check the string is in the format like 10e+2
  static isScientificNotation(str: string): boolean {
    return /^[-+]?\d+(\.\d+)?e[+-]?\d+$/i.test(str)
  }

  //NOTE: check the string is in the format like 10^3
  static isPowerNotation(str: string): boolean {
    return /^-?\d+\^\d+$/.test(str)
  }

  static convertScientificNotationToNumber(scientificNotation: string): number {
    return parseFloat(scientificNotation)
  }

  static convertPowerNotationToNumber(powerNotation: string): number {
    const [base, exponent] = powerNotation.split('^').map(Number)
    return Math.pow(base, exponent)
  }
}
