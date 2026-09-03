// INFO: Every failure that can surface to a host application is wrapped in
// a DigitizerError with a stable `code`, so <StarryDigitizer> can emit it as
// an `error` event (instead of throwing or alert()-ing) and hosts can branch
// on the code without parsing messages.
export type DigitizerErrorCode =
  | 'IMAGE_LOAD_FAILED'
  | 'INVALID_IMAGE_TYPE'
  | 'DTO_VERSION_UNSUPPORTED'
  | 'PROJECT_INVALID'
  | 'ZIP_INVALID'
  | 'EXPORT_FAILED'

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

export function toErrorPayload(error: DigitizerError): DigitizerErrorPayload {
  return { code: error.code, message: error.message, cause: error.cause }
}
