//NOTE: check the string is in the format like 10e+2
const isScientificNotation = (str: string): boolean => {
  return /^[-+]?\d+(\.\d+)?e[+-]?\d+$/i.test(str)
}

//NOTE: check the string is in the format like 10^3
const isPowerNotation = (str: string): boolean => {
  return /^-?\d+\^\d+$/.test(str)
}

const convertScientificNotationToNumber = (
  scientificNotation: string,
): number => {
  return parseFloat(scientificNotation)
}

const convertPowerNotationToNumber = (powerNotation: string): number => {
  const [base, exponent] = powerNotation.split('^').map(Number)
  return Math.pow(base, exponent)
}

export {
  isScientificNotation,
  isPowerNotation,
  convertScientificNotationToNumber,
  convertPowerNotationToNumber,
}
