<template>
  <v-app>
    <v-main>
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
        <button data-cy="export-zip" @click="exportZip">exportZip()</button>
        <button data-cy="reset" @click="resetDigitizer">reset()</button>
        <button data-cy="toggle-readonly" @click="readonly = !readonly">
          readonly: {{ readonly ? 'on' : 'off' }}
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

      <starry-digitizer
        v-if="mounted && image"
        ref="digitizer"
        :image="image"
        v-model:project="project"
        :readonly="readonly"
        :dataset-name-candidates="['Sample A', 'Sample B']"
        :features="{ imageUpload: false, zipExportImport: false }"
        @ready="onReady"
        @change="onChange"
        @error="onError"
      ></starry-digitizer>

      <div class="host-output">
        <p>
          ready: <span data-cy="ready">{{ readyJson }}</span>
        </p>
        <p>
          update:project count:
          <span data-cy="update-count">{{ updateCount }}</span>
        </p>
        <p>
          error: <span data-cy="error">{{ errorJson }}</span>
        </p>
        <pre data-cy="project-json">{{ projectJson }}</pre>
        <pre data-cy="datasets-json">{{ datasetsJson }}</pre>
        <pre data-cy="values-json">{{ valuesJson }}</pre>
      </div>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
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
const project = ref<ProjectDTO>()
const readonly = ref(false)

const updateCount = ref(0)
const readyJson = ref('')
const errorJson = ref('')
const projectJson = ref('')
const datasetsJson = ref('')
const valuesJson = ref('')

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

// INFO: v-model:project keeps `project` in sync; the counter and the JSON dump
// let the e2e specs observe every update:project emission.
watch(project, (value) => {
  updateCount.value += 1
  projectJson.value = value ? JSON.stringify(value) : ''
})

function onReady(payload: { version: string }) {
  readyJson.value = JSON.stringify(payload)
}

function onChange(payload: { project: ProjectDTO; datasets: unknown[] }) {
  datasetsJson.value = JSON.stringify(payload.datasets)
}

function onError(payload: { code: string; message: string }) {
  errorJson.value = JSON.stringify({
    code: payload.code,
    message: payload.message,
  })
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

function getValues() {
  valuesJson.value = JSON.stringify(
    (digitizer.value as DigitizerApi).getDatasetValues(),
  )
}

async function exportZip() {
  window.__lastZip = await (digitizer.value as DigitizerApi).exportZip()
}

function resetDigitizer() {
  ;(digitizer.value as DigitizerApi).reset()
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
.host-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  border-bottom: 1px solid #ddd;
  font-size: 13px;
}

.host-output {
  padding: 6px 10px;
  font-size: 12px;
  font-family: monospace;
}

.host-output pre {
  max-height: 120px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
