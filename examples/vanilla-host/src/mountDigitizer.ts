// INFO: The reference "mount into any DOM element" wrapper for hosts that are
// NOT written in Vue (React, Svelte, plain JavaScript). This module is the ONLY
// place in this example that imports Vue; everything else is plain
// TypeScript. Copy this file into your own host and you are done. The library
// has no UI-framework dependency (no Vuetify), so nothing else is needed.
//
// docs/embedding.rst section 10 points at this file.

import { createApp, h, reactive, ref, type App, type Component } from 'vue'
import {
  StarryDigitizer,
  type DatasetValues,
  type DigitizerErrorPayload,
  type ProjectDTO,
  type StarryDigitizerFeatures,
  type StarryDigitizerProps,
} from 'starry-digitizer'

// INFO: library styles are scoped under `.starry-digitizer`, so importing them
// here cannot leak into the rest of the host page.
import 'starry-digitizer/styles'

/** Everything the host may pass in, and every callback it may listen to. */
export interface MountDigitizerOptions {
  image?: Blob | string
  project?: ProjectDTO
  readonly?: boolean
  datasetNameCandidates?: string[]
  features?: Partial<StarryDigitizerFeatures>
  onProjectChange?(project: ProjectDTO): void
  onChange?(payload: { project: ProjectDTO; datasets: DatasetValues[] }): void
  onReady?(payload: { version: string }): void
  onError?(payload: DigitizerErrorPayload): void
}

/** The imperative handle returned to the (non-Vue) host. */
export interface DigitizerHandle {
  getProject(): ProjectDTO
  getDatasetValues(): DatasetValues[]
  loadProject(project: ProjectDTO, image?: Blob | string): Promise<void>
  reset(): void
  exportZip(): Promise<Blob>
  /** Change image / project / readonly / features after mounting. */
  update(next: Partial<MountDigitizerOptions>): void
  unmount(): void
}

// INFO: the methods <StarryDigitizer> exposes via defineExpose(). Vue does not
// thread those types through a template ref, so we restate them here.
interface DigitizerApi {
  loadProject(project: ProjectDTO, image?: Blob | string): Promise<void>
  getProject(): ProjectDTO
  getDatasetValues(): DatasetValues[]
  exportZip(): Promise<Blob>
  reset(): void
}

// INFO: the SFC's generated type is wrapped in vue-tsc's
// `__VLS_WithTemplateSlots` helper, which does not match any of h()'s typed
// overloads. Widening it to `Component` fixes the call; prop types are kept by
// building the prop object as StarryDigitizerProps first.
const Digitizer = StarryDigitizer as Component

export function mountDigitizer(
  el: HTMLElement,
  options: MountDigitizerOptions = {},
): DigitizerHandle {
  // INFO: props live in a reactive() object that the render function reads on
  // every re-render. That is what makes update() work without remounting: the
  // host mutates this object and Vue patches the component in place.
  const props = reactive<MountDigitizerOptions>({ ...options })

  // INFO: Vue does not thread defineExpose() types through a vnode `ref`, and
  // a narrowly typed Ref is not assignable to VNodeRef, so this one stays
  // `any` and is cast on the way out.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const digitizer = ref<any>(null)
  let app: App | undefined = createApp({
    render: () => {
      // INFO: typed separately so the component's real prop types are still
      // checked; `Digitizer` itself has to be widened (see below).
      const digitizerProps: StarryDigitizerProps = {
        image: props.image,
        project: props.project,
        readonly: props.readonly ?? false,
        datasetNameCandidates: props.datasetNameCandidates ?? [],
        features: props.features,
      }
      return h(Digitizer, {
        ...digitizerProps,
        ref: digitizer,
        // INFO: callbacks are read off `props` at emit time, so update() can
        // swap a listener too.
        onReady: (payload: { version: string }) => props.onReady?.(payload),
        'onUpdate:project': (project: ProjectDTO) =>
          props.onProjectChange?.(project),
        onChange: (payload: {
          project: ProjectDTO
          datasets: DatasetValues[]
        }) => props.onChange?.(payload),
        onError: (payload: DigitizerErrorPayload) => props.onError?.(payload),
      })
    },
  })
  app.mount(el)

  // INFO: every method call goes through the live component instance; calling
  // one after unmount() is a host bug, hence the explicit throw.
  const api = (): DigitizerApi => {
    if (!app || !digitizer.value) {
      throw new Error('mountDigitizer: the digitizer is not mounted')
    }
    return digitizer.value as DigitizerApi
  }

  return {
    getProject: () => api().getProject(),
    getDatasetValues: () => api().getDatasetValues(),
    loadProject: (project, image) => api().loadProject(project, image),
    reset: () => api().reset(),
    exportZip: () => api().exportZip(),
    update: (next) => Object.assign(props, next),
    unmount: () => {
      app?.unmount()
      app = undefined
      digitizer.value = null
      // INFO: Vue leaves the container in place; clear it so the host can
      // reuse the same element for a later mount.
      el.innerHTML = ''
    },
  }
}
