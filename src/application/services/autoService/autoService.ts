// INFO: The port between the digitizer and the server that runs the automatic
// features (axis Auto-place, Server Extraction). docs/design/auto-service.md.
//
// The digitizer never decides on its own whether those features exist: it
// asks the service which ones it may show (`capabilities()`), and shows only
// those. The decision — "is this user allowed to run MarkerNet / LineFormer"
// — is the server's, because only the server can make it in a way the user
// cannot edit.
//
// `calibrate()` / `extract()` resolve with the response body of the wpd-auto
// backend API (MIT, starrydata/wpd-auto `backend/README.md`) AS IS — the
// "wire" format, validated and converted by autoServiceWire.ts. A host that
// relays the requests through its own backend (e.g. as asynchronous jobs)
// therefore implements this interface by forwarding those bodies verbatim;
// it does not need to know anything about the digitizer's coordinates.

/** What a backend may allow. Unknown names in a capabilities answer are ignored. */
export const AUTO_FEATURES = ['auto_axis', 'markernet', 'lineformer'] as const
export type AutoFeature = (typeof AUTO_FEATURES)[number]

/** The extraction methods Server Extraction can ask for (wpd-auto `method`). */
export const EXTRACTION_METHODS = ['markernet', 'lineformer'] as const
export type ExtractionMethod = (typeof EXTRACTION_METHODS)[number]

export function isAutoFeature(value: unknown): value is AutoFeature {
  return (AUTO_FEATURES as readonly unknown[]).includes(value)
}

/**
 * One Server Extraction request, in the BACKEND's pixel convention (see
 * autoServiceWire.ts: pixel centres at integers). `area` is
 * `x0,y0,x1,y1`; omitted = the whole image.
 */
export interface ExtractionRequest {
  method: ExtractionMethod
  area?: { x0: number; y0: number; x1: number; y1: number }
  /** method-specific query parameters, e.g. `{ threshold: 0.4 }` */
  params?: Record<string, number>
}

export interface AutoService {
  /**
   * The features this user may see. Resolve `[]` (or reject) for "none":
   * the digitizer treats a rejection exactly like an empty list and shows
   * no error — see refreshAutoFeatures().
   */
  capabilities(): Promise<readonly string[]>
  /** POST the image to the calibration endpoint; resolve with its JSON body. */
  calibrate(image: Blob): Promise<unknown>
  /** POST the image to the extraction endpoint; resolve with its JSON body. */
  extract(image: Blob, request: ExtractionRequest): Promise<unknown>
}
