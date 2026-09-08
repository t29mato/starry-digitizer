// INFO: The core-only host page (core.html). It drives the digitizer engine
// with NO user interface from the library at all: the only import in this file
// is `starry-digitizer/core`.
//
// Explicitly NOT imported here, and that is the point of the page:
//   - `vue`                        (no renderer, no component, no vnode)
//   - `starry-digitizer`           (the default entry pulls the components in)
//   - `starry-digitizer/vue`       (same)
//   - `starry-digitizer/styles`    (there is no library UI to style)
//
// The sibling page (index.html + main.ts + mountDigitizer.ts) is the other
// half of the story: the full component mounted from a non-Vue host. This one
// shows the engine underneath it.

import {
  addAxisCoord,
  addPoint,
  applyImage,
  clearAxisSetCoords,
  createDigitizerContext,
  effect,
  extractPoints,
  getDatasetValues,
  setAxisValues,
  type DigitizerContext,
} from 'starry-digitizer/core'

// ---------------------------------------------------------------------------
// The calibration this page uses, in ORIGINAL IMAGE pixel coordinates.
// ---------------------------------------------------------------------------
// INFO: axis coordinates and point coordinates both live in the image's own
// pixel space (the library's canvas component divides the click position by
// canvasHandler.scale before it gets here), so a host that plots
// programmatically never has to know the zoom.
//
// The numbers are chosen so the expected physical values are exact:
//   x: 100px -> 0, 1100px -> 100   (10px per unit)
//   y: 900px -> 0,  100px -> 200   (4px per unit, y grows upwards)
// which puts the sample point at (600, 500) px on exactly (50, 100).
const ORIGIN_PX = { xPx: 100, yPx: 900 }
const OPPOSITE_PX = { xPx: 1100, yPx: 100 }
const AXIS_VALUES = { x1: 0, x2: 100, y1: 0, y2: 200 }
const SAMPLE_POINT_PX = { xPx: 600, yPx: 500 }

const $ = <T extends HTMLElement>(selector: string): T =>
  document.querySelector<T>(selector)!

const status = $('#status')
const values = $('#values')
const pointCount = $('#point-count')
const calibration = $('#calibration')
const imageSize = $('#image-size')
const effectRuns = $('#effect-runs')

const ctx: DigitizerContext = createDigitizerContext()

// ---------------------------------------------------------------------------
// 1. Host-owned canvases
// ---------------------------------------------------------------------------
// INFO: the engine needs a browser 2D context; it does not need a UI framework
// to obtain one. These four elements belong to core.html and are lent to the
// engine here. `wrapper` is what drawFitSizeImage() measures. Attaching FIRST
// is the rule (core.html gives the wrapper a definite 600x420), but a host
// whose frame is sized by flex may still hand the image over before the frame
// has a height: the engine then postpones the fit, reports it through
// `canvasHandler.hasPendingFitSize`, and re-runs it itself once the wrapper it
// was lent gets a size. No observer is owed by the host.
ctx.canvasHandler.attachCanvases({
  wrapper: $<HTMLDivElement>('#canvasWrapper'),
  imageCanvas: $<HTMLCanvasElement>('#imageCanvas'),
  maskCanvas: $<HTMLCanvasElement>('#maskCanvas'),
  tempMaskCanvas: $<HTMLCanvasElement>('#tempMaskCanvas'),
})

// ---------------------------------------------------------------------------
// 2. Reactivity without Vue's renderer
// ---------------------------------------------------------------------------
// INFO: this is the part a non-Vue host most needs to see. `effect` is
// re-exported by `starry-digitizer/core` from @vue/reactivity — the same
// package Vue itself depends on, but without any of the rendering machinery.
// The callback below runs once immediately and then again on every engine
// mutation it read, and it updates plain text nodes. React/Svelte hosts do the
// same thing with setState / a store write instead.
let runs = 0
effect(() => {
  const dataset = ctx.datasetRepository.activeDataset
  const axisSet = ctx.axisSetRepository.activeAxisSet

  pointCount.textContent = String(dataset.points.length)
  calibration.textContent = axisSet.nextAxis
    ? `incomplete (next: ${axisSet.nextAxis.name})`
    : `x ${axisSet.x1.value}..${axisSet.x2.value} / y ${axisSet.y1.value}..${axisSet.y2.value}`

  // INFO: proves the read-out was recomputed rather than merely written once.
  runs += 1
  effectRuns.textContent = String(runs)
})

