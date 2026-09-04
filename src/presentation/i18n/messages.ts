import { common } from './locales/common'
import { axis } from './locales/axis'
import { dataset } from './locales/dataset'
import { extract } from './locales/extract'
import { magnifier } from './locales/magnifier'
import { app } from './locales/app'

// INFO: message catalogues are split per UI area so that several people (or
// agents) can edit them without stepping on each other; they are merged here
// into one flat `key -> string` table per locale. Keys are namespaced by area
// ("axis.editAxes"), which keeps the flat table readable and greppable.
const parts = [common, axis, dataset, extract, magnifier, app]

function merge(locale: 'en' | 'ja') {
  return Object.assign({}, ...parts.map((part) => part[locale])) as Record<
    string,
    string
  >
}

// INFO: `en` is the source of truth for the key set; `ja` is checked against
// it by src/presentation/i18n/i18n.test.ts.
export const messages = {
  en: merge('en') as (typeof common)['en'] &
    (typeof axis)['en'] &
    (typeof dataset)['en'] &
    (typeof extract)['en'] &
    (typeof magnifier)['en'] &
    (typeof app)['en'],
  ja: merge('ja') as Record<string, string>,
}
