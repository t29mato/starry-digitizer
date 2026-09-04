<template>
  <!-- INFO: plain HTML chrome. The host owns no UI framework; the digitizer
       brings its own styles, scoped under `.starry-digitizer`. -->
  <div class="host-app" :class="{ 'host-app--compact': compact }">
    <main class="host-main">
      <div class="host-toolbar">
        <button data-cy="remount" @click="remount">
          Remount (same figure)
        </button>
        <button data-cy="remount-other" @click="remountOther">
          Remount (other figure)
        </button>
        <button data-cy="get-values" @click="getValues">
          getDatasetValues()
        </button>
        <button data-cy="get-project" @click="getProject">getProject()</button>
        <button data-cy="export-zip" @click="exportZip">exportZip()</button>
        <button data-cy="export-zip-inspect" @click="exportZipAndInspect">
          exportZip() + unzip
        </button>
        <button data-cy="reset" @click="resetDigitizer">reset()</button>
        <button data-cy="toggle-readonly" @click="readonly = !readonly">
          readonly: {{ readonly ? 'on' : 'off' }}
        </button>
        <button
          data-cy="toggle-image-upload"
          @click="features.imageUpload = !features.imageUpload"
        >
          imageUpload: {{ features.imageUpload ? 'on' : 'off' }}
        </button>
        <button
          data-cy="toggle-csv-export"
          @click="features.csvExport = !features.csvExport"
        >
          csvExport: {{ features.csvExport ? 'on' : 'off' }}
        </button>
        <button
          data-cy="toggle-zip-feature"
          @click="features.zipExportImport = !features.zipExportImport"
        >
          zipExportImport: {{ features.zipExportImport ? 'on' : 'off' }}
        </button>
        <button data-cy="swap-image" @click="swapImageOnly">
          swap image prop
        </button>
        <button data-cy="echo-project" @click="echoProject">
          echo project prop
        </button>
        <button data-cy="load-fixture-method" @click="loadFixtureViaMethod">
          loadProject(fixture)
        </button>
        <button data-cy="set-fixture-prop" @click="setFixtureViaProp">
          project prop = fixture
        </button>
        <button data-cy="load-legacy-v1" @click="loadLegacyProject">
          load v1 project
        </button>
        <button data-cy="load-future-version" @click="loadFutureProject">
          load v3 project
        </button>
        <button data-cy="load-invalid-image-type" @click="loadInvalidImageType">
          load text as image
        </button>
        <button data-cy="load-broken-image" @click="loadBrokenImage">
          load broken png
        </button>
        <button
          data-cy="toggle-axis-panel"
          @click="features.axisPanel = !features.axisPanel"
        >
          axisPanel: {{ features.axisPanel ? 'on' : 'off' }}
        </button>
        <button
          data-cy="toggle-dataset-panel"
          @click="features.datasetPanel = !features.datasetPanel"
        >
          datasetPanel: {{ features.datasetPanel ? 'on' : 'off' }}
        </button>
        <button
          data-cy="toggle-extraction-panel"
          @click="features.extractionPanel = !features.extractionPanel"
        >
          extractionPanel: {{ features.extractionPanel ? 'on' : 'off' }}
        </button>
        <button
          data-cy="toggle-magnifier"
          @click="features.magnifier = !features.magnifier"
        >
          magnifier: {{ features.magnifier ? 'on' : 'off' }}
        </button>
        <button
          data-cy="toggle-data-table"
          @click="features.dataTable = !features.dataTable"
        >
          dataTable: {{ features.dataTable ? 'on' : 'off' }}
        </button>
        <button data-cy="toggle-compact" @click="compact = !compact">
          compact: {{ compact ? 'on' : 'off' }}
        </button>
        <button data-cy="clear-log" @click="clearLog">clear log</button>
        <button data-cy="mount-second" @click="toggleSecond">
          second digitizer: {{ secondMounted ? 'on' : 'off' }}
        </button>
        <label>
          Load ZIP
          <input
            data-cy="zip-input"
            type="file"
            accept=".zip"
            @change="onZipSelected"
          />
        </label>
      </div>

      <!-- INFO: the pane the digitizer lives in. In "compact" mode it has a
           fixed height and hands the library its layout custom properties, the
           way a host embeds the digitizer in one screenful of its own UI. -->
      <div class="host-pane" :class="{ 'host-pane--compact': compact }">
        <starry-digitizer
          v-if="mounted && image"
          ref="digitizer"
          data-cy="digitizer-1"
          :image="image"
          :project="project"
          :readonly="readonly"
          :dataset-name-candidates="datasetNameCandidates"
          :features="features"
          @update:project="onUpdateProject"
          @ready="onReady"
          @change="onChange"
          @image-replaced="onImageReplaced"
          @error="onError"
        >
          <!-- INFO: the sidebar slots receive the measured sidebar width so
               host chrome can line up with the column it sits in. -->
          <template #aside-top="{ width }">
            <div class="host-slot" data-cy="slot-aside-top">
              host aside-top ·
              <span data-cy="aside-top-width">{{ width }}</span>
            </div>
          </template>
          <template #footer>
            <div class="host-slot" data-cy="slot-footer">host footer</div>
          </template>
        </starry-digitizer>
      </div>

      <!-- INFO: a second instance on the same page, to prove the digitizer no
           longer relies on document-wide canvas ids. -->
      <starry-digitizer
        v-if="secondMounted && secondImage"
        data-cy="digitizer-2"
        :image="secondImage"
        :features="features"
      ></starry-digitizer>

      <div class="host-output">
        <p>
          ready: <span data-cy="ready">{{ readyJson }}</span> / ready count:
          <span data-cy="ready-count">{{ readyCount }}</span>
        </p>
        <p>
          update:project count:
          <span data-cy="update-count">{{ updateCount }}</span>
          / change count: <span data-cy="change-count">{{ changeCount }}</span>
          / image-replaced count:
          <span data-cy="image-replaced-count">{{ imageReplacedCount }}</span>
        </p>
        <p>
          error: <span data-cy="error">{{ errorJson }}</span>
        </p>
        <p>
          error codes: <span data-cy="error-codes">{{ errorCodes }}</span>
        </p>
        <pre data-cy="project-json">{{ projectJson }}</pre>
        <pre data-cy="get-project-json">{{ getProjectJson }}</pre>
        <pre data-cy="datasets-json">{{ datasetsJson }}</pre>
        <pre data-cy="values-json">{{ valuesJson }}</pre>
        <p>
          zip entries: <span data-cy="zip-entries">{{ zipEntries }}</span>
        </p>
        <pre data-cy="zip-project-json">{{ zipProjectJson }}</pre>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import JSZip from 'jszip'
