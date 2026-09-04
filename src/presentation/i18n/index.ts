import { inject, provide, ref } from 'vue'
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { messages } from './messages'

// INFO: A ~100-line i18n instead of vue-i18n: the package's only peer
// dependency is `vue` (docs/design/framework-dependency-review.md), and the
// component needs nothing more than key lookup + {placeholder} interpolation.

export const SUPPORTED_LOCALES = ['en', 'ja'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
}

export type MessageKey = keyof (typeof messages)['en']
export type TranslateParams = Record<string, string | number>

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  )
}

/** Best matching supported locale for the browser, e.g. "ja-JP" -> "ja". */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE
  }
  const candidates = [navigator.language, ...(navigator.languages ?? [])]
  for (const candidate of candidates) {
    const base = candidate?.split('-')[0]
    if (isLocale(base)) {
      return base
    }
  }
  return DEFAULT_LOCALE
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) {
    return template
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

/**
 * Look up `key` in `locale`, falling back to English and finally to the key
 * itself, so a missing translation degrades instead of rendering blank.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: TranslateParams,
): string {
  const table = messages[locale] ?? messages[DEFAULT_LOCALE]
  const template = table[key] ?? messages[DEFAULT_LOCALE][key]
  if (template === undefined) {
    return String(key)
  }
  return interpolate(template, params)
}

export interface I18n {
  locale: ComputedRef<Locale> | Ref<Locale>
  t(key: MessageKey, params?: TranslateParams): string
}

export const I18N_KEY: InjectionKey<I18n> = Symbol('starry-digitizer-i18n')

export function createI18n(locale: ComputedRef<Locale> | Ref<Locale>): I18n {
  return {
    locale,
    t: (key, params) => translate(locale.value, key, params),
  }
}

export function provideI18n(i18n: I18n): void {
  provide(I18N_KEY, i18n)
}

/**
 * Components call this in setup() and expose `t` to their template. Falls back
 * to a stand-alone English instance so a component rendered outside
 * <StarryDigitizer> (a unit test, a Storybook story) still renders text.
 */
export function useI18n(): I18n {
  return inject(I18N_KEY, createI18n(ref(DEFAULT_LOCALE)))
}

export { messages }

// INFO: convenience for the standalone app's language menu.
export function localeOptions(): { value: Locale; label: string }[] {
  return SUPPORTED_LOCALES.map((value) => ({
    value,
    label: LOCALE_LABELS[value],
  }))
}
