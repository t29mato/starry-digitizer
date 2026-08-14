import { Magnifier } from './magnifier'

describe('Magnifier', () => {
  test('has the expected defaults', () => {
    const magnifier = new Magnifier()
    expect(magnifier.scale).toBe(5)
    expect(magnifier.magnifierSettingError).toBe('')
    expect(magnifier.crosshairSizePx).toBe(1)
    expect(magnifier.sizePx).toBe(300)
    expect(magnifier.effectiveDigits).toBe(4)
  })

  test('setScale updates the scale', () => {
    const magnifier = new Magnifier()
    magnifier.setScale(8)
    expect(magnifier.scale).toBe(8)
  })

  test('setEffectiveDigits updates effectiveDigits', () => {
    const magnifier = new Magnifier()
    magnifier.setEffectiveDigits(6)
    expect(magnifier.effectiveDigits).toBe(6)
  })
})