import { StarryDigitizer, migrateProject } from 'starry-digitizer'
import type { ProjectDTO } from 'starry-digitizer'

// INFO: the exposed API of <StarryDigitizer>. Typed loosely on the template
// ref itself because Vue does not thread defineExpose types through `ref=`.
type DigitizerApi = {
  loadProject(project: ProjectDTO, image?: Blob | string): Promise<void>
  getProject(): ProjectDTO
  getDatasetValues(): unknown[]
  exportZip(): Promise<Blob>
  reset(): void
}

declare global {
  interface Window {
    __lastZip?: Blob
  }
}

const FIRST_IMAGE = '/sample_graph_curve.png'
const SECOND_IMAGE = '/sample_graph_curve_2.png'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const digitizer = ref<any>(null)

const mounted = ref(false)
const image = ref<Blob>()
const secondMounted = ref(false)
const secondImage = ref<Blob>()
const project = ref<ProjectDTO>()
const readonly = ref(false)
const datasetNameCandidates = ref(['Sample A', 'Sample B'])
// INFO: the host owns the image and the ZIP round trip in the Starrydata3
// integration, so those two features start off; the e2e specs flip them.
const features = reactive({
  imageUpload: false,
  zipExportImport: false,
  csvExport: true,
  axisPanel: true,
  datasetPanel: true,
  extractionPanel: true,
  magnifier: true,
  dataTable: true,
})

