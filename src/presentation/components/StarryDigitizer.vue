<template>
  <div class="starry-digitizer pa-1">
    <div class="c__wrapper">
      <div ref="leftSidebar" class="c__left-sidebar">
        <slot name="aside-top" :width="leftSidebarWidth"></slot>
        <image-settings
          v-if="options.features.imageUpload"
          @image-replaced="onImageReplaced"
          @error="onError"
        ></image-settings>
        <axis-set-manager v-if="options.features.axisPanel"></axis-set-manager>
        <axis-set-settings
          v-if="options.features.axisPanel"
        ></axis-set-settings>
        <dataset-manager v-if="options.features.datasetPanel"></dataset-manager>
        <data-table v-if="options.features.dataTable" />
        <slot name="aside-bottom" :width="leftSidebarWidth"></slot>
      </div>
      <div class="c__main-area">
        <canvas-header @error="onError"></canvas-header>
        <confirmer-bar></confirmer-bar>
        <canvas-main @error="onError"></canvas-main>
        <canvas-footer></canvas-footer>
      </div>
      <div ref="rightSidebar" class="c__right-sidebar">
        <magnifier-main v-if="options.features.magnifier"></magnifier-main>
        <extractor-settings
          v-if="options.features.extractionPanel"
        ></extractor-settings>
        <slot name="right-sidebar-footer" :width="rightSidebarWidth"></slot>
      </div>
    </div>
    <slot name="footer"></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
// INFO: the library's own tokens + utility classes (no Vuetify). Imported
// here so the lib build folds them into style.css.
import '@/presentation/styles/base.scss'
import { MagnifierMain } from '@/presentation/components/Magnifier'
import { CanvasHeader, CanvasFooter, CanvasMain } from './Canvas'
import { AxisSetSettings, ExtractorSettings, ImageSettings } from './Settings'
import { DatasetManager } from './DatasetManager'
import { AxisSetManager } from './AxisSetManager'
import ConfirmerBar from '@/presentation/components/Generals/ConfirmerBar.vue'
import DataTable from '@/presentation/components/Export/DataTable.vue'
import {
  createDigitizerContext,
  DIGITIZER_CONTEXT_KEY,
  type DigitizerContext,
} from '@/application/digitizerContext'
import {
  DEFAULT_FEATURES,
  DIGITIZER_OPTIONS_KEY,
  type DigitizerOptions,
  type StarryDigitizerFeatures,
} from '@/presentation/digitizerOptions'
import {
  PROJECT_DTO_VERSION,
  createEmptyProject,
  type ProjectDTO,
} from '@/application/dto/projectDTO'
import {
  DigitizerError,
  toErrorPayload,
  type DigitizerErrorPayload,
} from '@/application/errors'
import type { ImageSource } from '@/application/utils/imageLoader'
import {
  loadProject as loadProjectOperation,
  reset as resetOperation,
} from '@/application/utils/digitizerOperations'
import {
  getDatasetValues as computeDatasetValues,
  type DatasetValues,
} from '@/application/utils/datasetValues'
import {
  createI18n,
  detectLocale,
  provideI18n,
  type Locale,
} from '@/presentation/i18n'

export interface StarryDigitizerProps {
  /** Image to digitize. Blob recommended (hosts fetch signed URLs themselves); data URL / URL also accepted. */
  image?: ImageSource
  /** Work state to restore. Omitted = empty project. */
  project?: ProjectDTO
  /** View only: disables adding points / editing axes. */
  readonly?: boolean
  /** Dataset name suggestions (e.g. Starrydata sample names). */
  datasetNameCandidates?: string[]
  /** Hide UI the host does not need. */
  features?: Partial<StarryDigitizerFeatures>
  /** Base URL for opencv/tesseract assets. Undefined = library defaults. */
  assetBaseUrl?: string
  /** UI language. Omitted = detect from the browser, falling back to English. */
  locale?: Locale
  /**
   * Share a context created with createDigitizerContext() (used by the
   * standalone app so its menu bar can drive the same state). Library users
   * normally omit it.
   */
  context?: DigitizerContext
  /** Ask before replacing an image that already has axes/points. */
  confirmImageReplace?: boolean
  /** Debounce (ms) for update:project / change. */
  updateDebounceMs?: number
}

