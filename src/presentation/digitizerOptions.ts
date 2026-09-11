import { inject, isRef, provide } from 'vue'
import type { InjectionKey, Ref } from 'vue'

/**
 * Feature toggles. All default to "on" in the standalone app.
 *
 * The first four switch individual controls; the next five hide whole panels,
 * for hosts that already provide the same thing in their own UI (a sample
 * picker, a point-list editor, ...) and would otherwise show it twice.
 * The four `keyboard*` flags are the odd ones out: they hide nothing, they
 * hand key handling back to the host.
 */
export interface StarryDigitizerFeatures {
  /** Show the image file input / accept drag&drop + paste. */
  imageUpload: boolean
  /** Show "Save/Load Project" (ZIP) buttons and their keyboard shortcuts. */
  zipExportImport: boolean
  /** Show "Copy to Clipboard" (CSV) buttons. */
  csvExport: boolean
  /**
   * Show "Auto-fill values (OCR)" in the axis panel. Off also keeps the
   * ~11MB of tesseract.js worker/wasm/language assets out of the host build,
   * since nothing can reach the (lazy) OCR code path any more.
   */
  axisOcr: boolean
  /** Show the axis-set list and its calibration panel. */
  axisPanel: boolean
  /** Show the dataset list. */
  datasetPanel: boolean
  /** Show the manual/automatic extraction panel. */
  extractionPanel: boolean
  /** Show the magnifier. */
  magnifier: boolean
  /** Show the table of extracted values. */
  dataTable: boolean
  /**
   * All keyboard shortcuts at once — the default the three groups below fall
   * back to, and nothing else. It handles no key of its own.
   *
   * **Precedence**, applied per group:
   *
   * 1. the group flag (`keyboardHistory` / `keyboardFile` /
   *    `keyboardEditing`) when the host states it explicitly — it always wins;
   * 2. otherwise `keyboardShortcuts`, when the host states that;
   * 3. otherwise `true`.
   *
   * So `{}` leaves every group on, `{ keyboardShortcuts: false }` turns every
   * group off (what the flag has always meant), and
   * `{ keyboardShortcuts: false, keyboardEditing: true }` turns everything off
   * except the editing group — the host owns ⌘Z, ⌘S and ⌘O, the canvas keeps
   * its arrow keys, Delete, zoom and mode switches.
   */
  keyboardShortcuts: boolean
  /**
   * ⌘Z / Ctrl+Z and ⇧⌘Z / Ctrl+Shift+Z (undo / redo).
   *
   * Off for hosts that own a shortcut system of their own: ⌘Z has a single
   * owner on a page, and a host whose ⌘Z means "undo my last edit" cannot
   * also let it mean "undo the digitizer's last point" — with both listening,
   * one press undoes twice. Off means the digitizer neither acts on the key
   * nor calls preventDefault() on it, so it reaches the host's own listener
   * untouched; the host drives the same action through the context
   * <StarryDigitizer> exposes (`historyManager.undo()`).
   */
  keyboardHistory: boolean
  /**
   * ⌘S / ⌘O (Ctrl too): save / load the project ZIP.
   *
   * Same nature as `keyboardHistory` — modifier keys that mean something
   * page-wide, and a host whose ⌘S means "save my record" needs them left
   * alone. Separate from it because a flag must not disable a key it is not
   * named after: a host can keep the digitizer's ⌘S while owning ⌘Z, or the
   * reverse. `features.zipExportImport` still has to be on for either key to
   * do anything.
   */
  keyboardFile: boolean
  /**
   * The keys that belong to the focused widget rather than to the page: the
   * arrow-key nudges, Backspace / Delete, Escape, ⌘A, the zoom keys
   * (`+` `-` `0` `f`) and the mode switches (`a` `e` `d`).
   *
   * These only ever fire while the canvas frame has focus or the pointer is
   * over it, so they do not compete with the host for a key — which is why a
   * host that takes ⌘Z can leave this group on and keep the point editing it
   * would otherwise have to reimplement.
   */
  keyboardEditing: boolean
}

/**
 * How the digitizer asks the user to confirm a destructive action.
 *
 * The default is `window.confirm`, and a host that does nothing keeps the
 * native dialog. A host with its own dialog component passes one of these
 * instead, so the question is asked in the host's own UI: a native dialog is
 * the one thing that immediately gives away that a second app is embedded in
 * the page — the OS chrome looks and sits nowhere near the host's own modals.
 *
 * `message` is the exact text the digitizer would have passed to
 * `window.confirm` (plain text, no markup). Resolve `true` to go ahead,
 * `false` to cancel; returning a plain boolean is allowed for hosts whose
 * dialog is synchronous.
 */
