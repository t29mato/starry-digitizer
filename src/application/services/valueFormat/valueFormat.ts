import { ValueFormatInterface } from './valueFormatInterface'

// INFO: how many significant digits an extracted value keeps when it leaves
// the digitizer — the CSV copy, the data table, getDatasetValues() and the
// magnifier's coordinate read-out all share this one setting. It used to live
// on Magnifier, which made the precision of the exported numbers depend on a
// panel three of its four readers have nothing to do with (and unreachable
// when `features.magnifier` was off).
//
// Only `effectiveDigits` lives here today; anything else that decides how a
// value is presented to a host or to the UI (a unit, a notation) belongs in
// this service rather than back on a panel's own state.

export const DEFAULT_EFFECTIVE_DIGITS = 4
export const MIN_EFFECTIVE_DIGITS = 1
export const MAX_EFFECTIVE_DIGITS = 10

/**
 * 1 is the fewest digits that still carries information; beyond 10 the extra
 * digits are float noise — one pixel of the source image is worth far more
 * than the 10th significant digit of any value read off it.
 */
export function isValidEffectiveDigits(digits: number): boolean {
  return (
    Number.isInteger(digits) &&
    digits >= MIN_EFFECTIVE_DIGITS &&
    digits <= MAX_EFFECTIVE_DIGITS
  )
}

export class ValueFormat implements ValueFormatInterface {
  effectiveDigits = DEFAULT_EFFECTIVE_DIGITS

  // INFO: the range is enforced here rather than only in the settings UI,
  // because a host can now reach this setter directly (through the
  // `effectiveDigits` prop or ctx.valueFormat) with no panel in between.
  // Callers that render their own message (the data table's field, the
  // component's prop) test with isValidEffectiveDigits() first, so the throw
  // is the backstop for programmatic misuse, not part of the UI flow.
  setEffectiveDigits(digits: number) {
    if (!isValidEffectiveDigits(digits)) {
      throw new RangeError(
        `effectiveDigits must be an integer between ${MIN_EFFECTIVE_DIGITS} and ${MAX_EFFECTIVE_DIGITS}, got ${digits}`,
      )
    }
    this.effectiveDigits = digits
  }
}
