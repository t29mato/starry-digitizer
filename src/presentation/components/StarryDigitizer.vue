<template>
  <v-container fluid class="pa-1 starry-digitizer">
    <div class="c__wrapper">
      <div class="c__left-sidebar">
        <image-settings
          v-if="options.features.imageUpload"
          @image-replaced="onImageReplaced"
          @error="onError"
        ></image-settings>
        <axis-set-manager></axis-set-manager>
        <axis-set-settings></axis-set-settings>
        <dataset-manager></dataset-manager>
        <data-table />
      </div>
      <div class="c__main-area">
        <canvas-header @error="onError"></canvas-header>
        <confirmer-bar></confirmer-bar>
        <canvas-main @error="onError"></canvas-main>
        <canvas-footer></canvas-footer>
      </div>
      <div class="c__right-sidebar">
        <magnifier-main></magnifier-main>
        <extractor-settings></extractor-settings>
        <slot name="right-sidebar-footer"></slot>
      </div>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
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
  if (debounceTimer !== undefined) clearTimeout(debounceTimer)
  if (ownsContext) {
    // INFO: the context is garbage with the component, but canvases/images
    // may still be referenced by pending promises — clear them explicitly.
    resetOperation(ctx)
  }
})
</script>

<style lang="scss" scoped>
$l_leftSidebarWidth: 260px;
$l_rightSidebarWidth: 300px;
$l_mainAreaSideMargin: 10px;

.c {
  &__wrapper {
    display: flex;
  }

  &__left-sidebar {
    width: $l_leftSidebarWidth;
  }

  &__right-sidebar {
    width: $l_rightSidebarWidth;
  }

  &__main-area {
    margin: 0 $l_mainAreaSideMargin;
    width: calc(
      100% -
        (
          #{$l_leftSidebarWidth} + #{$l_rightSidebarWidth} +
            (#{$l_mainAreaSideMargin * 2})
        )
    );
  }
}
</style>
