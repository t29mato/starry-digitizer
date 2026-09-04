import { expect, describe, it } from '@jest/globals'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectLocale,
  isLocale,
  messages,
  translate,
  type MessageKey,
} from './index'

// INFO: The catalogues are split per UI area (locales/*.ts) and merged, so the
// main risk is drift: a key added to English and forgotten in Japanese, or an
// interpolation placeholder that only exists in one language. These tests make
// that a red build instead of a blank label in production.

describe('message catalogues', () => {
  const enKeys = Object.keys(messages.en).sort()

  it('defines the same keys in every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect({ locale, keys: Object.keys(messages[locale]).sort() }).toEqual({
        locale,
        keys: enKeys,
      })
    }
  })

  it('has no empty message', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const empty = Object.entries(messages[locale])
        .filter(([, value]) => value.trim() === '')
        .map(([key]) => key)
      expect({ locale, empty }).toEqual({ locale, empty: [] })
    }
  })

  it('uses the same interpolation placeholders in every locale', () => {
    const placeholders = (text: string) =>
      (text.match(/\{(\w+)\}/g) ?? []).sort()

    for (const key of enKeys) {
      for (const locale of SUPPORTED_LOCALES) {
        expect({ key, locale, placeholders: placeholders(messages[locale][key]) }).toEqual({
          key,
          locale,
          placeholders: placeholders(messages.en[key as MessageKey]),
        })
      }
    }
  })

  it('keeps every key namespaced by area', () => {
    const unnamespaced = enKeys.filter((key) => !key.includes('.'))
    expect(unnamespaced).toEqual([])
  })
})

describe('translate', () => {
  it('returns the message for the requested locale', () => {
    expect(translate('en', 'common.confirm')).toBe('Confirm')
    expect(translate('ja', 'common.confirm')).toBe('確定')
  })

  it('falls back to English when a locale lacks the key', () => {
    // INFO: simulates a half-translated catalogue without shipping one.
    const table = messages.ja as Record<string, string>
    const original = table['common.confirm']
    delete table['common.confirm']
    try {
      expect(translate('ja', 'common.confirm')).toBe('Confirm')
    } finally {
      table['common.confirm'] = original
    }
  })

  it('returns the key itself when it is unknown', () => {
    expect(translate('en', 'no.such.key' as MessageKey)).toBe('no.such.key')
  })

  it('interpolates named parameters and leaves unknown ones alone', () => {
    expect(translate('en', 'no.such.{name}' as MessageKey, { name: 'x' })).toBe(
      'no.such.{name}',
    )
  })
})

describe('locale helpers', () => {
  it('recognises supported locales only', () => {
    expect(isLocale('ja')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })

  it('detects the browser language, falling back to the default', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'language')
    const set = (value: string) =>
      Object.defineProperty(navigator, 'language', {
        value,
        configurable: true,
      })

    try {
      set('ja-JP')
      expect(detectLocale()).toBe('ja')
      set('en-US')
      expect(detectLocale()).toBe('en')
      set('fr-FR')
      expect(detectLocale()).toBe(DEFAULT_LOCALE)
    } finally {
      if (original) {
        Object.defineProperty(navigator, 'language', original)
      }
    }
  })
})