const props = withDefaults(defineProps<StarryDigitizerProps>(), {
  image: undefined,
  project: undefined,
  readonly: false,
  datasetNameCandidates: () => [],
  features: undefined,
  assetBaseUrl: undefined,
  locale: undefined,
  context: undefined,
  confirmImageReplace: true,
  updateDebounceMs: 300,
})

const emit = defineEmits<{
  ready: [payload: { version: string }]
  'update:project': [project: ProjectDTO]
  change: [payload: { project: ProjectDTO; datasets: DatasetValues[] }]
  'image-replaced': [payload: { blob: Blob }]
  error: [payload: DigitizerErrorPayload]
}>()

// INFO: One state set per component instance. When the host passes
// `context`, we share it (standalone app); otherwise it is ours to create
// and to tear down on unmount, so nothing leaks into the next mount.
const ownsContext = props.context === undefined
const ctx: DigitizerContext = props.context ?? createDigitizerContext()
provide(DIGITIZER_CONTEXT_KEY, ctx)

const options = computed<DigitizerOptions>(() => ({
  readonly: props.readonly,
  features: {
    ...DEFAULT_FEATURES,
    // INFO: when the host supplies the image, it also owns image changes
    imageUpload: props.image === undefined,
    zipExportImport: props.image === undefined && props.project === undefined,
    ...(props.features ?? {}),
  },
  datasetNameCandidates: props.datasetNameCandidates,
  assetBaseUrl: props.assetBaseUrl,
  confirmImageReplace: props.confirmImageReplace,
}))
// INFO: provide the reactive computed's value through a proxy object so
// descendants see prop changes without re-injecting.
provide(
  DIGITIZER_OPTIONS_KEY,
  new Proxy({} as DigitizerOptions, {
    get: (_target, key) => options.value[key as keyof DigitizerOptions],
    has: (_target, key) => key in options.value,
    ownKeys: () => Reflect.ownKeys(options.value),
    getOwnPropertyDescriptor: (_target, key) => ({
      enumerable: true,
      configurable: true,
      value: options.value[key as keyof DigitizerOptions],
    }),
  }),
)

// INFO: the UI language. `locale` is a prop so the host stays in control;
// without it we follow the browser. Everything below the component reads it
// through useI18n().
const locale = computed<Locale>(() => props.locale ?? detectLocale())
provideI18n(createI18n(locale))

// INFO: the sidebars are flex items with min/max bounds, so their rendered
// width depends on the host's pane. Slot content often needs to line up with
// it (a host toolbar sitting above the axis panel, say), so it is handed to
// the slots rather than left for the host to measure through internal classes.
const leftSidebar = ref<HTMLElement>()
const rightSidebar = ref<HTMLElement>()
const leftSidebarWidth = ref(0)
const rightSidebarWidth = ref(0)
let sidebarObserver: ResizeObserver | undefined

function measureSidebars() {
  leftSidebarWidth.value = leftSidebar.value?.clientWidth ?? 0
  rightSidebarWidth.value = rightSidebar.value?.clientWidth ?? 0
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
function onError(error: unknown) {
  const digitizerError = DigitizerError.from(error, 'PROJECT_INVALID')
  console.error('[starry-digitizer]', digitizerError)
  emit('error', toErrorPayload(digitizerError))
}

function onImageReplaced(payload: { blob: Blob }) {
  emit('image-replaced', payload)
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------
const isMounted = ref(false)
let isRestoring = false
let lastEmittedProjectJson: string | null = null
// INFO: serializes concurrent loads (prop changes while a previous load is
// still decoding) so the last request always wins.
let loadChain: Promise<void> = Promise.resolve()

function serializeProject(project: ProjectDTO): string {
  // INFO: timestamp changes on every snapshot; ignore it for equality
  return JSON.stringify({ ...project, timestamp: undefined })
}

async function loadProject(
  project: ProjectDTO | undefined,
  image?: ImageSource,
): Promise<void> {
  const run = async () => {
    isRestoring = true
    try {
      await loadProjectOperation(ctx, project ?? createEmptyProject(), image)
      lastEmittedProjectJson = serializeProject(
        ctx.projectService.toProjectDTO(),
      )
      emit('ready', { version: PROJECT_DTO_VERSION })
    } catch (error) {
      onError(error)
    } finally {
      isRestoring = false
    }
  }
  loadChain = loadChain.then(run, run)
  return loadChain
}

onMounted(async () => {
  isMounted.value = true
  measureSidebars()
  if (typeof ResizeObserver !== 'undefined') {
    sidebarObserver = new ResizeObserver(measureSidebars)
    if (leftSidebar.value) sidebarObserver.observe(leftSidebar.value)
    if (rightSidebar.value) sidebarObserver.observe(rightSidebar.value)
  }
  await loadProject(props.project, props.image)
})

watch(
  () => props.image,
  (image) => {
    if (!isMounted.value) return
    loadProject(props.project, image)
  },
)

watch(
  () => props.project,
  (project) => {
    if (!isMounted.value) return
    // INFO: v-model:project echoes our own update:project back; skip it
    if (project && serializeProject(project) === lastEmittedProjectJson) {
      return
    }
    loadProject(project, props.image)
  },
)

// ---------------------------------------------------------------------------
// Change notifications (debounced)
// ---------------------------------------------------------------------------
let debounceTimer: ReturnType<typeof setTimeout> | undefined

function emitChange() {
  const project = ctx.projectService.toProjectDTO()
  const json = serializeProject(project)
  if (json === lastEmittedProjectJson) {
    return
  }
  lastEmittedProjectJson = json
  emit('update:project', project)
  emit('change', { project, datasets: getDatasetValues() })
}

watch(
  () => serializeProject(ctx.projectService.toProjectDTO()),
  () => {
    if (isRestoring) return
    if (debounceTimer !== undefined) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined
      if (isRestoring) return
      emitChange()
    }, props.updateDebounceMs)
  },
)

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function getProject(): ProjectDTO {
  return ctx.projectService.toProjectDTO()
}