// ---------------------------------------------------------------------------
// 3. The steps, each on its own button
// ---------------------------------------------------------------------------

/** Hosts fetch the (possibly signed) image URL themselves and pass a Blob. */
async function fetchSample(): Promise<Blob> {
  const response = await fetch('/sample_graph_curve.png')
  if (!response.ok) throw new Error(`fetch failed: ${response.status}`)
  return await response.blob()
}

async function loadSample(): Promise<void> {
  status.textContent = 'loading…'
  // INFO: applyImage() decodes the blob, draws it and fits it to the wrapper —
  // all through the canvas handler, none of it through a component.
  await applyImage(ctx, await fetchSample())
  imageSize.textContent = `${ctx.canvasHandler.originalWidth}x${ctx.canvasHandler.originalHeight}`
  status.textContent = 'image loaded'
}

function calibrate(): void {
  // INFO: every step goes through a core operation rather than through the
  // repository into the domain model, so each one is undoable. addAxisCoord()
  // throws a DigitizerError('AXIS_SET_ALREADY_CALIBRATED') on a third call,
  // which is why the calibration is cleared first.
  clearAxisSetCoords(ctx)
  // INFO: in the default 2-points mode the first coordinate defines x1 AND y1,
  // and the second defines x2/y2 (and the x2y2 corner) — exactly what the two
  // clicks on the figure would do.
  addAxisCoord(ctx, ORIGIN_PX)
  addAxisCoord(ctx, OPPOSITE_PX)
  // INFO: the values go through the core operation rather than the four
  // setters, so the whole batch is one undo entry.
  setAxisValues(ctx, AXIS_VALUES)
  status.textContent = 'calibrated'
}

function plotSamplePoint(): void {
  // INFO: NOT `historyManager.capture()` + `activeDataset.addPoint()`. Plotting
  // is three mutations — the point, ending any axis-marker edit, and
  // registering the point as an interpolation anchor — and only the operation
  // carries all three. Omitting the last one is silent: confirmInterpolation()
  // would refuse forever without raising anything.
  addPoint(ctx, SAMPLE_POINT_PX)
  status.textContent = 'point added'
}

function extract(): void {
  try {
    // INFO: automatic extraction. It reads pixels through the `PixelSource`
    // port — the canvas handler is passed as that port inside extractPoints —
    // so the algorithm itself has no DOM dependency.
    extractPoints(ctx)
    status.textContent = `extracted ${ctx.datasetRepository.activeDataset.points.length} points`
  } catch (error) {
    status.textContent = `extraction failed: ${String(error)}`
  }
}

function clearPoints(): void {
  ctx.historyManager.capture()
  ctx.datasetRepository.activeDataset.clearPoints()
  status.textContent = 'points cleared'
}

function printValues(): void {
  const datasets = getDatasetValues(
    ctx.axisSetRepository,
    ctx.datasetRepository,
    ctx.valueFormat.effectiveDigits,
  )
  values.textContent = JSON.stringify(datasets, null, 2)
}

$('#load-sample').addEventListener('click', () => {
  void loadSample().catch((error) => {
    status.textContent = `load failed: ${String(error)}`
  })
})
$('#calibrate').addEventListener('click', calibrate)
$('#add-point').addEventListener('click', plotSamplePoint)
$('#extract').addEventListener('click', extract)
$('#clear-points').addEventListener('click', clearPoints)
$('#get-values').addEventListener('click', printValues)