export type ConfirmDialog = (message: string) => boolean | Promise<boolean>

/**
 * The default: the browser's own dialog. Deliberately a wrapper rather than
 * `window.confirm` itself, so the lookup happens at call time — test doubles
 * (Cypress's `cy.on('window:confirm')`, jest.spyOn) replace the property on
 * `window` after this module has been evaluated, and a captured reference
 * would keep calling the original.
 */
export const DEFAULT_CONFIRM: ConfirmDialog = (message: string) =>
  window.confirm(message)

/**
 * Per-instance UI options derived from <StarryDigitizer> props and provided
 * to every descendant. Components read them with useDigitizerOptions().
 */
export interface DigitizerOptions {
  /** Viewing only: no point/axis/dataset edits, no extraction, no undo/redo. */
  readonly: boolean
  features: StarryDigitizerFeatures
  /** Dataset name suggestions; when non-empty the name field becomes a combobox. */
  datasetNameCandidates: string[]
  /** Base URL for heavy assets (tesseract worker/core/lang). undefined = library defaults. */
  assetBaseUrl?: string
  /** Ask before replacing an image that already has axes/points. */
  confirmImageReplace: boolean
  /**
   * Asks the user to confirm a destructive action (deleting a dataset,
   * removing an axis set, replacing the image, ...). Defaults to
   * `window.confirm`; hosts pass their own dialog. See ConfirmDialog.
   */
  confirm: ConfirmDialog
}

export const DIGITIZER_OPTIONS_KEY: InjectionKey<DigitizerOptions> = Symbol(
  'starry-digitizer-options',
)

export const DEFAULT_FEATURES: StarryDigitizerFeatures = {
  imageUpload: true,
  zipExportImport: true,
  csvExport: true,
  axisOcr: true,
  axisPanel: true,
  datasetPanel: true,
  extractionPanel: true,
  magnifier: true,
  dataTable: true,
  keyboardShortcuts: true,
  keyboardHistory: true,
  keyboardFile: true,
  keyboardEditing: true,
}

const FEATURE_KEYS = Object.keys(
  DEFAULT_FEATURES,
) as (keyof StarryDigitizerFeatures)[]

/**
 * The keyboard groups, in the order they are tried in CanvasMain. Each falls
 * back to `keyboardShortcuts` when the host has not named it — see the
 * precedence rule on `keyboardShortcuts`.
 */
const KEYBOARD_FEATURE_KEYS = [
  'keyboardHistory',
  'keyboardFile',
  'keyboardEditing',
] as const

const KEYBOARD_FEATURE_KEY_SET = new Set<keyof StarryDigitizerFeatures>(
  KEYBOARD_FEATURE_KEYS,
)

/**
 * One feature flag, resolved against what the host actually stated.
 *
 * Everything reads flags through here so the precedence rule lives in one
 * place: an explicit group flag wins, `keyboardShortcuts` is the fallback for
 * the keyboard groups, and DEFAULT_FEATURES is the fallback for everything.
 */
function resolveFeature<K extends keyof StarryDigitizerFeatures>(
  features: Partial<StarryDigitizerFeatures> | undefined,
  key: K,
): StarryDigitizerFeatures[K] {
  const stated = features?.[key]
  if (stated !== undefined) {
    return stated
  }
  if (KEYBOARD_FEATURE_KEY_SET.has(key)) {
    return features?.keyboardShortcuts ?? DEFAULT_FEATURES[key]
  }
  return DEFAULT_FEATURES[key]
}

function resolveFeatures(
  features: Partial<StarryDigitizerFeatures> | undefined,
): StarryDigitizerFeatures {
  return Object.fromEntries(
    FEATURE_KEYS.map((key) => [key, resolveFeature(features, key)]),
  ) as unknown as StarryDigitizerFeatures
}

/**
 * The values every option falls back to. Read them (to show a host's own
 * control in its default position, to compare against), but do not build an
 * options object by spreading this: `features` is nested, so
 * `{ ...DEFAULT_OPTIONS, features: { magnifier: false } }` replaces the whole
 * feature set and silently drops the other twelve flags. Pass the partial
 * straight to provideDigitizerOptions() — or, if you need a complete object
 * in hand, build it with createDigitizerOptions().
 */
export const DEFAULT_OPTIONS: DigitizerOptions = {
  readonly: false,
  features: DEFAULT_FEATURES,
  datasetNameCandidates: [],
  assetBaseUrl: undefined,
  confirmImageReplace: true,
  confirm: DEFAULT_CONFIRM,
}

