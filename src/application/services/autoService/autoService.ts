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

/**
 * What a backend may allow. Unknown names in a capabilities answer are ignored.
 *
 * INFO: `auto_axis_bar` (Auto-place of a bar plot, `POST /calibrate?plot=bar`)
 * is this digitizer's name; the wpd-auto backend does not send it yet
 * (docs/design/starryai-auto.md §10 Q7). `barnet` is the extraction method's
 * id, which the backend already lists when BarNet can run.
 */
export const AUTO_FEATURES = [
  'auto_axis',
  'auto_axis_bar',
  'markernet',
  'lineformer',
  'barnet',
] as const
export type AutoFeature = (typeof AUTO_FEATURES)[number]

/** The extraction methods Server Extraction can ask for (wpd-auto `method`). */
export const EXTRACTION_METHODS = ['markernet', 'lineformer', 'barnet'] as const
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

/**
 * Per-call options of calibrate / extract. A service that cannot cancel may
 * ignore `signal`: the digitizer drops an answer that arrives after it was
 * aborted (or after the image changed) either way.
 */
export interface AutoRequestOptions {
  /** aborted when the answer is no longer wanted (e.g. the image changed) */
  signal?: AbortSignal
}

/**
 * What kind of plot the image is (wpd-auto `POST /calibrate?plot=`). `bar`:
 * the backend reads the value (y) axis of a bar plot (BarRulerNet when it
 * has the weights, else the X-Y engine); `xy` (the default) sends no `plot`.
 */
export type CalibrationPlot = 'xy' | 'bar'

export interface CalibrationOptions extends AutoRequestOptions {
  /** default `xy`. A service that relays the request passes it on as `?plot=` */
  plot?: CalibrationPlot
}

export interface AutoService {
  /**
   * The features this user may see. Resolve `[]` (or reject) for "none":
   * the digitizer treats a rejection exactly like an empty list and shows
   * no error — see refreshAutoFeatures().
   */
  capabilities(): Promise<readonly string[]>
  /** POST the image to the calibration endpoint; resolve with its JSON body. */
  calibrate(image: Blob, options?: CalibrationOptions): Promise<unknown>
  /** POST the image to the extraction endpoint; resolve with its JSON body. */
  extract(
    image: Blob,
    request: ExtractionRequest,
    options?: AutoRequestOptions,
  ): Promise<unknown>
  /**
   * Optional: the body of `GET /extract/methods` (which methods run right
   * now, why not, their licences, and `auto`, the supported hours). A
   * service without it simply shows no such details.
   */
  methods?(): Promise<unknown>
  /** Optional: the body of `GET /auto/status` (`{ auto: {...} }`). */
  status?(): Promise<unknown>
  /**
   * Optional: the body of `GET /components` — the engines, models and tools
   * behind the automatic features with their versions (wpd-auto
   * docs/components.md). Read only for the developers' "Components" list;
   * a service without it shows no such list.
   */
  components?(): Promise<unknown>
  /**
   * Optional: POST `body` (JSON `{ image: base64, series: [...] }`, built by
   * buildLegendRequest() in autoServiceWire.ts) to the legend reader
   * (`POST /legend`) and resolve with its JSON body as is. A service without
   * it simply names no drafts from the legend; the digitizer treats a
   * rejection the same way (quietly).
   */
  legend?(body: unknown, options?: AutoRequestOptions): Promise<unknown>
}
