import {
  DIGITIZER_ERROR_CODES,
  DigitizerError,
  isDigitizerErrorCode,
  isDigitizerErrorLike,
  toErrorPayload,
} from '@/application/errors'

// INFO: a host that ends up with two copies of the library on the page gets
// two distinct DigitizerError classes, so `instanceof` is false across them.
// This is that error: same shape, unrelated class.
class ForeignDigitizerError extends Error {
  readonly code: string
  readonly cause?: unknown

  constructor(code: string, message: string, cause?: unknown) {
    super(message)
    this.name = 'DigitizerError'
    this.code = code
    this.cause = cause
  }
}

describe('DIGITIZER_ERROR_CODES', () => {
  it('lists every code exactly once', () => {
    expect(new Set(DIGITIZER_ERROR_CODES).size).toBe(
      DIGITIZER_ERROR_CODES.length,
    )
  })

  it('recognises its own codes and nothing else', () => {
    for (const code of DIGITIZER_ERROR_CODES) {
      expect(isDigitizerErrorCode(code)).toBe(true)
    }
    expect(isDigitizerErrorCode('NOT_A_CODE')).toBe(false)
    expect(isDigitizerErrorCode(undefined)).toBe(false)
  })
})

describe('isDigitizerErrorLike', () => {
  it('accepts a DigitizerError, its payload and a foreign copy of the class', () => {
    const error = new DigitizerError('ZIP_INVALID', 'broken zip')

    expect(isDigitizerErrorLike(error)).toBe(true)
    expect(isDigitizerErrorLike(toErrorPayload(error))).toBe(true)
    expect(
      isDigitizerErrorLike(new ForeignDigitizerError('ZIP_INVALID', 'broken')),
    ).toBe(true)
  })

  it('rejects anything without a known code and a message', () => {
    expect(isDigitizerErrorLike(new Error('plain'))).toBe(false)
    expect(isDigitizerErrorLike({ code: 'NOT_A_CODE', message: 'x' })).toBe(
      false,
    )
    expect(isDigitizerErrorLike({ code: 'ZIP_INVALID' })).toBe(false)
    expect(isDigitizerErrorLike(null)).toBe(false)
    expect(isDigitizerErrorLike('ZIP_INVALID')).toBe(false)
  })
})

describe('DigitizerError.from', () => {
  it('returns a DigitizerError untouched', () => {
    const error = new DigitizerError('EXPORT_FAILED', 'no writer')

    expect(DigitizerError.from(error, 'PROJECT_INVALID')).toBe(error)
  })

  it('keeps the code of an error that only matches by shape', () => {
    // INFO: the duplicate-bundle case, and the panel -> root re-normalisation
    // case: both would otherwise be rounded down to the fallback code.
    const payload = toErrorPayload(
      new DigitizerError('IMAGE_LOAD_FAILED', 'could not decode', 'raw'),
    )

    const error = DigitizerError.from(payload, 'PROJECT_INVALID')

    expect(error).toBeInstanceOf(DigitizerError)
    expect(error.code).toBe('IMAGE_LOAD_FAILED')
    expect(error.message).toBe('could not decode')
    expect(error.cause).toBe('raw')
  })

  it('falls back for an unrelated failure', () => {
    const cause = new Error('boom')

    const error = DigitizerError.from(cause, 'PROJECT_INVALID')

    expect(error.code).toBe('PROJECT_INVALID')
    expect(error.message).toBe('boom')
    expect(error.cause).toBe(cause)
  })

  it('prefers the fallback message when one is given', () => {
    const error = DigitizerError.from(undefined, 'PROJECT_INVALID', 'no file')

    expect(error.message).toBe('no file')
  })
})

describe('toErrorPayload', () => {
  it('carries the code, the message and the cause', () => {
    const cause = new Error('boom')

    expect(
      toErrorPayload(new DigitizerError('ZIP_INVALID', 'broken zip', cause)),
    ).toEqual({ code: 'ZIP_INVALID', message: 'broken zip', cause })
  })
})