/**
 * Partial options, with `features` partial too: the nested object is merged
 * against DEFAULT_FEATURES rather than replacing it, so a host can turn one
 * feature off without having to restate the other twelve.
 *
 * This is what provideDigitizerOptions() takes, so a host never has to name
 * an option it does not care about.
 */
export interface DigitizerOptionsInit
  extends Partial<Omit<DigitizerOptions, 'features'>> {
  features?: Partial<StarryDigitizerFeatures>
}

/**
 * Fill a partial set of options out to a complete DigitizerOptions, exactly
 * the way <StarryDigitizer> fills its props out (it uses this too). Spreading
 * DEFAULT_OPTIONS by hand does not do the same thing: `features` is nested, so
 * `{ ...DEFAULT_OPTIONS, features: { magnifier: false } }` would silently drop
 * every other feature flag.
 *
 * Only needed when the host wants a complete object in its own hands — to
 * store it, to hand it around, to compare against. Just providing options to
 * the panels does not: provideDigitizerOptions() takes the partial as it is
 * and fills in the same defaults.
 */
export function createDigitizerOptions(
  init: DigitizerOptionsInit = {},
): DigitizerOptions {
  return {
    readonly: init.readonly ?? DEFAULT_OPTIONS.readonly,
    features: resolveFeatures(init.features),
    datasetNameCandidates:
      init.datasetNameCandidates ?? DEFAULT_OPTIONS.datasetNameCandidates,
    assetBaseUrl: init.assetBaseUrl ?? DEFAULT_OPTIONS.assetBaseUrl,
    confirmImageReplace:
      init.confirmImageReplace ?? DEFAULT_OPTIONS.confirmImageReplace,
    confirm: init.confirm ?? DEFAULT_OPTIONS.confirm,
  }
}

/**
 * Ask the user, through whichever dialog the host installed, and answer
 * `true` only for an explicit yes.
 *
 * Every confirmation in the library goes through here rather than calling
 * `options.confirm` directly, for the failure case: a host dialog that throws
 * or rejects (its modal host unmounted, a network-backed permission check
 * failed, a plain bug) must not make the user's click vanish without a trace.
 * Silently answering `false` would drop the action, and silently answering
 * `true` would run a destructive one nobody agreed to — so we warn and fall
 * back to the browser dialog. The user is still asked, and still decides;
 * the fallback is ugly next to the host's UI, which is exactly the right
 * incentive to fix it. If even that is unavailable (no `window.confirm`, e.g.
 * a non-browser test environment), the action is cancelled.
 */
export async function requestConfirmation(
  options: Pick<DigitizerOptions, 'confirm'>,
  message: string,
): Promise<boolean> {
  try {
    return (await options.confirm(message)) === true
  } catch (error) {
    console.warn(
      '[starry-digitizer] the host confirm() failed; falling back to window.confirm',
      error,
    )
    if (
      options.confirm === DEFAULT_CONFIRM ||
      typeof window === 'undefined' ||
      typeof window.confirm !== 'function'
    ) {
      // INFO: the browser dialog is what just failed (or does not exist);
      // calling it again would only throw a second time.
      return false
    }
    return window.confirm(message)
  }
}

/**
 * What provideDigitizerOptions() accepts: a *partial* set of options, as a
 * plain object, a reactive() one, a ref/computed holding one, or a getter
 * returning one. Anything the host leaves out is filled in from the defaults,
 * so `{ readonly: true }` and `{ features: { magnifier: false } }` are both
 * complete options as far as the panels are concerned.
 *
 * Whichever the host passes, useDigitizerOptions() hands back a full,
 * plain-looking DigitizerOptions: readers write `options.readonly` — no
 * `.value`, and no `?? DEFAULT_OPTIONS.readonly`.
 */
export type DigitizerOptionsSource =
  | DigitizerOptionsInit
  | Ref<DigitizerOptionsInit>
  | (() => DigitizerOptionsInit)

const OPTION_KEYS = Object.keys(DEFAULT_OPTIONS) as (keyof DigitizerOptions)[]

/**
 * An object with exactly `keys`, each read through `readKey` at the moment it
 * is asked for. Everything else (`constructor`, `hasOwnProperty`, ...) behaves
 * as it would on a plain object.
 *
 * A proxy rather than a merged copy, because copying is what breaks the two
 * things this module has to keep: a copy taken at provide() time never sees
 * the host's later changes, and a copy taken off a reactive() source reads
 * every field eagerly — which would subscribe the reader to all of them and
 * make any option change re-render every panel. Reading one property here
 * touches exactly that property of the source, so Vue tracks exactly it.
 *
 * The facade is a read-only view: the host owns the source object and mutates
 * that, and nothing in the library writes to the injected options.
 */