// INFO: fixed-height embedding, driven purely by the library's layout custom
// properties (see .host-pane--compact below).
const compact = ref(false)

const updateCount = ref(0)
const readyCount = ref(0)
const changeCount = ref(0)
const imageReplacedCount = ref(0)
const readyJson = ref('')
const errorJson = ref('')
const errorCodes = ref('')
const projectJson = ref('')
const getProjectJson = ref('')
const datasetsJson = ref('')
const valuesJson = ref('')
const zipEntries = ref('')
const zipProjectJson = ref('')

/** Hosts fetch the (possibly signed, short-lived) image URL and pass a Blob. */
async function fetchImage(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return await response.blob()
}

onMounted(async () => {
  image.value = await fetchImage(FIRST_IMAGE)
  mounted.value = true
})

// INFO: this is v-model:project written out by hand, so the counter observes
// only real update:project emissions and never the host's own writes.
function onUpdateProject(value: ProjectDTO) {
  project.value = value
  updateCount.value += 1
  projectJson.value = JSON.stringify(value)
}

function onReady(payload: { version: string }) {
  readyCount.value += 1
  readyJson.value = JSON.stringify(payload)
}

function onChange(payload: { project: ProjectDTO; datasets: unknown[] }) {
  changeCount.value += 1
  datasetsJson.value = JSON.stringify(payload.datasets)
}

function onImageReplaced(payload: { blob: Blob }) {
  imageReplacedCount.value += 1
  // INFO: touch the payload so a wrong shape shows up as a test failure.
  if (!(payload.blob instanceof Blob)) {
    errorCodes.value += ' IMAGE_REPLACED_PAYLOAD_INVALID'
  }
}

function onError(payload: { code: string; message: string }) {
  errorJson.value = JSON.stringify({
    code: payload.code,
    message: payload.message,
  })
  errorCodes.value = errorCodes.value
    ? `${errorCodes.value},${payload.code}`
    : payload.code
}

function clearLog() {
  errorJson.value = ''
  errorCodes.value = ''
  updateCount.value = 0
  changeCount.value = 0
  readyCount.value = 0
  imageReplacedCount.value = 0
  zipEntries.value = ''
  zipProjectJson.value = ''
}

/** Mounts/unmounts a second <StarryDigitizer> next to the first one. */
async function toggleSecond() {
  if (secondMounted.value) {
    secondMounted.value = false
    return
  }
  if (!secondImage.value) {
    secondImage.value = await fetchImage(SECOND_IMAGE)
  }
  secondMounted.value = true
}

/** Unmount and remount with the very same image + project (criterion 1). */
async function remount() {
  mounted.value = false
  await nextTick()
  mounted.value = true
}

/** Switch to a different figure with no project at all (criterion 4). */
async function remountOther() {
  mounted.value = false
  await nextTick()
  project.value = undefined
  image.value = await fetchImage(SECOND_IMAGE)
  mounted.value = true
}

/** Change ONLY the `image` prop, leaving the component mounted. */
async function swapImageOnly() {
  image.value = await fetchImage(SECOND_IMAGE)
}

/**
 * Write the received DTO straight back into the prop, the way a naive
 * v-model host does. Must not make the component reload itself.
 */
function echoProject() {
  if (!project.value) return
  project.value = JSON.parse(JSON.stringify(project.value)) as ProjectDTO
}

function getValues() {
  valuesJson.value = JSON.stringify(
    (digitizer.value as DigitizerApi).getDatasetValues(),
  )
}

function getProject() {
  getProjectJson.value = JSON.stringify(
    (digitizer.value as DigitizerApi).getProject(),
  )
}

