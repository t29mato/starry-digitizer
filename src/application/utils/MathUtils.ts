//NOTE: check the string is in the format like 10e+2
const isScientificNotation = (str: string): boolean => {
  return /^[-+]?\d+(\.\d+)?e[+-]?\d+$/i.test(str)
}

//NOTE: check the string is in the format like 10^3
const isPowerNotation = (str: string): boolean => {
  return /^-?\d+\^\d+$/.test(str)
}

const convertScientificNotationToDecimal = (
  scientificNotation: string,
): number => {
  return parseFloat(scientificNotation)
}

const convertPowerNotationToDecimal = (powerNotation: string): number => {
  const [base, exponent] = powerNotation.split('^').map(Number)
  return Math.pow(base, exponent)
}

const convertDecimalToScientificNotation = (num: number) => {
  return num.toExponential()
}

const isConvertibleToDecimal = (str: string) => {
  // 正規表現で小数または整数を表現
  const decimalRegex = /^[+-]?\d+(\.\d+)?$/
  return decimalRegex.test(str.trim())
}

// const convertPowerNotationToNumber(powerNotation: string): number = () => {}
// const convertNumberToPowerNotation(num: number): string = () => {}
// const convertScientificNotationToNumber(scientificNotation: string): number = () => {}
// const convertNumberToScientificNotation(num: number): string = () => {}

export const MathUtils = {
  isScientificNotation,
  isPowerNotation,
  convertScientificNotationToDecimal,
  convertPowerNotationToDecimal,
  convertDecimalToScientificNotation,
  isConvertibleToDecimal,
}
