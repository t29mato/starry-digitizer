// INFO: Formats a coordinate value as a plain decimal string (no exponential
// notation), rounded to a fixed number of significant digits.
//
// A naive `value.toPrecision(effectiveDigits)` is not enough because:
// - it falls back to exponential notation for very large/small magnitudes
// - `Number(value.toPrecision(n))` silently drops significant trailing
//   zeros (e.g. -10.070 -> -10.07), which made the mantissa digit count
//   inconsistent between values that happened to round to a trailing zero
//   and values that didn't (see #271, #287)

// Rounds `value` to the given number of decimal places. A negative
// `decimalPlaces` rounds to a power of ten above the decimal point (e.g. -2
// rounds to the nearest hundred), which is needed when the number has more
// integer digits than the requested significant-digit count.
function roundToDecimalPlaces(value: number, decimalPlaces: number): number {
  if (decimalPlaces >= 0) {
    return Number(value.toFixed(Math.min(decimalPlaces, 100)))
  }
  const roundingUnit = Math.pow(10, -decimalPlaces)
  return Math.round(value / roundingUnit) * roundingUnit
}

function toFixedString(value: number, decimalPlaces: number): string {
  return decimalPlaces > 0
    ? value.toFixed(Math.min(decimalPlaces, 100))
    : value.toFixed(0)
}

export function formatCoordValue(
  value: number,
  effectiveDigits: number,
): string {
  if (!Number.isFinite(value)) {
    return String(value)
  }
  if (value === 0) {
    return toFixedString(0, Math.max(effectiveDigits - 1, 0))
  }

  const exponent = Math.floor(Math.log10(Math.abs(value)))
  const decimalPlaces = effectiveDigits - exponent - 1
  const rounded = roundToDecimalPlaces(value, decimalPlaces)

  // INFO: rounding can bump the magnitude up a digit (e.g. 9.996 -> 10.00
  // with 3 effective digits should render as "10.0", not "10.00")
  const roundedExponent =
    rounded === 0 ? exponent : Math.floor(Math.log10(Math.abs(rounded)))
  if (roundedExponent !== exponent) {
    const adjustedDecimalPlaces = effectiveDigits - roundedExponent - 1
    return toFixedString(
      roundToDecimalPlaces(rounded, adjustedDecimalPlaces),
      adjustedDecimalPlaces,
    )
  }

  return toFixedString(rounded, decimalPlaces)
}
