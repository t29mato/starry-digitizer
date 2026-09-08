# Starry Digitizer

[![codecov](https://codecov.io/gh/t29mato/starry-digitizer/graph/badge.svg?token=96EJTIFL79)](https://codecov.io/gh/t29mato/starry-digitizer)

A web-based plot digitizer tool for extracting data points from graph images. Developed as part of the [Starrydata project](https://starrydata.org/) for building an open database of materials science data.

## Features

- **Image Upload**: Load graph images (PNG, JPG, etc.) for digitization
- **Axis Calibration**: Define X and Y axes with linear or logarithmic scales
- **Manual Point Extraction**: Click on data points to extract coordinates
- **Auto Point Detection**: Automatically detect data points by color
- **Multiple Datasets**: Manage multiple datasets with different colors
- **Magnifier**: Zoom in for precise point placement
- **Data Export**: Export extracted data as CSV or JSON
- **Project Save/Load**: Save and restore your work

## Quick Start

### Online Demo

Visit [https://t29mato.github.io/starry-digitizer/](https://t29mato.github.io/starry-digitizer/) to try the tool.

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Usage

1. **Load Image**: Upload a graph image using the image upload button
2. **Set Axes**: Click "Edit Axes" and define axis points:
   - Set X1, X2 points on the X-axis with their values
   - Set Y1, Y2 points on the Y-axis with their values
   - Choose linear or logarithmic scale for each axis
3. **Extract Points**:
   - **Manual**: Click on data points in the graph
   - **Auto**: Use color-based auto-detection for bulk extraction
   - **Selection Area**: The Pen / Box / Eraser tools restrict auto-detection to
     a region. Turning the active mask tool off restores the manual mode
     (Add / Edit / Delete) that was on before it was turned on.
4. **Export**: Download your data as CSV or JSON

## Using as a library (Vue 3 component)

Starry Digitizer is published to npm as a Vue 3 component, so a host application can
embed the digitizer directly instead of linking out to the standalone app.

This section is the API reference. For the integration concepts — what the host is
responsible for, how to pass images, how to save/restore state, using it from a
non-Vue host — see the [embedding guide](docs/embedding.rst) (also published at
https://starrydigitizer.readthedocs.io/).

### Install

The package is **not published to npm**. Build a tarball from this repository and
install it from a path (see the host's own docs for where to keep it):

```bash
git clone https://github.com/t29mato/starry-digitizer && cd starry-digitizer
yarn install
npm pack            # `prepack` runs the library build → starry-digitizer-<version>.tgz
```

```bash
# in the host application
npm install /path/to/starry-digitizer-<version>.tgz
```

Committing that tarball into the host repository keeps installs reproducible
(npm records its integrity hash) and works inside a Docker build with no network
access. A `git+ssh://github.com/t29mato/starry-digitizer#<sha>` dependency also
works — the `prepare` script builds the library on install.

`vue` (^3.3) and `@vue/reactivity` (^3.3) are the peer dependencies. Only
`@vue/reactivity` is always required — it is the engine's change-notification
mechanism — so `vue` is declared optional (`peerDependenciesMeta`) for hosts that
import `starry-digitizer/core` alone. A Vue host installs nothing extra: the `vue`
package depends on `@vue/reactivity` and re-exports the same functions, so both
resolve to one copy. Which entry needs which is in "Choosing an entry point"
below.

The component brings its own minimal UI (plain Vue + scoped CSS, inline SVG
icons) — no Vuetify, no icon font, no table library — so it does not care which
UI framework the host uses. Runtime dependencies installed automatically:
`jszip`, `curve-interpolator`, `tesseract.js` (lazy-loaded).

Import the library stylesheet once (anywhere in the app) — the same single import
whichever entry point you use; every rule in it is scoped under the
`.starry-digitizer` root class:

```ts
import 'starry-digitizer/styles'
```

Colors and typography can be themed through CSS custom properties, e.g.
`.starry-digitizer { --sd-primary: #1e3a5f; }`. There are 16 theme tokens: 13
for color and geometry (`--sd-primary`, `--sd-text`, `--sd-radius`, …) and the
three typography ones described under [Typography](#typography) below (see
`src/presentation/styles/base.scss` for the full list).

The library's own values for those tokens are declared on `:where(:root)`, which has
zero specificity. Three things follow:

- **Any host declaration wins**, whether it is on `:root`, on `.starry-digitizer`, or on
  something more specific. Load order does not matter.
- **Panels themed without a wrapper.** A host composing the panels itself (see
  `starry-digitizer/vue` below) does not have to wrap each panel in
  `.starry-digitizer` just to make the colors resolve. Note that the spacing
  utilities the panels use (`d-flex`, `pa-1`, …) *are* still scoped to that class,
  so a panel outside a wrapper keeps its colors but loses its padding.
- **Per-instance themes still work.** Declaring tokens on a wrapper themes that
  subtree only, so two digitizers on one page can look different.

Layout sizes are a separate group and stay on the wrapper — see
[Layout (CSS custom properties)](#layout-css-custom-properties). They describe one
instance's box, so they must not be hoisted to `:root`.

#### Typography

The three typography tokens default to `inherit`:

| Token | Default | Applied to |
|---|---|---|
| `--sd-font` | `inherit` | `font-family` of `.starry-digitizer` |
| `--sd-font-size` | `inherit` | `font-size` of `.starry-digitizer` |
| `--sd-line-height` | `inherit` | `line-height` of `.starry-digitizer` |

So out of the box the digitizer renders in whatever font, size and line height
the host page already uses; it brings no typeface of its own.

**Why.** The library is embedded inside other applications, and a region that
switches to its own font is the one thing that gives that away at a glance —
the user sees "a second app pasted into this page" before reading a word of it.
Inheriting removes the seam. Colors do not have this problem (the host is
expected to pick them), which is why only these three default to `inherit`.

A host that wants a specific look sets the tokens like any other:

```css
.starry-digitizer {
  --sd-font: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --sd-font-size: 14px;
  --sd-line-height: 1.4;
}
```

That is exactly what the standalone app does (`src/app-style.css`) to keep its
historical Roboto / 14px / 1.4 appearance.

Two consequences worth knowing:

- **Every size inside the library is relative.** All relative font sizes are
  `em`, never `rem` — the built `style.css` contains no `rem` at all — so the
  whole sheet scales with the inherited base size instead of resolving against
  the host page's `<html>`.
- **Dialogs and snackbars inherit from `<body>`, not from your container.**
  `SdDialog` and `SdSnackbar` are teleported to `<body>`; the teleported root
  still carries `.starry-digitizer` (so tokens and utilities apply), but with
  `--sd-font-size: inherit` it inherits the *body's* font, not the font of the
  container the panels sit in. With `body { font-size: 18px }` the dialog title
  (`1.25em`) measures 22.5px. A host that sets its typography on its own
  wrapper element rather than on `body` or `:root` will see the dialogs alone
  fall back to the body size — set the typography on `body`/`:root`, or set
  `--sd-font-size` explicitly.

### Choosing an entry point

The package has three entry points. They all ship in the same tarball; which one
you import decides how much of the library — and how much of Vue — you pull in.

| Entry | What it exports | Peer dependencies | Host it is for |
|---|---|---|---|
| `starry-digitizer` (default) | `<StarryDigitizer>` plus everything the other two entries export | `vue`, `@vue/reactivity` | Anything that wants the ready-made three-column editor. This is the surface the package always had — existing hosts need no change. |
| `starry-digitizer/vue` | The 13 panels, `provideDigitizerContext()` / `useDigitizerContext()` and the UI options (`provideDigitizerOptions()`, `createDigitizerOptions()`, `DEFAULT_OPTIONS`, `features`) | `vue`, `@vue/reactivity` | A Vue host that lays the panels out itself. |
| `starry-digitizer/core` | State (`createDigitizerContext()`), the operations that mutate it, `ProjectDTO` and the other DTOs, `DigitizerError`, the `PixelSource` port, the mode constants (`MANUAL_MODE`, `MASK_MODE`, `POINT_MODE`, `STYLE`), the history types (`HistoryChange`, `HistoryChangeType`, `HistoryChangeListener`), and `effect` / `computed` / `ref` / `stop` re-exported from `@vue/reactivity` | `@vue/reactivity` only | A host that is not written in Vue (React, Svelte, plain JavaScript), or that wants the engine with no UI at all. |

`starry-digitizer/core` never touches Vue's renderer. That is not a convention:
`scripts/lib-check.mjs` walks the built `core.js` / `core.cjs` and every module
they import, and fails the build if any of them imports `vue`, a `vue/*`
subpath or `@vue/runtime-*`. It runs on every `npm run lib-build`
(`npm run lib-check`), so the entry cannot quietly regain the renderer.

It does, however, **run in a browser, not in Node**: extraction needs a 2D
canvas context and loading an image needs the browser's image decoder. See
[docs/design/engine-boundary.md](docs/design/engine-boundary.md) for where the
boundary is drawn and why.

The panels (`ExtractorSettings`, `AxisSetManager`, …) are Vue components and
ship only in `starry-digitizer/vue`. There is no React or Svelte build of them:
a non-Vue host composes `core` with canvases and UI of its own.

Whichever entry you import, the stylesheet is the same single import — there is
one bundled stylesheet for the whole library:

```ts
import 'starry-digitizer/styles'
```

(A `core`-only host renders none of the library's UI and can skip it.)

#### `starry-digitizer` — drop the component in

```ts
import { StarryDigitizer } from 'starry-digitizer'
import 'starry-digitizer/styles'
```

Then place `<StarryDigitizer>` and drive it through props, events and template
ref methods — see the Usage, Props, Events and Methods sections below.

#### `starry-digitizer/vue` — compose the panels yourself

When the built-in three-column layout is not the arrangement you want, place the
panels yourself. Create one context, provide it, and render any subset — they
all read that context, so they stay in sync:

```vue
<script setup lang="ts">
import {
  createDigitizerContext, loadProject, getDatasetValues,
} from 'starry-digitizer/core'
import {
  provideDigitizerContext, provideDigitizerOptions,
  CanvasHeader, CanvasMain, CanvasFooter, AxisSetManager, AxisSetSettings,
  ExtractorSettings, MagnifierMain,
} from 'starry-digitizer/vue'
import 'starry-digitizer/styles'

const ctx = createDigitizerContext()
provideDigitizerContext(ctx)
provideDigitizerOptions({ datasetNameCandidates: sampleNames })

await loadProject(ctx, savedProject, imageBlob)
const values = getDatasetValues(ctx.axisSetRepository, ctx.datasetRepository, ctx.valueFormat.effectiveDigits)
</script>

<template>
  <div class="my-layout">
    <main><CanvasHeader /><CanvasMain /><CanvasFooter /></main>
    <aside><AxisSetManager /><AxisSetSettings /><ExtractorSettings /><MagnifierMain /></aside>
  </div>
</template>
```

##### Pass only what you want to change

`provideDigitizerOptions()` takes a **partial** set of options, `features`
included. Name the ones you care about; every other option, and every other
feature flag, keeps its default:

```ts
provideDigitizerOptions({ features: { magnifier: false } })
```

Do not build the object by spreading `DEFAULT_OPTIONS`. `features` is nested,
so `{ ...DEFAULT_OPTIONS, features: { magnifier: false } }` replaces the whole
feature set and drops the other nine flags — the axis panel, the dataset panel
and the data table go with the magnifier. `DEFAULT_OPTIONS` is there to read a
default from, not to build options with.

`createDigitizerOptions(partial)` does the same filling-in and returns a
complete `DigitizerOptions`. Reach for it when the host wants that object in
its own hands — to store it, to hand it around, to compare against. Providing
options to the panels does not need it.

##### Options that change after setup

Most hosts only know some of their options later: whether the user may edit at
all comes from a permission check, and the dataset name candidates come from a
fetch. `provideDigitizerOptions()` therefore also accepts a `ref`, a `computed`,
a `reactive()` object or a getter, and the panels follow every change — this is
what `<StarryDigitizer>` does with its own props internally. The panels still
read a plain `DigitizerOptions` (`options.readonly`, no `.value`), complete
whatever the source left out.

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { createDigitizerContext } from 'starry-digitizer/core'
import {
  provideDigitizerContext, provideDigitizerOptions,
  CanvasHeader, CanvasMain, CanvasFooter, DatasetManager,
} from 'starry-digitizer/vue'

const canEdit = ref(false)
const sampleNames = ref<string[]>([])

provideDigitizerContext(createDigitizerContext())
provideDigitizerOptions(
  computed(() => ({
    readonly: !canEdit.value,
    datasetNameCandidates: sampleNames.value,
    features: { imageUpload: false },
  })),
)

// Both reach the panels when they resolve: the point/axis editing unlocks and
// the dataset name field turns into a combobox, with no remount.
canEdit.value = await fetchEditPermission()
sampleNames.value = await fetchSampleNames()
</script>
```

A `reactive()` object works the same way, if the host would rather assign
single fields (`options.readonly = false`) than replace the whole object.

Every name above is also re-exported from `starry-digitizer`, so importing all
of it from the package root works exactly as before; the two subpaths only let
you say which half you mean.

Exported panels: `CanvasHeader`, `CanvasMain`, `CanvasFooter`, `AxisSetManager`,
`AxisSetSettings`, `DatasetManager`, `DataTable`, `ExtractorSettings`,
`ImageSettings`, `MaskSettings`, `ColorSettings`, `MagnifierMain`,
`ConfirmerBar`.

Notes:

- `CanvasMain` owns the canvas elements and must be mounted for anything that
  draws; `MagnifierMain` attaches the magnifier canvas.
- Options are optional: without `provideDigitizerOptions()` the panels fall
  back to `DEFAULT_OPTIONS`. Pass them reactively when they change after setup
  (see above).
- Only one set of canvases may exist per context, so render `CanvasMain` once
  per context.

##### Replacing the dataset list

A host that wants its own dataset list (its own table, its own row actions)
should drop `DatasetManager` and drive the engine through the dataset use
cases instead of writing the repository calls by hand. Each one takes the
context as its first argument:

```ts
import {
  activateDataset,   // (ctx, id)  switch the active dataset
  addDataset,        // (ctx)      append a row on the active axis set, activate it
  removeDataset,     // (ctx, id)  delete one row
  removeAllDatasets, // (ctx)      delete every row (the engine leaves one fresh row)
  clearDatasetPoints,// (ctx, id)  empty one row, keep the row
  viewAllDatasets,   // (ctx)      show every dataset at once (activeDatasetId 0)
} from 'starry-digitizer/core'

activateDataset(ctx, 2)
```

They are not thin wrappers — each one carries clean-up that is easy to miss
and expensive to get wrong:

- **The order inside `activateDataset()` is part of the specification.** The
  interpolation preview is cleared *before* `setActiveDataset()`, never after.
  `Interpolator.clearPreview()` always operates on
  `datasetRepository.activeDataset`: it drops that dataset's temp points **and
  deletes every id in its `manuallyAddedPointIds`**. Run after the switch, it
  would delete the manually-added points of the dataset being switched *to*.
  Do not reorder these calls in your own code, and do not call
  `datasetRepository.setActiveDataset()` directly when interpolation may be on.
- Switching rows adopts the new row's axis set and clears the mask. The mask
  belongs to the row it was painted for; left up, the next extraction runs
  inside the previous row's region and is calibrated against the previous
  row's axes.
- Deleting the *active* row is also a switch — `removeDataset()` promotes a
  neighbouring row by itself — so it owes the same clean-up. `removeDataset()`
  applies it only when the active row actually changed; `removeAllDatasets()`
  always applies it, because the surviving row is a brand-new one even when
  its id is still `1`.
- `clearDatasetPoints()` only clears the preview when the target row *is* the
  active one, so emptying row B cannot take row A's points with it.
- The undo snapshot (`historyManager.capture()`) is taken inside
  `addDataset`, `removeDataset`, `removeAllDatasets` and `clearDatasetPoints`.
  You do not call `capture()` yourself for these. (`activateDataset` and
  `viewAllDatasets` change no data and take no snapshot.)
- They are safe to call before `CanvasMain` is mounted: the mask clear is
  guarded by `canvasHandler.hasCanvases`.

**Confirmation dialogs are yours.** These functions always do what they are
told — no `window.confirm`, no wording, no i18n. The built-in panel asks
before discarding unconfirmed interpolated points, before deleting a row that
has points, and before deleting all datasets; a host that replaces the panel
decides its own policy and then calls the function.

```ts
function onDeleteRow(dataset: DatasetInterface) {
  if (dataset.points.length > 0 && !confirm(`Delete '${dataset.name}'?`)) return
  removeDataset(ctx, dataset.id)
}
```

##### Replacing the extraction panel or the point overlay

The four operations that add, replace or remove points come as use cases for
the same reason: they carry the undo snapshot, so a host that builds its own
"Run" button, its own Confirm or its own point overlay keeps ⌘Z working.

```ts
import {
  addPoint,             // (ctx, coord)   plot one point on the active dataset -> its id
  extractPoints,        // (ctx)          run the current algorithm, replace the dataset's points
  confirmInterpolation, // (ctx)          turn the preview into real points, consume the anchors
  deletePoint,          // (ctx, pointId) delete one point of the active dataset
} from 'starry-digitizer/core'

addPoint(ctx, { xPx: 600, yPx: 500 }) // original-image pixels
```

- **`addPoint()` is three mutations, not one**, and this is the one to go
  through rather than hand-write. Besides the point and the undo snapshot it
  ends any axis-marker edit (so an arrow key afterwards nudges the point, not
  the axis) and registers the point as an **interpolation anchor**. Skipping
  that last step is silent: `confirmInterpolation()` refuses while there are
  fewer than two anchors and reports the refusal as a `false`, so interpolation
  is permanently unusable with no error raised anywhere. It returns the new
  point's id.
  `coord` is in **original image pixels** — divide a click position by
  `canvasHandler.scale` first. Whether plotting is allowed at all (readonly,
  view-all, an active mask tool), whether the coordinate is inside the image,
  and refreshing the interpolation preview afterwards stay with the caller.
- `extractPoints()` runs the algorithm **before** taking the snapshot, so a
  failing extraction (no image, no mask match) throws and leaves the history
  untouched instead of adding an entry that undoes nothing.
- `confirmInterpolation()` returns `false` — captures and mutates nothing —
  when there are fewer than two anchor points. The wording of "point at least
  two" is yours, the same way the confirmation dialogs are.
- `deletePoint()` ignores an id that is not in the active dataset, and refreshes
  the interpolation preview when interpolation is on.

##### Driving the calibration

The axis-set use cases mirror the axis panels, and `addAxisCoord()` is the one
that replaces the two clicks on the figure:

```ts
import {
  addAxisCoord,        // (ctx, coord)   place the next calibration coordinate
  setAxisValues,       // (ctx, values)  overwrite x1/x2/y1/y2 in one undo entry
  clearAxisSetCoords,  // (ctx)          throw the calibration away
  setPointMode,        // (ctx, mode)    POINT_MODE.TWO_POINTS / FOUR_POINTS
  setLogScale,         // (ctx, axis, v) 'x' | 'y' to/from logarithmic
  setConsiderGraphTilt,// (ctx, value)   tilt correction
  activateAxisSet, addAxisSet, removeAxisSet,
} from 'starry-digitizer/core'

addAxisCoord(ctx, { xPx: 100, yPx: 900 }) // in TWO_POINTS: x1 AND y1
addAxisCoord(ctx, { xPx: 1100, yPx: 100 }) // x2y2, and x2 / y2 derived from it
setAxisValues(ctx, { x1: 0, x2: 100, y1: 0, y2: 200 })
```

**How many axes one `addAxisCoord()` call consumes depends on the point mode**,
and nothing in the signature says so. `activeAxisSet.nextAxis` names the axis
the next call will fill and is `null` once the set is complete.

| Mode | Call | Fills |
|---|---|---|
| `TWO_POINTS` (default) | 1st | `x1` **and** `y1` |
| | 2nd | `x2y2`, and `x2` / `y2` derived from it (the rectangle is not clicked) |
| `FOUR_POINTS` | 1st–4th | one axis each, in the order `nextAxis` reports: `x1`, `x2`, `y1`, `y2` |

A call on a set that is already complete throws
`DigitizerError` with code `AXIS_SET_ALREADY_CALIBRATED` and captures nothing;
call `clearAxisSetCoords(ctx)` to start the calibration over.

#### `starry-digitizer/core` — non-Vue hosts

`core` is the engine without any UI: the same state, operations and DTOs the
component uses internally, plus `effect()` to subscribe to them. The host owns
the canvas elements and the rendering.

```ts
import {
  createDigitizerContext, applyImage, getDatasetValues, effect, stop,
} from 'starry-digitizer/core'

const ctx = createDigitizerContext()

// The engine draws into canvases the host owns; hand them over once.
ctx.canvasHandler.attachCanvases({
  wrapper, imageCanvas, maskCanvas, tempMaskCanvas,
})

await applyImage(ctx, imageBlob)

// Runs now, and again whenever anything it read has changed.
const runner = effect(() => {
  renderMyOwnTable(getDatasetValues(ctx))
})

// on teardown — `effect()` returns a runner that re-runs the effect when
// called, so unsubscribing goes through `stop(runner)`, not `runner()`.
stop(runner)
```

Notes:

- **Browser only.** `core` does not need a DOM tree — the canvases are handed
  in — but it does need a 2D canvas context and the browser's image decoder, so
  it is not a Node package.
- **`attachCanvases()` before `applyImage()`, and give the wrapper a size.**
  The fit-to-frame is measured off the wrapper, so an image applied while the
  wrapper has no layout (0px high — the normal case for one frame when flex
  sizes the frame) cannot be fitted yet. This does **not** fail loudly: the
  promise resolves, `originalWidth` / `originalHeight` are right, and the canvas
  is blank. The engine handles it for you — it observes the wrapper you lend it
  and re-runs the fit as soon as the frame is measured — so a host owes no
  `ResizeObserver` of its own. Read `canvasHandler.hasPendingFitSize` to know
  the scale is not final yet (a host drawing its own overlay wants that). A
  zoom the user picked (`scaleUp` / `scaleDown` / `drawOriginalSizeImage`)
  clears the pending fit, so a later layout change never overrides it.
  `detachCanvases(['wrapper'])` disconnects the observer.
- Change notification is `@vue/reactivity`, re-exported here so the host can
  subscribe without importing it itself: `effect`, `stop`, `computed`, `ref`,
  `reactive`, `readonly`, `effectScope`, and the usual guards (`isReactive`,
  `isRef`, `unref`, `toRaw`, `markRaw`).

  **If you have not used it before, four rules cover everything this engine
  needs.** There is no subscribe-to-this-field call and no event names — an
  effect subscribes to whatever it happens to read while it runs.

  1. **`effect(fn)` runs `fn` immediately**, and again whenever any state it
     READ during that run changes. So the initial render is free: you do not
     call your renderer once and then subscribe.
  2. **Read inside the effect, not outside.** Only property reads that happen
     while `fn` is running are tracked. Hoisting a read out of the effect —
     `const datasets = getDatasetValues(ctx)` above the `effect(...)` — is the
     mistake that makes an effect fire once and never again.
  3. **The dependency set is recomputed on every run.** An effect that reads
     `ctx.datasetRepository.activeDataset` follows the ACTIVE dataset: switch
     datasets and the next run subscribes to the new one and drops the old.
     A branch that was not taken this run is not subscribed to.
  4. **`effect()` returns a runner, and `stop(runner)` unsubscribes.** Calling
     `runner()` re-runs the effect instead — that is the one API shape here
     that reads backwards. Stop every effect when the host unmounts, or use
     `effectScope()` and stop the scope.

  Effects run synchronously, once per mutation, so a burst of clicks means a
  burst of runs. Debounce inside the effect if the work is expensive — the
  component's own `update:project` is debounced by 300 ms for this reason.
  Effects also see intermediate states: an operation that mutates two things
  fires the effect twice. Nothing in the engine is corrupt in between, but a
  host that persists on every run will write twice.

  ```ts
  import { effect, stop, getDatasetValues } from 'starry-digitizer/core'

  // ✅ reads inside — re-runs on every point, axis value and digit change
  const runner = effect(() => render(getDatasetValues(ctx)))

  // ❌ reads outside — the effect reads nothing, so it never runs again
  const datasets = getDatasetValues(ctx)
  effect(() => render(datasets))

  stop(runner)
  ```
- `watch` is **not** re-exported. It only became part of `@vue/reactivity` in
  Vue 3.5 and the supported peer range starts at 3.3; use `effect` (or `vue`'s
  own `watch`, in a Vue host).
- **`@vue/reactivity` must resolve to a single copy in the host — this is the
  one setup mistake that breaks the component silently.** The engine's state is
  wrapped with `reactive()` from `@vue/reactivity`, while the components track
  their dependencies through the copy bundled in `vue`. Two copies means two
  independent dependency graphs: every click still lands in the project (a
  `getProject()` dump shows the axes and the points), but nothing re-renders —
  no axis markers, no plotted points, no mode switch. There is no error and no
  warning. A normal `npm install` from the registry deduplicates on its own;
  what splits them is a nested or linked install — most often a `file:` /
  `link:` dependency, whose bare imports resolve against ITS own
  `node_modules`. Deduplicate explicitly when that is your setup:

  ```js
  // vite.config.ts
  export default defineConfig({
    resolve: { dedupe: ['vue', '@vue/reactivity'] },
  })
  ```

  webpack calls it `resolve.alias` to a single path; pnpm users want
  `public-hoist-pattern` or a workspace-level version pin. To check from the
  host, compare the two implementations directly:

  ```js
  import { reactive } from 'vue'
  import { reactive as coreReactive } from '@vue/reactivity'
  console.assert(reactive === coreReactive, 'two copies of @vue/reactivity')
  ```
- Drive modes with the exported constants rather than bare numbers:
  `canvasHandler.setManualMode(MANUAL_MODE.ADD)`,
  `canvasHandler.setMaskMode(MASK_MODE.PEN)`,
  `axisSet.pointMode = POINT_MODE.FOUR_POINTS`. `STYLE` holds the marker sizes
  and opacities the built-in canvas layers draw with, for a host that renders
  its own overlay and wants it to match.

##### `effect` tracks what the function reads, nothing else

This is the one thing to get right, because getting it wrong looks like "the
library stopped notifying me". `effect(fn)` runs `fn` immediately, records the
reactive properties `fn` actually touched during that run, and re-runs `fn`
when one of *those* changes. It is not "notify me when anything in the context
changes": a property the callback never read is a property the callback is not
subscribed to. Two consequences:

- Read everything you want to react to **inside** the effect. Reading it before
  the `effect()` call, or behind an `if` that was false on the first run,
  subscribes to nothing.
- Keep the effect narrow. An effect that reads only the values it renders will
  not re-run when an unrelated part of the state moves.

```ts
// Re-runs on point/axis changes, because getDatasetValues() reads them.
effect(() => render(getDatasetValues(ctx.axisSetRepository, ctx.datasetRepository, 4)))

// Does NOT re-run on anything: the read happened before the effect started.
const values = getDatasetValues(ctx.axisSetRepository, ctx.datasetRepository, 4)
effect(() => render(values))
```

##### Bridging to React (`useSyncExternalStore`)

`effect` gives you the two halves `useSyncExternalStore` wants: a `subscribe`
that returns an unsubscribe function, and a snapshot getter. Note that the
first `effect()` run happens synchronously inside `subscribe`, so skip it —
React has the snapshot already — and return `stop` as the teardown.

```ts
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  effect, stop, getDatasetValues,
  type DigitizerContext, type DatasetValues,
} from 'starry-digitizer/core'

function useDatasetValues(ctx: DigitizerContext): DatasetValues[] {
  const read = useCallback(
    () =>
      getDatasetValues(
        ctx.axisSetRepository,
        ctx.datasetRepository,
        ctx.valueFormat.effectiveDigits,
      ),
    [ctx],
  )

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      let first = true
      // INFO: read() inside the effect — that read is what subscribes.
      const runner = effect(() => {
        read()
        if (first) { first = false; return }
        onStoreChange()
      })
      return () => stop(runner)
    },
    [read],
  )

  // INFO: getSnapshot must return a stable value between changes, so cache the
  // array and only replace it when the effect above says something moved.
  const cache = useMemo(() => ({ value: read() }), [read])
  return useSyncExternalStore(
    (onStoreChange) =>
      subscribe(() => { cache.value = read(); onStoreChange() }),
    () => cache.value,
  )
}
```

The same shape works for any single value — `ctx.historyManager.canUndo`,
`ctx.canvasHandler.scale`, `ctx.datasetRepository.activeDataset.id`. For
"a capture just happened", which is an event rather than a value, use
`ctx.historyManager.subscribe()` instead (see
[The "single undo stack" recipe](#the-single-undo-stack-recipe)).

### Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { StarryDigitizer, type ProjectDTO } from 'starry-digitizer'
import 'starry-digitizer/styles'

const digitizer = ref<InstanceType<typeof StarryDigitizer>>()
const image = ref<Blob>()
const project = ref<ProjectDTO>()
const sampleNames = ref<string[]>([])

const save = debounce((p: ProjectDTO) => api.putDigitizerProject(figureId, p), 2000)

async function commit() {
  const values = digitizer.value!.getDatasetValues()
  await api.putCurves(figureId, values.map((v) => ({
    samplename: v.name,
    sampleid: v.externalId,
    data: v.points,
  })))
}
</script>

<template>
  <StarryDigitizer
    ref="digitizer"
    :image="image"
    v-model:project="project"
    :dataset-name-candidates="sampleNames"
    :features="{ imageUpload: false, zipExportImport: false }"
    @update:project="save"
    @error="onError"
  />
</template>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `image` | `Blob \| string` | — | Image to digitize. A `Blob`/`File` is recommended; a data URL or an `http(s)` URL also works (URLs are fetched with `credentials: 'include'` to avoid tainting the canvas). |
| `project` | `ProjectDTO` | — | Work state to restore. Omitted means an empty project. |
| `readonly` | `boolean` | `false` | View only. No point/axis/dataset edits, no extraction, no undo/redo. |
| `datasetNameCandidates` | `string[]` | `[]` | When non-empty, the dataset name field becomes a combobox of these candidates (free text still allowed). |
| `features` | `Partial<StarryDigitizerFeatures>` | see below | Hides UI the host does not need. |
| `assetBaseUrl` | `string` | — | Base URL for the tesseract.js worker / core / language files. |
| `confirmImageReplace` | `boolean` | `true` | Ask before replacing an image that already has axes/points. |
| `confirm` | `ConfirmDialog` | `DEFAULT_CONFIRM` (`window.confirm`) | Dialog used for every "are you sure?" the digitizer asks. See [Confirmation dialogs](#confirmation-dialogs-confirm). |
| `updateDebounceMs` | `number` | `300` | Debounce for `update:project` / `change`. |
| `effectiveDigits` | `number` | `4` | Significant digits the extracted values are rounded to (1–10). Overrides the in-app "Effective digits" field, so pass it when you hide the data table (`features.dataTable: false`) or want to own the precision. |

`image` and `project` are watched: assigning new values re-initializes the component,
so the same `<StarryDigitizer>` can be reused when switching figures. `effectiveDigits`
is watched too and applies immediately, so a host can drive it from its own control.

### `features` defaults

| Feature | Default | Notes |
|---|---|---|
| `imageUpload` | `true` only when `image` is **not** given | When the host supplies the image, it also owns image changes. |
| `zipExportImport` | `true` only when neither `image` nor `project` is given | Embedded hosts save through their own API, not ZIP files. |
| `csvExport` | `true` | "Copy to clipboard" buttons. |
| `axisOcr` | `true` | The "Auto-fill values (OCR)" button in the axis panel. Turn it off to drop OCR entirely: the tesseract.js worker, wasm core and English language data are ~11MB, and they are only reachable through that button. Hosts whose Content-Security-Policy forbids external origins **must** either serve those files themselves (`assetBaseUrl`) or set this to `false` — otherwise the button is there, is pressable, and fails every time, because tesseract.js falls back to its own CDN URLs. |
| `axisPanel` | `true` | The axis-set list and its calibration panel. |
| `datasetPanel` | `true` | The dataset list. Turn it off when the host already has its own picker for the same thing. |
| `extractionPanel` | `true` | Manual / automatic extraction. |
| `magnifier` | `true` | The magnifier. |
| `dataTable` | `true` | The table of extracted values. |
| `keyboardShortcuts` | `true` | The default the three `keyboard*` groups below fall back to; it owns no key of its own. `false` alone still means what it always meant — the canvas listens for nothing, registers no listener, and drops out of the tab order. See [Keyboard shortcuts](#keyboard-shortcuts). |
| `keyboardHistory` | `keyboardShortcuts` | `⌘Z` / `⇧⌘Z` (undo / redo). Turn it off in a host that owns `⌘Z`: the digitizer then neither acts on the key nor calls `preventDefault()` on it, so the host's own listener is the only one that sees it. |
| `keyboardFile` | `keyboardShortcuts` | `⌘S` / `⌘O` (save / load project ZIP). Same nature as `keyboardHistory` — page-wide keys a host may want for its own save. `features.zipExportImport` still has to be on for either key to do anything. |
| `keyboardEditing` | `keyboardShortcuts` | The keys that belong to the focused widget: arrow-key nudges, `Backspace`/`Delete`, `Escape`, `⌘A`, zoom (`+` `-` `0` `f`) and the mode switches (`a` `e` `d`). They only fire while the canvas frame is focused or hovered, so they never compete with the host for a key — leave them on and you keep the point editing you would otherwise have to reimplement. |

The four `keyboard*` flags are the odd ones out: they hide no UI, they hand key
handling back to the host. Every other flag removes something from the screen.

**Precedence for the keyboard groups**, applied per group: an explicit
`keyboardHistory` / `keyboardFile` / `keyboardEditing` wins; otherwise
`keyboardShortcuts`; otherwise `true`. So `{}` leaves everything on,
`{ keyboardShortcuts: false }` turns everything off, and
`{ keyboardShortcuts: false, keyboardEditing: true }` gives the host `⌘Z`,
`⌘S` and `⌘O` while the canvas keeps its editing keys.

Any key you pass in `features` overrides the derived default.

The five panel flags (`axisPanel`, `datasetPanel`, `extractionPanel`,
`magnifier`, `dataTable`) only gate what `<StarryDigitizer>` renders — a host
composing the panels itself simply does not place the ones it does not want.
They stay useful for the middle ground: keeping the ready-made layout while
hiding one or two panels the host already provides. The other flags
(`imageUpload`, `zipExportImport`, `csvExport`, `axisOcr`, `keyboard*`) switch
behaviour inside individual panels and apply either way.

### Confirmation dialogs (`confirm`)

Every "are you sure?" the digitizer asks — deleting a dataset that has points,
deleting all datasets, removing an axis set, replacing an image that already has
work on it, discarding unconfirmed interpolated points — goes through one
function:

```ts
type ConfirmDialog = (message: string) => boolean | Promise<boolean>
```

`message` is the exact plain-text question (no markup). Resolve `true` to go
ahead, `false` to cancel; a synchronous host dialog may return a plain boolean.

The default is `DEFAULT_CONFIRM`, which calls `window.confirm`. It is a wrapper
rather than `window.confirm` itself so the lookup happens at call time — test
doubles (`cy.on('window:confirm')`, `jest.spyOn`) replace the property on
`window` after the module has been evaluated, and a captured reference would
keep calling the original.

Pass your own to ask in the host's own modal. A native dialog is the one thing
that immediately gives away that a second app is embedded in the page: the OS
chrome looks and sits nowhere near the host's own modals.

```vue
<StarryDigitizer :confirm="(message) => myModal.confirm(message)" />
```

Hosts composing the panels themselves pass it through the options
(`provideDigitizerOptions({ confirm })`) and should call their own confirmations
through `requestConfirmation(options, message)` rather than `options.confirm`
directly. Both are exported. `requestConfirmation` adds the failure handling:
if the host dialog throws or rejects, it warns and falls back to
`window.confirm` rather than silently dropping the action (answering `false`)
or silently performing a destructive one (answering `true`). Anything other
than a resolved `true` counts as "no".

### Slots

> **Root-only.** Slots exist to inject host content into `<StarryDigitizer>`'s
> three-column layout. A host that composes the panels itself (see "Composing
> the panels yourself") places its own markup directly and needs none of this.

| Slot | Where | Slot props |
|---|---|---|
| `aside-top` | Top of the left sidebar | `width` — the measured column width in px |
| `aside-bottom` | Bottom of the left sidebar | `width` |
| `right-sidebar-footer` | Bottom of the right sidebar | `width` |
| `footer` | Full width, below the three columns | — |

### Layout (CSS custom properties)

The component is a three-column flex layout. Every size is a custom property on
the `.starry-digitizer` root, so a host can adjust it without reaching into
internal class names.

Which ones still apply depends on how you embed:

| Property | Applies to |
|---|---|
| `--sd-height`, `--sd-left-sidebar-*`, `--sd-right-sidebar-*`, `--sd-main-area-margin` | **The root layout only.** They size `<StarryDigitizer>`'s three columns, so a host composing the panels itself sizes its own containers instead. |
| `--sd-canvas-height`, `--sd-canvas-min-height` | `CanvasMain` — applies wherever that panel is placed. |
| `--sd-magnifier-size` | `MagnifierMain` — likewise. |
| `--sd-table-max-height`, `--sd-axis-list-*`, `--sd-dataset-list-*` | The data table / axis-set list / dataset list panels — likewise. |
| The theme tokens (`--sd-primary`, `--sd-text`, …) | Everything, both ways of embedding. |


| Property | Default | Meaning |
|---|---|---|
| `--sd-height` | `auto` | Set to `100%` to make the digitizer fill a host pane of a known height instead of growing with its content. |
| `--sd-left-sidebar-width` / `--sd-right-sidebar-width` | `260px` / `300px` | Preferred column widths (`flex-basis`). |
| `--sd-left-sidebar-min-width` / `--sd-left-sidebar-max-width` | `200px` / `340px` | Bounds for the left column. Right column has the same pair. |
| `--sd-main-area-margin` | `10px` | Gap between the canvas column and the sidebars. |
| `--sd-canvas-height` | `80vh` | Canvas height when the parent has no height of its own. |
| `--sd-canvas-min-height` | `240px` | Floor for the canvas when the pane is short. |
| `--sd-table-max-height` | `30vh` | Height cap for the data table. |
| `--sd-magnifier-size` | `min(100%, 300px)` | Size of the (square) magnifier. It follows the right column by default, so narrowing that column narrows the magnifier too. |
| `--sd-axis-list-min-height` / `--sd-axis-list-max-height` | `8vh` / `20vh` | Bounds for the axis-set list. |
| `--sd-dataset-list-min-height` / `--sd-dataset-list-max-height` | `15vh` / `30vh` | Bounds for the dataset list. Set the min to `0` to let a short list take only the room it needs. |

The `min-width` of each column defaults to the same value as its width, so the
standalone layout never shrinks. Lower `--sd-left-sidebar-min-width` /
`--sd-right-sidebar-min-width` to allow narrower columns:

```css
.starry-digitizer {
  --sd-right-sidebar-width: 200px;  --sd-right-sidebar-min-width: 200px;
  --sd-left-sidebar-width: 210px;   --sd-left-sidebar-min-width: 210px;
  --sd-dataset-list-min-height: 0;  --sd-axis-list-min-height: 0;
}
```

#### Embedding in a fixed-height pane

To build a single-screen editor with no page scrolling, give the host pane a
definite height and hand it to the component:

```css
.digitize-pane { height: 100dvh; display: flex; min-height: 0; }
.digitize-pane .starry-digitizer { --sd-height: 100%; }
```

The canvas then takes whatever height is left over, and each sidebar scrolls
inside itself. `--sd-canvas-height` must stay a length (not `auto`): the fit
calculation reads the wrapper's measured height, so a content-driven height
would be circular.

### Events

| Event | Payload | When |
|---|---|---|
| `ready` | `{ version: string }` | Image and project finished loading. |
| `update:project` | `ProjectDTO` | Axes, points, datasets or view state changed (debounced). Usable as `v-model:project`. |
| `change` | `{ project: ProjectDTO, datasets: DatasetValues[] }` | Same moment as `update:project`, with physical values included. |
| `image-replaced` | `{ blob: Blob }` | The user replaced the image (only when `features.imageUpload` is true). |
| `history-change` | `HistoryChange` | The undo/redo stacks moved. Emitted **synchronously**, after the change. See [The "single undo stack" recipe](#the-single-undo-stack-recipe). |
| `error` | `{ code, message, cause? }` | Failures are emitted, never thrown or `alert()`-ed. |

```ts
type HistoryChangeType = 'capture' | 'undo' | 'redo' | 'clear'

interface HistoryChange {
  type: HistoryChangeType
  canUndo: boolean   // stack state AFTER the change
  canRedo: boolean   // stack state AFTER the change
}
```

`'capture'` means the user just did something undoable inside the digitizer.
`'undo'` / `'redo'` are normally the host's own calls coming back. `'clear'`
means the history was discarded (project load / `reset()`), and is emitted only
when there actually was history to discard — a notification always means the
undo/redo state changed.

Error codes (`DigitizerErrorCode`): `IMAGE_LOAD_FAILED`, `INVALID_IMAGE_TYPE`,
`DTO_VERSION_UNSUPPORTED`, `PROJECT_INVALID`, `ZIP_INVALID`, `EXPORT_FAILED`.

### Methods (template ref)

```ts
loadProject(project: ProjectDTO, image?: Blob | string): Promise<void>
getProject(): ProjectDTO
getDatasetValues(): DatasetValues[]
exportZip(): Promise<Blob>
reset(): void

// Undo history, for a host that owns ⌘Z itself
undo(): void
redo(): void
canUndo: boolean          // reactive; bind a menu item's :disabled to it
canRedo: boolean

context: DigitizerContext // the instance's state, for panels/effects
```

`canUndo` / `canRedo` are exposed as computeds, so they unwrap to plain
booleans on the template ref and stay reactive.

`getDatasetValues()` returns each dataset converted with **its own** axis set, log
scales and graph tilt already applied:

```ts
interface DatasetValues {
  id: number
  name: string
  axisSetId: number
  externalId?: string
  points: { x: number; y: number }[]      // physical values
  pixelPoints: { x: number; y: number }[] // pixel coordinates
}
```

`points` are rounded to a **significant-digit** count, not returned at full float
precision: with the default of 4, a point at 299.86 K comes back as 299.9. The
count is a setting rather than a constant: the user changes it with the
"Effective digits" field next to the data table (1–10), and the host can set it
with the `effectiveDigits` prop or through `ctx.valueFormat.setEffectiveDigits()`,
which is what to do when the data table is hidden. `pixelPoints` is never rounded
and round-trips exactly, so a host that needs full precision can convert the
pixels itself.

**Changed in 3.0.0.** The setting used to live on the magnifier service and in
the magnifier's settings dialog, which made it unreachable with
`features.magnifier: false`. Read `ctx.valueFormat.effectiveDigits` instead of
`ctx.magnifier.effectiveDigits`, and call
`ctx.valueFormat.setEffectiveDigits(n)` instead of
`ctx.magnifier.setEffectiveDigits(n)`; both members are gone from
`MagnifierInterface`.

Do not use an absolute or relative epsilon to compare `points` against expected
values — the error scales with the value and with the digit setting. The useful
tolerance is one pixel expressed in axis units (`axis range / plot height in px`,
or `decades / height` on a log axis), which is also the precision the digitizer
can actually resolve.

### Keyboard shortcuts

**The listeners belong to the instance, not to the document.** `CanvasMain`
binds `keydown` to its own canvas frame (`[data-cy=canvas-wrapper]`), so keys
reach *one* digitizer:

- **When the frame has focus.** The frame carries `tabindex="0"`, so it is in
  the tab order and can be reached without a mouse. Clicking the canvas — the
  first thing anyone does with it — focuses it too. The focus ring is drawn for
  `:focus-visible` only: a ring painted around the image on every click would be
  noise, while a ring after Tab is the only sign that the keys now go to the
  digitizer.
- **Or while the pointer is over the frame.** Focus alone would be a regression
  for the standalone app, where `+` / `-` / `0` have always worked on a freshly
  opened page, so a second listener is attached to `document` for exactly as
  long as the pointer is inside the frame — the same "this instance, not the
  others" rule the mouse already follows. Move the pointer off the digitizer and
  the host page has its keys back. A digitizer that is both focused and hovered
  still acts once.

| Keys | Action | Conditions |
|---|---|---|
| `⌘Z` / `Ctrl+Z`, `⇧⌘Z` / `Ctrl+Shift+Z` | Undo / redo | `features.keyboardHistory`; not in `readonly` |
| `⌘S`, `⌘O` (`Ctrl` too) | Save / load project ZIP | `features.keyboardFile` and `features.zipExportImport`; `⌘O` also needs not-`readonly` |
| `+` / `=`, `-`, `0`, `f` | Zoom in, zoom out, original size, fit | `features.keyboardEditing` (no modifier — `⌘+`/`⌘-` are the browser's own page zoom and cannot be overridden) |
| `a`, `e`, `d` | Manual mode: add / edit / delete | `features.keyboardEditing`; not in `readonly`, not in View All |
| `⌘A` / `Ctrl+A` | Select every point of the active dataset | `features.keyboardEditing`; not in `readonly`, not in View All |
| `Escape` | Deselect points | `features.keyboardEditing`; not in `readonly`, not in View All |
| `Backspace` / `Delete` | Delete the selected points | `features.keyboardEditing`; not in `readonly`, not in View All |
| `↑` `↓` `←` `→` | Nudge the selected points 1px (10px with `Shift`) | `features.keyboardEditing`; not in `readonly`, not in View All |

**Inside a text field the digitizer keeps its hands off.** When the event target
is an `<input>`, a `<textarea>` or an element with `contentEditable`, no
shortcut runs — `⌘Z` there is the browser's own character-level undo, as it has
always been, so a user correcting a mistyped axis value gets the text back
rather than losing a point.

#### Turning them off, in groups

`features.keyboardShortcuts: false` removes the listeners entirely (and the
`tabindex`, so the frame leaves the tab order). Nothing in the digitizer then
observes a key or calls `preventDefault()`.

That is more than most hosts want. The keys split in two by a single question —
**can a page have more than one owner of this key?**

- `⌘Z` / `⇧⌘Z` (`keyboardHistory`) and `⌘S` / `⌘O` (`keyboardFile`) mean
  something page-wide. Two listeners means one press acting twice: the
  digitizer's listener calls `historyManager.undo()` while the host's pops its
  own marker and calls `undo()` again.
- Everything else (`keyboardEditing`) only fires while this canvas frame is
  focused or the pointer is over it, so it cannot collide with the host at all.

**The usual embedded configuration** — the host owns `⌘Z`, the library keeps the
editing keys:

```vue
<StarryDigitizer
  ref="digitizer"
  :features="{ keyboardShortcuts: false, keyboardEditing: true }"
  @history-change="onHistoryChange"
/>
```

`⌘Z`, `⌘S` and `⌘O` now pass through the digitizer untouched — not acted on, not
`preventDefault()`ed — so the host's own listener is the only one that sees
them, and one press undoes once. The arrow-key nudges, `Backspace`/`Delete`,
`Escape`, `⌘A`, the zoom keys and the mode switches keep working, with the
capture placement and the `KeyboardEvent.repeat` bundling the library already
gets right (see [Undo granularity](#undo-granularity-what-counts-as-one-entry)) — reimplementing those in
the host would be the same hard problem solved twice, in two places that then
have to be fixed twice. The frame keeps its `tabindex`, because those keys still
arrive by focus.

Reach for the full `keyboardShortcuts: false` only when the host really does
want to drive *every* action itself; then it must reimplement the editing keys
too. See the recipe below for the `⌘Z` half.

### The "single undo stack" recipe

A host that lets the user edit its own fields next to the digitizer (a sample
name, a unit, a comment) has **two undo stacks**: its own, and the digitizer's.
Both answer to `⌘Z`, so what the key does depends on where the user last
clicked — undo the digitizer's last point in one spot, the host's last edit an
inch away. This recipe merges them into one.

**1. Give `⌘Z` a single owner.**

```vue
<StarryDigitizer
  ref="digitizer"
  :features="{ keyboardShortcuts: false, keyboardEditing: true }"
  @history-change="onHistoryChange"
/>
```

`keyboardHistory` (off here, because `keyboardShortcuts: false` is what it falls
back to) is what matters: the digitizer neither acts on `⌘Z` nor calls
`preventDefault()` on it, so the host's own handler is the only one that sees
it. `keyboardEditing: true` keeps the arrow keys, `Delete`, the zoom keys and
the mode switches in the library, where they cannot collide with the host —
leave it out (or write plain `keyboardShortcuts: false`) only if the host
intends to reimplement those too. See
[Turning them off, in groups](#turning-them-off-in-groups).

**2. Record the digitizer's captures on the host's stack.**

```ts
type HostEntry = { kind: 'digitizer' } | { kind: 'host'; undo: () => void }

const undoStack: HostEntry[] = []
let redoStack: HostEntry[] = []

function onHistoryChange(change: HistoryChange) {
  switch (change.type) {
    case 'capture':
      // The user did something undoable in the digitizer: push a marker and
      // drop the redo stack, exactly as a host edit would.
      undoStack.push({ kind: 'digitizer' })
      redoStack = []
      break
    case 'undo':
    case 'redo':
      // Our own call coming back. Pushing here would add an entry for the very
      // undo we just performed, and the user could never get past it.
      break
    case 'clear':
      // Project load or reset(): the digitizer's snapshots are gone, so the
      // markers pointing at them are meaningless.
      undoStack.length = 0
      redoStack = []
      break
  }
}
```

**3. Dispatch `⌘Z` by who owns the top of the stack.**

```ts
function onUndo() {
  const entry = undoStack.pop()
  if (!entry) return
  if (entry.kind === 'host') {
    entry.undo()
    redoStack.push(entry)
    return
  }
  // The digitizer's internal stack is capped at 50 snapshots, so a marker can
  // outlive the snapshot it refers to. Drop the marker and stop — do not fall
  // through to a host entry the user did not ask to undo.
  if (!digitizer.value!.canUndo) return
  digitizer.value!.undo()
  redoStack.push(entry)
}
```

Rules worth restating, because each one is a bug if missed:

- **`'capture'` is the only type that pushes.** `'undo'` and `'redo'` are the
  echo of your own calls.
- **`'clear'` empties your stack too.** It arrives on project load and on
  `reset()`, and only when there really was history to discard.
- **`canUndo` can be `false` while your marker still exists.** The internal
  stack keeps at most 50 snapshots; older ones are dropped silently.
- **`history-change` is delivered synchronously**, from inside the operation
  that moved the stacks. Do not change digitizer state from the handler — that
  re-enters the manager and notifies again. Record the event and get out; write
  anything back from your own event-loop turn.
- A listener that throws is caught and logged (`console.error`) rather than
  breaking the user's undo, so a bug in your bookkeeping stays a bookkeeping
  bug.

**Hosts that place the panels themselves** have no component to emit from, and
use the manager directly. It is the same event:

```ts
const unsubscribe = ctx.historyManager.subscribe((change) => { /* as above */ })
// ctx.historyManager.undo() / .redo() / .canUndo / .canRedo
```

`subscribe()` returns the unsubscribe function and is what `<StarryDigitizer>`
uses internally to emit `history-change`. It exists because `canUndo` is state
while "a capture just happened" is an event: two captures in a row leave
`canUndo` at `true` throughout, and a reactive watcher would coalesce them —
but a host stack needs exactly one entry per capture.

#### Undo granularity: what counts as one entry

**One thing the user did = one `'capture'`.** A host stack built on the recipe
above is only as good as that promise, so both lists below are complete: the
first says what the digitizer captures, the second says what it deliberately
does not, and **there is no third list**. They come from an exhaustive audit —
every state-changing method and property assignment on the domain models and
repositories (`Dataset`, `Axis`, `AxisSet`, `DatasetRepository`,
`AxisSetRepository`) cross-referenced against every call site under
`src/presentation/**` and `src/application/**` — not from spot checks. You do
not have to test an operation yourself to find out which side it is on.

Why the second list matters as much as the first: an operation that changes
data without capturing does not merely fail to be undoable. **`⌘Z` still does
something — it undoes the operation before it**, and the user is given no
indication that they just lost something else. So everything that changes what
the digitizer would export is on the first list; the second list is only view
state, where there is nothing to lose.

**Captured (undoable):**

| The user did | Entries |
|---|---|
| Add a point (click), place an axis coordinate | 1 each |
| Delete a point — by clicking it in DELETE mode, or Backspace/Delete on the selection | 1 each |
| Nudge the selected points or an axis marker with an arrow key | 1 per key **press** — holding the key down is one entry, not one per repeat |
| Confirm an interpolation | 1 |
| Turn interpolation **off** (it re-creates the anchor points under new ids) | 1 |
| Automatic extraction ("Run") | 1 |
| Add / delete / clear a dataset, delete all datasets | 1 each |
| Add / delete an axis set | 1 each — deleting also re-binds every dataset that pointed at it, all under the one entry |
| Click another row in the XY Axes list (it re-binds the **active dataset** to that axis set) | 1 |
| "Clear XY Axes" | 1 |
| "Auto-fill values (OCR)" | 1 for the whole batch, not one per axis |
| Flip the X or Y axis to/from log scale | 1 each |
| "Consider graph tilt" | 1 |
| Switch the calibration mode (2 Points / 4 Points) | 1 |

**Not captured, on purpose:**

| The user did | Why there is no entry |
|---|---|
| Select / deselect points (click, ⌘-click, rubber-band, Escape, ⌘A), click an axis marker to edit it | Selection is not data, so selecting never pushes an entry. (Undo does *restore* the selection that was current when the snapshot was taken, so the arrow keys keep working right after a `⌘Z`.) |
| Switch dataset, "view all" | Selection again. Unlike the XY Axes list, picking a dataset row writes nothing. |
| Change zoom, manual mode (Add / Edit / Delete), mask tool, or paint a mask | View and tool state; none of it is in `ProjectDTO`. |
| Turn interpolation **on**, change the interpolation interval | Only `tempPoints` change, and no snapshot holds those. An entry here would cost a `⌘Z` press that appears to do nothing. |
| "Show axes marker" | Draws or hides the marker overlay; no exported value changes. |
| Type a dataset name, an axis-set name or an axis value (x1/x2/y1/y2) | Text input, one keystroke at a time. A capture per keystroke would fill your stack with one entry per character; inside a focused field `⌘Z` is the **browser's** own text undo, which is what a user expects there. The value is still in `ProjectDTO` and is restored by any later undo that crosses it. |
| Extraction settings (algorithm, colour, distance %), magnifier settings, significant digits | Tool configuration, not project data. |
| Load a project, replace the image, `reset()` | These `clear()` the history instead — the snapshots belonged to the previous figure. You are told: `type: 'clear'`. |

Two details behind the arrow-key row, in case they surface as a bug report:

- The suppression reads `KeyboardEvent.repeat`, so the snapshot is taken on the
  first press and the auto-repeat events ride on it. The notification therefore
  reaches you **when the movement starts**, not when the key is released, and
  tapping the key three times is still three entries. A few environments (some
  Linux/X11 setups, older browsers) never set `repeat`; there it degrades to one
  entry per keystroke, which is what it always used to be.
- Undo restores the selection along with the points and axes, so the arrow keys
  go on nudging the same point right after a `⌘Z`. Selecting is still not a
  capture point (see the second table above) — the selection rides along in the
  snapshot rather than making one.

### Datasets and external IDs

`DatasetDTO.externalId` is an optional, opaque string the host can use to bind a
dataset to its own record (a Starrydata `sampleid`, for example). The library stores
and round-trips it but never interprets it. It survives renaming, so prefer it over
matching on `name`.

### ProjectDTO versioning

`ProjectDTO.version` follows semver and is exported as `PROJECT_DTO_VERSION`. Hosts are
expected to store the DTO verbatim without interpreting it, so:

- Any backward-incompatible change to the DTO shape is a **major** version bump.
- `migrateProject(dto)` converts any supported older DTO to the current version and is
  called internally on every `project` prop / `loadProject()` call.
- An unrecognized version raises the `error` event with code `DTO_VERSION_UNSUPPORTED`.
- `canvasHandler` is optional: a DTO without it restores fine, and no defaults are
  invented for it.
- `canvasHandler.scale` is written into the DTO but **never restored from it**. It is the
  fit factor of the image against the canvas frame that was on screen when the project was
  saved, so it means nothing in a differently sized frame. `loadProject()` re-fits the
  image to the current frame instead.

```ts
import { migrateProject, PROJECT_DTO_VERSION, createEmptyProject } from 'starry-digitizer'
```

### Heavy assets (`assetBaseUrl`)

OCR (tesseract.js) is loaded lazily and only when the feature is used. Pass
`assetBaseUrl` to serve the tesseract worker, core (wasm) and language data from your
own origin instead of a public CDN — required when your Content-Security-Policy
restricts external origins.

Where the assets are served from (`assetBaseUrl`) and whether the feature exists at
all (`features.axisOcr`) are separate choices. A host that does not want the ~11MB of
OCR assets at any URL passes `features.axisOcr: false`; nothing then imports
tesseract.js.

### Test hooks (`data-cy`)

The `data-cy` attributes the library renders are a **public contract for the
host's automated tests**. They follow the package's semver: a marker is never
renamed or removed in a patch or minor release — only in a **major** one, and the
release notes call it out. Write host selectors against these and nothing else:

```ts
cy.get('[data-cy=x1-value]').should('have.value', '10')
cy.get('[data-cy=canvas-wrapper]').click(300, 250)
```

**CSS class names (`.c__*`, `.sd-*`) and DOM `id`s are _not_ part of the
contract.** They are internal markup and may change in any release, with no
notice and no changelog entry. The `id`s that happen to exist today
(`#canvasWrapper`, `#imageCanvas`, `#fileInput`, `#x1-value` …) are also
duplicated in the DOM as soon as a page mounts more than one
`<StarryDigitizer>`, so they are not dependable selectors even at the current
version.

Hosts that **measure the layout** — reading `offsetHeight` /
`getBoundingClientRect()` to size a surrounding pane — should measure the marked
wrapper elements, `[data-cy=canvas-wrapper]` and `[data-cy=data-table-wrapper]`,
rather than the internal `.c__canvas-wrapper` / `.c__table-wrapper` classes.

#### Canvas (`CanvasMain`)

| `data-cy` | Element |
|---|---|
| `canvas-wrapper` | Outer element of the canvas column — the scrolling frame that holds every canvas. Measure the canvas area here; mouse events on the canvas are dispatched here too. |
| `image-canvas` | The `<canvas>` the figure image is drawn on. |
| `mask-canvas` | Overlay `<canvas>` holding the committed selection-area mask. |
| `temp-mask-canvas` | Overlay `<canvas>` for the mask stroke/box being dragged right now. |
| `interpolation-guide-canvas` | Overlay `<canvas>` for the interpolation guide curve. Its width is `image width × canvasHandler.scale`, which makes it the one place the current zoom is readable from the DOM. |

#### Magnifier (`MagnifierMain`)

| `data-cy` | Element |
|---|---|
| `magnifier-mask-canvas` | Overlay `<canvas>` mirroring the selection-area mask inside the magnifier. |
| `magnifier-interpolation-canvas` | Overlay `<canvas>` mirroring the interpolation guide inside the magnifier. |

#### Data table (`DataTable`)

| `data-cy` | Element |
|---|---|
| `data-table-wrapper` | Outer `<div>` around the table — the scrolling frame capped by `--sd-table-max-height`. Measure the table area here. |
| `data-table` | The `<table>` of extracted values itself (`thead`/`tbody` rows live under it). |
| `effective-digits` | The "Effective digits" number input below the table (1–10 significant digits). |

#### Image (`ImageSettings`)

| `data-cy` | Element |
|---|---|
| `image-file-input` | The `<input type="file">` for the figure image. Rendered only when `features.imageUpload` is on. |

#### Axes (`AxisSetManager`, `AxisSetSettings`)

| `data-cy` | Element |
|---|---|
| `add-axis-set` / `remove-axis-set` | Buttons above the XY axes list. |
| `x1-value` / `x2-value` / `y1-value` / `y2-value` | The four axis-value `<input>`s of the active axis set. |
| `x-is-log` / `y-is-log` | Log-scale checkboxes. |
| `calibration-mode` | Container of the calibration-mode radios. |
| `calibration-mode-2` / `calibration-mode-4` | The "2 Points" / "4 Points" radio inputs. |
| `show-axes-marker` | "Show axes marker" checkbox. |

#### Datasets (`DatasetManager`)

| `data-cy` | Element |
|---|---|
| `add-dataset` / `remove-all-datasets` / `view-all-datasets` | Buttons above the dataset list. |
| `dataset-copy` / `dataset-clear` / `dataset-delete` | Per-row buttons — one of each **per dataset**, in list order. |

#### Extraction (`ExtractorSettings`, `ColorSettings`, `MaskSettings`)

| `data-cy` | Element |
|---|---|
| `manual-add` / `manual-edit` / `manual-delete` | Manual-extraction mode buttons (A / E / D). |
| `extract-strategy` | The `<select>` of extraction algorithms. |
| `extract-color` | The extraction-color picker `<input>`. |
| `color-distance-pct` | "Color Diff." percentage `<input>`. |
| `mask-pen` / `mask-box` / `mask-eraser` | Selection-area tool buttons. |
| `mask-clear` | "Clear" button for the selection area. |

Markers that appear once per list row (`dataset-copy`, `dataset-clear`,
`dataset-delete`) match several elements; scope them with `.eq(i)` or by the row
they sit in. When several `<StarryDigitizer>` instances share a page, scope every
selector by the host's own container element — the markers are per-instance but
not unique across instances.

The library's own Cypress suite (`cypress/`) selects through these same markers,
so the contract is exercised on every run.

### Known limitations

- **Image paste is document-wide.** Several `<StarryDigitizer>` instances can
  share a page — each one draws into its own canvases, keeps its own datasets,
  has its own magnifier and, since keys are bound to the canvas frame, its own
  [keyboard shortcuts](#keyboard-shortcuts) (see
  `cypress/e2e/host-app/spec.multi-instance.cy.ts`). What is still shared is the
  `paste` listener: a pasted image is loaded into *every* mounted instance that
  has `features.imageUpload` on. Hosts that supply the image themselves already
  get `imageUpload: false` by default, which removes the listener with the
  panel. The `id` attributes on the canvases (`#imageCanvas` and friends) are
  still fixed and will be duplicated in the DOM; nothing in the library resolves
  them by id any more, and your own selectors should not either — use the
  `data-cy` markers above, scoped by your own container element.
- **No UMD build.** ESM and CJS only (`index.js`/`index.cjs`, and the same pair
  for `core` and `vue`). A UMD bundle would
  have to inline every dependency, including tesseract.js with its
  hard-coded CDN URLs.
- `getDatasetValues()` returns `NaN` for points whose axis set is not calibrated.
  `NaN` serializes to `null` in JSON.

## Development

### Tech Stack

- Vue 3 with TypeScript
- Vite for build tooling
- Own minimal UI kit (`src/presentation/ui`), no UI framework dependency
- Jest for unit testing
- Cypress for E2E testing

### Scripts

```bash
npm run dev          # Start dev server
npm run app-prod-build    # Production build
npm run test         # Run unit tests
npm run test:coverage     # Run tests with coverage
npm run cypress:open      # Open Cypress for E2E tests
npm run lint         # Lint and type-check
npm run lib-build    # Build the npm package into library-build/dist
npm run lib-check    # Verify the package has no external origins and that
                     # `core` never reaches Vue's renderer
```

### IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension

## Background

StarryDigitizer was developed to improve upon existing digitizer tools by:
- Preserving axis information alongside extracted data
- Integrating seamlessly within web applications
- Providing a modern, user-friendly interface

Previously, the Starrydata project used [WebPlotDigitizer](https://github.com/automeris-io/WebPlotDigitizer), but the workflow required switching between applications and lost axis metadata.

## License

See [LICENSE](LICENSE.txt) file for details.
