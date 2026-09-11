// INFO: Every failure that can surface to a host application is wrapped in
// a DigitizerError with a stable `code`, so <StarryDigitizer> can emit it as
// an `error` event (instead of throwing or alert()-ing) and hosts can branch
// on the code without parsing messages.
//
// INFO: the codes are a value first and the type is derived from it, so the
// two can never drift. Hosts that want to validate a code they received (a
// select box, a message table, an exhaustiveness check) iterate this array
// instead of hand-copying the union out of the .d.ts — a copy silently rounds
// every code added here down to its own fallback.
export const DIGITIZER_ERROR_CODES = [
  'IMAGE_LOAD_FAILED',
  'INVALID_IMAGE_TYPE',
  'DTO_VERSION_UNSUPPORTED',
  'PROJECT_INVALID',
  'ZIP_INVALID',
  'EXPORT_FAILED',
  // INFO: addAxisCoord() was called on an axis set whose calibration is
  // already complete (no `nextAxis` left to fill). A host driving calibration
  // programmatically branches on this instead of parsing the message.
  'AXIS_SET_ALREADY_CALIBRATED',
] as const

export type DigitizerErrorCode = (typeof DIGITIZER_ERROR_CODES)[number]

export function isDigitizerErrorCode(
  value: unknown,
): value is DigitizerErrorCode {
  return (DIGITIZER_ERROR_CODES as readonly unknown[]).includes(value)
}

export class DigitizerError extends Error {
  readonly code: DigitizerErrorCode
  readonly cause?: unknown

  constructor(code: DigitizerErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'DigitizerError'
    this.code = code
    this.cause = cause
  }

  static from(
    error: unknown,
    fallbackCode: DigitizerErrorCode,
    fallbackMessage?: string,
  ): DigitizerError {
    if (error instanceof DigitizerError) {
      return error
    }
    // INFO: `instanceof` alone is not enough. A host that ends up with two
    // copies of the library on the page (the classic duplicate-bundle case)
    // gets two distinct DigitizerError classes, and an error thrown by one is
    // not an instance of the other — the code would then be thrown away and
    // replaced by `fallbackCode`. This is also the path a DigitizerErrorPayload
    // takes: panels emit the payload, the root re-normalises it, and only the
    // shape check keeps its `code` and `message` intact.
    if (isDigitizerErrorLike(error)) {
      return new DigitizerError(
        error.code,
        fallbackMessage ?? error.message,
        error.cause,
      )
    }
    const message =
      fallbackMessage ??
      (error instanceof Error ? error.message : String(error))
    return new DigitizerError(fallbackCode, message, error)
  }
}

export interface DigitizerErrorPayload {
  code: DigitizerErrorCode
  message: string
  cause?: unknown
}

// INFO: the shape check behind DigitizerError.from(). Exported because hosts
// need exactly the same test on the receiving end and, for the duplicate-bundle
// reason above, cannot write it as `e instanceof DigitizerError`. It accepts a
// DigitizerError and a DigitizerErrorPayload alike: both carry a known `code`
// and a string `message`, which is all a host branches on.
export function isDigitizerErrorLike(
  error: unknown,
): error is DigitizerErrorPayload {
  if (typeof error !== 'object' || error === null) {
    return false
  }
  const candidate = error as { code?: unknown; message?: unknown }
  return (
    isDigitizerErrorCode(candidate.code) &&
    typeof candidate.message === 'string'
  )
}

/**
 * The `{ code, message, cause }` a host branches on.
 *
 * Give it a `fallbackCode` and it takes ANYTHING — the whole "is this one of
 * ours, and if not what do I call it" step goes away, so a host's error
 * handler is one line:
 *
 *     onError: (e) => setError(toErrorPayload(e, 'PROJECT_INVALID'))
 *
 * Without the second argument the value must already be a DigitizerError.
 */
export function toErrorPayload(error: DigitizerError): DigitizerErrorPayload
export function toErrorPayload(
  error: unknown,
  fallbackCode: DigitizerErrorCode,
  fallbackMessage?: string,
): DigitizerErrorPayload
export function toErrorPayload(
  error: unknown,
  fallbackCode?: DigitizerErrorCode,
  fallbackMessage?: string,
): DigitizerErrorPayload {
  // INFO: routed through DigitizerError.from() rather than reading the
  // properties here, so the duck-typing that survives a duplicated bundle is
  // applied on this path too — the same reason isDigitizerErrorLike() exists.
  const digitizerError =
    fallbackCode === undefined
      ? (error as DigitizerError)
      : DigitizerError.from(error, fallbackCode, fallbackMessage)

  return {
    code: digitizerError.code,
    message: digitizerError.message,
    cause: digitizerError.cause,
  }
}