function getDatasetValues(): DatasetValues[] {
  return computeDatasetValues(
    ctx.axisSetRepository,
    ctx.datasetRepository,
    ctx.magnifier.effectiveDigits,
  )
}

function exportZip(): Promise<Blob> {
  return ctx.projectService.exportProject()
}

function reset(): void {
  isRestoring = true
  try {
    resetOperation(ctx)
    lastEmittedProjectJson = null
  } finally {
    isRestoring = false
  }
}

defineExpose({
  loadProject,
  getProject,
  getDatasetValues,
  exportZip,
  reset,
  context: ctx,
})

onBeforeUnmount(() => {
  sidebarObserver?.disconnect()
  sidebarObserver = undefined
  if (debounceTimer !== undefined) clearTimeout(debounceTimer)
  if (ownsContext) {
    // INFO: the context is garbage with the component, but canvases/images
    // may still be referenced by pending promises — clear them explicitly.
    resetOperation(ctx)
  }
})
</script>

<style lang="scss" scoped>
// INFO: layout contract with the host (see README "Embedding in a fixed-height
// pane"). Sizes are CSS custom properties on `.starry-digitizer`, and the
// three columns are flex items rather than fixed widths + a calc() that has to
// be kept in sync with them by hand.
.starry-digitizer {
  // INFO: `auto` keeps the standalone page flowing as before. A host that owns
  // the height sets `--sd-height: 100%` (its own pane being 100dvh, say) and
  // the whole tree then fits inside without the page scrolling.
  height: var(--sd-height, auto);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.c {
  &__wrapper {
    display: flex;
    // INFO: min-height:0 lets the columns shrink below their content so their
    // own overflow:auto takes over instead of pushing the page taller.
    flex: 1 1 auto;
    min-height: 0;
  }

  // INFO: min-width defaults to the same value as the basis so the standalone
  // layout never shrinks (its columns stay exactly 260 / 300 as before). A
  // host that wants narrower columns lowers --sd-*-min-width explicitly.
  &__left-sidebar,
  &__right-sidebar {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }

  &__left-sidebar {
    flex: 0 1 var(--sd-left-sidebar-width, 260px);
    min-width: var(--sd-left-sidebar-min-width, 260px);
    max-width: var(--sd-left-sidebar-max-width, 340px);
  }

  &__right-sidebar {
    flex: 0 1 var(--sd-right-sidebar-width, 300px);
    min-width: var(--sd-right-sidebar-min-width, 300px);
    max-width: var(--sd-right-sidebar-max-width, 380px);
  }

  &__main-area {
    display: flex;
    flex-direction: column;
    // INFO: min-width:0 stops the canvas from forcing the row wider than the
    // host pane; min-height:0 does the same vertically.
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    margin: 0 var(--sd-main-area-margin, 10px);
  }
}
</style>