async function exportZip() {
  window.__lastZip = await (digitizer.value as DigitizerApi).exportZip()
}

/** Export and unzip in the host, so a spec can assert on the ZIP content. */
async function exportZipAndInspect() {
  const blob = await (digitizer.value as DigitizerApi).exportZip()
  window.__lastZip = blob
  const zip = await JSZip.loadAsync(blob)
  zipEntries.value = Object.keys(zip.files).sort().join(',')
  const projectFile = zip.file('project.json')
  zipProjectJson.value = projectFile ? await projectFile.async('text') : ''
}

function resetDigitizer() {
  ;(digitizer.value as DigitizerApi).reset()
}

// ---------------------------------------------------------------------------
// Fixtures the specs load through the public API
// ---------------------------------------------------------------------------

/** A fully calibrated project with two named datasets and an externalId. */
function fixtureProject(): ProjectDTO {
  return {
    version: '2.0.0',
    timestamp: '2020-01-01T00:00:00.000Z',
    axisSets: [
      {
        id: 1,
        name: 'Fixture Axes',
        x1: { name: 'x1', value: 10, coord: { xPx: 100, yPx: 400 } },
        x2: { name: 'x2', value: 20, coord: { xPx: 500, yPx: 400 } },
        y1: { name: 'y1', value: 30, coord: { xPx: 100, yPx: 400 } },
        y2: { name: 'y2', value: 70, coord: { xPx: 100, yPx: 100 } },
        xIsLogScale: false,
        yIsLogScale: false,
        considerGraphTilt: false,
        pointMode: 0,
        isVisible: true,
      },
    ],
    activeAxisSetId: 1,
    datasets: [
      {
        id: 1,
        name: 'Fixture Sample',
        axisSetId: 1,
        externalId: 'sample-42',
        points: [
          { id: 1, xPx: 200, yPx: 300 },
          { id: 2, xPx: 300, yPx: 200 },
          { id: 3, xPx: 400, yPx: 150 },
        ],
        visiblePointIds: [1, 2, 3],
        manuallyAddedPointIds: [1, 2, 3],
      },
      {
        id: 2,
        name: 'Fixture Sample 2',
        axisSetId: 1,
        points: [{ id: 1, xPx: 250, yPx: 250 }],
        visiblePointIds: [1],
        manuallyAddedPointIds: [1],
      },
    ],
    activeDatasetId: 1,
  }
}

/**
 * A legacy (major 1) project as written by the standalone app before the DTO
 * was versioned separately: no `canvasHandler`, no `externalId`.
 */
function legacyProject(): Record<string, unknown> {
  return {
    version: '1.11.2',
    timestamp: '2019-05-05T00:00:00.000Z',
    axisSets: [
      {
        id: 1,
        name: 'XY Axes 1',
        x1: { name: 'x1', value: 1, coord: { xPx: 120, yPx: 420 } },
        x2: { name: 'x2', value: 11, coord: { xPx: 520, yPx: 420 } },
        y1: { name: 'y1', value: 2, coord: { xPx: 120, yPx: 420 } },
        y2: { name: 'y2', value: 12, coord: { xPx: 120, yPx: 120 } },
        xIsLogScale: false,
        yIsLogScale: false,
        considerGraphTilt: false,
        pointMode: 0,
        isVisible: true,
      },
    ],
    activeAxisSetId: 1,
    datasets: [
      {
        id: 1,
        name: 'legacy dataset',
        axisSetId: 1,
        points: [
          { id: 1, xPx: 220, yPx: 320 },
          { id: 2, xPx: 320, yPx: 220 },
        ],
      },
    ],
    activeDatasetId: 1,
  }
}

async function loadFixtureViaMethod() {
  const dto = fixtureProject()
  await (digitizer.value as DigitizerApi).loadProject(dto, image.value)
}

function setFixtureViaProp() {
  project.value = fixtureProject()
}

