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

const isConvertibleToDecimal = (str: string) => {
  // 正規表現で小数または整数を表現
  const decimalRegex = /^[+-]?\d+(\.\d+)?$/
  return decimalRegex.test(str.trim())
}

const incrementExponent = (str: string) => {
  // 正規表現で 1e+X または 1eX を解析
  const match = str.match(/^1e\+?(-?\d+)$/)
  if (match) {
    // マッチした場合、X 部分を取得して 1 加算
    const exponent = parseInt(match[1], 10) + 1
    return `1e${exponent}`
  }

  // マッチしない場合、エラーまたは入力そのままを返す
  throw new Error("Input is not in the format '1e+X' or '1eX'")
}

const decrementExponent = (value: number | string): string => {
  // 入力を文字列に変換
  const str = String(value)

  // 文字列が "1e" で始まっているか確認
  if (!str.startsWith('1e')) {
    throw new Error("Input is not in the format '1e+X' or '1eX'")
  }

  // "1e" の後の部分を取得
  let exponentPart = str.slice(2)

  // 正号 (+) をスキップ
  if (exponentPart.startsWith('+')) {
    exponentPart = exponentPart.slice(1)
  }

  // 数値に変換して -1
  const newExponent = parseInt(exponentPart, 10) - 1

  // 新しい文字列を生成
  return `1e${newExponent}`
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
  incrementExponent,
  decrementExponent,
  isConvertibleToDecimal,
}