function facade<T extends object>(
  keys: (keyof T)[],
  readKey: (key: keyof T) => T[keyof T],
): T {
  const known = new Set<PropertyKey>(keys as PropertyKey[])

  return new Proxy({} as T, {
    get: (target, key, receiver) =>
      known.has(key)
        ? readKey(key as keyof T)
        : Reflect.get(target, key, receiver),
    has: (target, key) => known.has(key) || Reflect.has(target, key),
    ownKeys: () => keys as (string | symbol)[],
    getOwnPropertyDescriptor: (target, key) =>
      known.has(key)
        ? {
            enumerable: true,
            configurable: true,
            value: readKey(key as keyof T),
          }
        : Reflect.getOwnPropertyDescriptor(target, key),
  })
}

/**
 * Turn whatever the host passed into the complete DigitizerOptions the panels
 * read — without ever copying it, so a reactive()/ref/getter source stays
 * live and a partial one stays partial until the moment a field is read.
 *
 * The defaults are applied per property rather than by running the source
 * through createDigitizerOptions(): that helper reads *every* field, so doing
 * it on each access would make a reader of `options.readonly` depend on all of
 * them, and one dataset-name change would re-render every panel.
 */
function resolveDigitizerOptions(
  source: DigitizerOptionsSource,
): DigitizerOptions {
  const read: () => DigitizerOptionsInit =
    typeof source === 'function'
      ? source
      : isRef(source)
      ? () => source.value
      : () => source

  // INFO: `features` is nested, so it needs a facade of its own — otherwise a
  // host that turns one flag off would hand the panels an object missing the
  // other twelve. Built once, so `options.features` keeps a stable identity.
  const features = facade<StarryDigitizerFeatures>(FEATURE_KEYS, (key) =>
    resolveFeature(read().features, key),
  )

  return facade<DigitizerOptions>(OPTION_KEYS, (key) =>
    key === 'features' ? features : read()[key] ?? DEFAULT_OPTIONS[key],
  )
}

/**
 * Provide options to panels rendered outside <StarryDigitizer>. Hosts that
 * compose the exported panels themselves call this next to
 * provideDigitizerContext(); otherwise every panel falls back to
 * DEFAULT_OPTIONS.
 *
 * Pass only what you want to change — `{ features: { magnifier: false } }` is
 * enough, everything else keeps its default. Pass a ref/computed/reactive
 * object or a getter (see DigitizerOptionsSource) when the options change
 * after setup — permission-driven `readonly`, dataset name candidates that
 * arrive from a fetch — and the panels follow along.
 */
export function provideDigitizerOptions(options: DigitizerOptionsSource): void {
  provide(DIGITIZER_OPTIONS_KEY, resolveDigitizerOptions(options))
}

// INFO: warned about once per page rather than once per component, because
// every panel calls useDigitizerOptions() and one forgotten provide would
// otherwise print a dozen identical lines.
let hasWarnedAboutMissingOptions = false

/**
 * The options for the panel calling this, filled out from the defaults.
 *
 * Options stay OPTIONAL — a host that provides none gets DEFAULT_OPTIONS, and
 * that is a supported arrangement. But the default is the widest one there
 * is (`readonly: false`, every feature on), so a host that MEANT to provide
 * options and did not gets a fully editable digitizer with every panel back,
 * looking entirely normal. That is why the fallback warns rather than staying
 * silent, and why it is deliberately asymmetric with useDigitizerContext(),
 * which throws: there is no sensible default context, and there is a sensible
 * default set of options.
 */
export function useDigitizerOptions(): DigitizerOptions {
  const provided = inject(DIGITIZER_OPTIONS_KEY, undefined)
  if (provided) {
    return provided
  }

  if (!hasWarnedAboutMissingOptions) {
    hasWarnedAboutMissingOptions = true
    console.warn(
      '[starry-digitizer] no options were provided, falling back to ' +
        'DEFAULT_OPTIONS (readonly: false, every feature on). Call ' +
        'provideDigitizerOptions({ ... }) in an ancestor of the panels — ' +
        'next to provideDigitizerContext() — or render them inside ' +
        '<StarryDigitizer>, which provides them for you.',
    )
  }
  return DEFAULT_OPTIONS
}
