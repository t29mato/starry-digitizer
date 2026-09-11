// INFO: A framework-less host page. No Vue, no Vuetify, no JSX here — only DOM
// APIs plus the mountDigitizer() wrapper. A React/Svelte host would call the
// same function from its own effect/lifecycle hook.

import { mountDigitizer, type DigitizerHandle } from './mountDigitizer'
import type { ProjectDTO } from 'starry-digitizer'

const container = document.querySelector<HTMLElement>('#digitizer')!
const output = document.querySelector<HTMLPreElement>('#output')!
const status = document.querySelector<HTMLElement>('#status')!

let handle: DigitizerHandle | undefined
let readonly = false
let latestProject: ProjectDTO | undefined

function print(label: string, value: unknown): void {
  output.textContent = `${label}\n${JSON.stringify(value, null, 2)}`
}

/** Hosts fetch the (possibly signed) image URL themselves and pass a Blob. */
async function fetchSample(): Promise<Blob> {
  const response = await fetch('/sample_graph_curve.png')
  if (!response.ok) throw new Error(`fetch failed: ${response.status}`)
  return await response.blob()
}

async function loadSample(): Promise<void> {
  handle?.unmount()
  const image = await fetchSample()
  readonly = false
  handle = mountDigitizer(container, {
    image,
    readonly,
    datasetNameCandidates: ['Sample A', 'Sample B'],
    // INFO: the host owns the image and the ZIP round trip, so those two
    // pieces of built-in UI stay hidden.
    features: { imageUpload: false, zipExportImport: false },
    onReady: (payload) => {
      status.textContent = `ready ${payload.version}`
    },
    onProjectChange: (project) => {
      latestProject = project
      print('update:project', project)
    },
    onError: (payload) => print('error', payload),
  })
  status.textContent = 'mounted'
}

document.querySelector('#load-sample')!.addEventListener('click', () => {
  void loadSample()
})

document.querySelector('#get-values')!.addEventListener('click', () => {
  print('getDatasetValues()', handle?.getDatasetValues() ?? [])
})

document.querySelector('#get-project')!.addEventListener('click', () => {
  print('getProject()', handle?.getProject() ?? latestProject ?? null)
})

document.querySelector('#toggle-readonly')!.addEventListener('click', () => {
  readonly = !readonly
  // INFO: this is the point of update(): a prop change with no remount, so the
  // digitized state survives.
  handle?.update({ readonly })
  status.textContent = `readonly: ${readonly ? 'on' : 'off'}`
})

document.querySelector('#unmount')!.addEventListener('click', () => {
  handle?.unmount()
  handle = undefined
  status.textContent = 'unmounted'
  output.textContent = ''
})
