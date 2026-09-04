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

`vue` (^3.3) is the **only peer dependency**. The component brings its own minimal
UI (plain Vue + scoped CSS, inline SVG icons) — no Vuetify, no icon font, no table
library — so it does not care which UI framework the host uses. Runtime dependencies
installed automatically: `jszip`, `curve-interpolator`, `tesseract.js` (lazy-loaded).

Import the library stylesheet once (anywhere in the app); every rule in it is scoped
under the `.starry-digitizer` root class:

```ts
import 'starry-digitizer/styles'
```

Colors can be themed through CSS custom properties on the root class, e.g.
`.starry-digitizer { --sd-primary: #1e3a5f; }` (see `src/presentation/styles/base.scss`
for the full list).

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
| `updateDebounceMs` | `number` | `300` | Debounce for `update:project` / `change`. |

`image` and `project` are watched: assigning new values re-initializes the component,
so the same `<StarryDigitizer>` can be reused when switching figures.

### `features` defaults

| Feature | Default | Notes |
|---|---|---|
| `imageUpload` | `true` only when `image` is **not** given | When the host supplies the image, it also owns image changes. |
| `zipExportImport` | `true` only when neither `image` nor `project` is given | Embedded hosts save through their own API, not ZIP files. |
| `csvExport` | `true` | "Copy to clipboard" buttons. |

Any key you pass in `features` overrides the derived default.

### Events

| Event | Payload | When |
|---|---|---|
| `ready` | `{ version: string }` | Image and project finished loading. |
| `update:project` | `ProjectDTO` | Axes, points, datasets or view state changed (debounced). Usable as `v-model:project`. |
| `change` | `{ project: ProjectDTO, datasets: DatasetValues[] }` | Same moment as `update:project`, with physical values included. |
| `image-replaced` | `{ blob: Blob }` | The user replaced the image (only when `features.imageUpload` is true). |
| `error` | `{ code, message, cause? }` | Failures are emitted, never thrown or `alert()`-ed. |

Error codes (`DigitizerErrorCode`): `IMAGE_LOAD_FAILED`, `INVALID_IMAGE_TYPE`,
`DTO_VERSION_UNSUPPORTED`, `PROJECT_INVALID`, `ZIP_INVALID`, `EXPORT_FAILED`.

### Methods (template ref)

```ts
loadProject(project: ProjectDTO, image?: Blob | string): Promise<void>
getProject(): ProjectDTO
getDatasetValues(): DatasetValues[]
exportZip(): Promise<Blob>
reset(): void
```

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
- Display-only values such as `canvasHandler.scale` are optional on restore.

```ts
import { migrateProject, PROJECT_DTO_VERSION, createEmptyProject } from 'starry-digitizer'
```

### Heavy assets (`assetBaseUrl`)

OCR (tesseract.js) is loaded lazily and only when the feature is used. Pass
`assetBaseUrl` to serve the tesseract worker, core (wasm) and language data from your
own origin instead of a public CDN — required when your Content-Security-Policy
restricts external origins.

### Known limitations

- **Keyboard shortcuts and paste are document-wide.** Several
  `<StarryDigitizer>` instances can now share a page — each one draws into its
  own canvases, keeps its own datasets and has its own magnifier (see
  `cypress/e2e/host-app/spec.multi-instance.cy.ts`). What is still shared are
  the `document`-level listeners: a keyboard shortcut (undo/redo, zoom,
  arrow-key nudges, Delete) is handled by *every* mounted instance, and a
  pasted image is loaded into every instance that has `features.imageUpload`
  on. Mount one instance at a time if those shortcuts matter to your users.
  The `id` attributes on the canvases (`#imageCanvas` and friends) are still
  fixed and will be duplicated in the DOM; nothing in the library resolves
  them by id any more, but your own selectors should not rely on them.
- **No UMD build.** ESM (`index.js`) and CJS (`index.cjs`) only. A UMD bundle would
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
npm run lib-check    # Verify the package contains no app-only code
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

See [LICENSE](LICENSE) file for details.