async function loadLegacyProject() {
  // INFO: a host that stored a v1 DTO hands it to migrateProject() first,
  // exactly like the ZIP path does.
  const dto = migrateProject(legacyProject())
  await (digitizer.value as DigitizerApi).loadProject(dto, image.value)
}

async function loadFutureProject() {
  const dto = { ...fixtureProject(), version: '3.0.0' } as ProjectDTO
  // INFO: no migrateProject() here on purpose — this checks that the
  // component itself rejects an unsupported DTO and emits `error`.
  await (digitizer.value as DigitizerApi).loadProject(dto)
}

async function loadInvalidImageType() {
  const blob = new Blob(['not an image at all'], { type: 'text/plain' })
  await (digitizer.value as DigitizerApi).loadProject(
    (digitizer.value as DigitizerApi).getProject(),
    blob,
  )
}

async function loadBrokenImage() {
  // INFO: a valid image MIME type whose bytes the decoder cannot read.
  const blob = new Blob([new Uint8Array([1, 2, 3, 4, 5])], {
    type: 'image/png',
  })
  await (digitizer.value as DigitizerApi).loadProject(
    (digitizer.value as DigitizerApi).getProject(),
    blob,
  )
}

/**
 * Reads a project ZIP without going through the library's ZIP UI: the host
 * unzips it itself and feeds the DTO + image Blob into loadProject(), which is
 * the same restore path the Starrydata3 API integration uses.
 */
async function onZipSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const zip = await JSZip.loadAsync(file)
    const projectFile = zip.file('project.json')
    if (!projectFile) throw new Error('project.json not found in ZIP')
    const dto = migrateProject(JSON.parse(await projectFile.async('text')))

    const imageFile =
      zip.file('image.png') || zip.file('image.jpg') || zip.file('image.jpeg')
    const imageBlob = imageFile ? await imageFile.async('blob') : undefined

    project.value = dto
    if (imageBlob) image.value = imageBlob
    await (digitizer.value as DigitizerApi).loadProject(dto, imageBlob)
  } catch (error) {
    errorJson.value = JSON.stringify({
      code: 'ZIP_INVALID',
      message: (error as Error).message,
    })
  } finally {
    input.value = ''
  }
}
</script>

<style>
/* INFO: Vuetify used to supply the page reset (body margin, base font).
   The library ships nothing outside `.starry-digitizer`, so the host does
   its own — which is the point of this example. */
html,
body {
  margin: 0;
  padding: 0;
  font-family:
    system-ui,
    -apple-system,
    'Helvetica Neue',
    Arial,
    sans-serif;
  color: #1f1f1f;
  background: #fff;
}

.host-app {
  min-height: 100vh;
}

.host-toolbar button {
  font: inherit;
  font-size: 13px;
  padding: 3px 8px;
  border: 1px solid #bbb;
  border-radius: 4px;
  background: #f5f5f5;
  color: inherit;
  cursor: pointer;
}

.host-toolbar button:hover {
  background: #e8e8e8;
}

.host-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  padding: 6px 10px;
  border-bottom: 1px solid #ddd;
  font-size: 13px;
}

.host-output {
  padding: 6px 10px;
  font-size: 12px;
  font-family: monospace;
}

/* INFO: everything below is the host's own CSS — the library exposes the
   sizes it uses as custom properties, so no internal class is touched. */
.host-pane--compact {
  height: 70vh;
  --sd-height: 100%;
  --sd-left-sidebar-width: 210px;
  --sd-left-sidebar-min-width: 210px;
  --sd-right-sidebar-width: 200px;
  --sd-right-sidebar-min-width: 200px;
}

/* INFO: the point of compact mode is that the page itself does not scroll,
   so the host's own debug dump steps aside while it is on. */
.host-app--compact .host-output {
  display: none;
}

.host-slot {
  font-size: 11px;
  color: #666;
  padding: 2px 4px;
}

.host-output pre {
  max-height: 120px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
