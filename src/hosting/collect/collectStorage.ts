// INFO: what the research collection keeps in the browser: the anonymous
// client id and the chosen name. The starryai pages share ONE origin with
// wpd-auto (same nginx), so localStorage is shared too — every key is
// namespaced `starry-digitizer.<environment>.` and never collides with
// wpd-auto's (docs/design/starryai-auto.md §4.5). A page whose storage is
// blocked (private window, a policy) still works: it gets a fresh id per
// load and is asked for the name again.

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const ENVIRONMENT_RE = /^[a-z][a-z0-9-]{0,31}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** The key prefix for an environment the backend named (`staging`, …). */
export function storagePrefix(environment: unknown): string {
  const env =
    typeof environment === 'string' && ENVIRONMENT_RE.test(environment)
      ? environment
      : 'unspecified'
  return `starry-digitizer.${env}.`
}

/** localStorage, or null where reading it throws (blocked storage). */
export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readItem(
  storage: KeyValueStorage | null,
  key: string,
): string | null {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

/** false when it could not be written (quota, blocked storage) */
export function writeItem(
  storage: KeyValueStorage | null,
  key: string,
  value: string,
): boolean {
  if (!storage) return false
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * A random (version 4) UUID, lower case. `crypto.randomUUID` is for secure
 * contexts only and the starryai pages are http; `getRandomValues` works on
 * any page.
 */
export function randomUuid(
  random: (bytes: Uint8Array) => Uint8Array = defaultRandom,
): string {
  const b = random(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const hex = Array.from(b, (v) => v.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16,
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function defaultRandom(bytes: Uint8Array): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(bytes)
  }
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}

/** The browser's client id for this environment, made and kept on first use. */
export function loadClientId(
  storage: KeyValueStorage | null,
  prefix: string,
  makeId: () => string = randomUuid,
): string {
  const key = `${prefix}client-id`
  const kept = readItem(storage, key)
  if (isUuid(kept)) return kept
  const id = makeId()
  writeItem(storage, key, id)
  return id
}

/**
 * The name chosen earlier: an id, null for Guest, undefined for "not chosen
 * (or unreadable)".
 */
export function loadUserChoice(
  storage: KeyValueStorage | null,
  prefix: string,
): string | null | undefined {
  const text = readItem(storage, `${prefix}user`)
  if (text === null) return undefined
  try {
    const value = JSON.parse(text) as { user?: unknown }
    if (value && typeof value === 'object' && 'user' in value) {
      if (value.user === null) return null
      if (typeof value.user === 'string') return value.user
    }
  } catch {
    // INFO: a damaged entry is the same as none: the person is asked again
  }
  return undefined
}

export function saveUserChoice(
  storage: KeyValueStorage | null,
  prefix: string,
  user: string | null,
): void {
  writeItem(storage, `${prefix}user`, JSON.stringify({ user }))
}

/** The UTF-8 length of `text` (what the server counts against its limits). */
export function utf8Length(text: string): number {
  let n = 0
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c < 0x80) n += 1
    else if (c < 0x800) n += 2
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      // INFO: a surrogate pair is one 4-byte character
      n += 4
      i += 1
    } else n += 3
  }
  return n
}
