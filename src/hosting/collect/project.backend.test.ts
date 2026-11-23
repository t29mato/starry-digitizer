/**
 * @jest-environment node
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createEmptyProject, ProjectDTO } from '@/application/dto/projectDTO'
import { CollectClient } from './collectClient'
import { MyWorkApi } from './myWork'
import { ProjectSaver } from './projectSaver'
import { sha256Hex } from './sha256'

// INFO: OPT-IN, against a running backend with collection on. Skipped
// unless PROJECT_BACKEND_URL is set, e.g.
//   PROJECT_BACKEND_URL=http://127.0.0.1:24868/api/v1 \
//     npx jest src/hosting/collect/project.backend.test.ts
// A backend with the format `starry-digitizer/project` (wpd-auto's draft
// docs/starry-digitizer-projects.md): the work is saved, listed in My work
// and opened again; the same project_id from another browser is a 409 and
// becomes a new work. A backend without it (today's): the saver stops
// quietly and My work says the server keeps no such work.
// docs/design/starryai-auto.md §2.3.
const BASE = process.env.PROJECT_BACKEND_URL
const run = BASE ? describe : describe.skip

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function project(points: number): ProjectDTO {
  const p = createEmptyProject()
  for (let i = 0; i < points; i++)
    p.datasets[0].points.push({ id: i + 1, xPx: 50 + i, yPx: 60 })
  return p
}

async function startedClient(user: 'first' | 'guest') {
  const client = new CollectClient({
    baseUrl: BASE as string,
    app: { commit: 'abcdef1', version: '2.0.0', build: 1 },
    storage: null,
    batchDelayMs: 100,
  })
  expect(await client.start()).toBe('on')
  client.markNoticeShown()
  if (client.users && client.users.length > 0 && user === 'first')
    client.chooseUser(client.users[0].id)
  else client.chooseUser(null)
  return client
}

run('project saving against a running backend', () => {
  jest.setTimeout(60000)
  const png = new Uint8Array(
    readFileSync(join(__dirname, '../../../public/sample_graph_curve.png')),
  )
  const sha256 = sha256Hex(png)
  const image = {
    sha256,
    name: 'sample_graph_curve.png',
    type: 'image/png',
    size: png.length,
  }

  it('saves, lists and opens the work (or stops quietly on an older backend)', async () => {
    const client = await startedClient('first')
    client.addImage(png, { type: 'image/png', name: image.name })
    for (let i = 0; i < 50 && client.pendingImages > 0; i++) await wait(100)
    let current = project(3)
    const saver = new ProjectSaver({
      baseUrl: BASE as string,
      app: { commit: 'abcdef1', version: '2.0.0', build: 1 },
      client,
      getProject: () => current,
      getImage: () => image,
      storage: null,
    })
    await saver.save()
    const myWork = new MyWorkApi({
      baseUrl: BASE as string,
      headers: () => client.headers(),
    })
    // eslint-disable-next-line no-console
    console.log(`save state: ${saver.view.state}, id ${saver.projectId}`)
    if (saver.view.state === 'unsupported') {
      const list = await myWork.list().catch((error) => error)
      // INFO: today's backend ignores `format` and lists wpd works without
      // one (or none at all); either way nothing here can be opened
      if (list instanceof Error) {
        expect(list).toMatchObject({ code: 'unsupported' })
      } else {
        expect(list.works).toEqual([])
      }
      // eslint-disable-next-line no-console
      console.log(`list: ${JSON.stringify(list)}`)
      return
    }
    expect(saver.view.state).toBe('saved')
    const id = saver.projectId as string

    current = project(5)
    await saver.save()
    expect(saver.projectId).toBe(id)

    const list = await myWork.list()
    expect(list.unsupported).toBe(false)
    const listed = list.works.find((w) => w.projectId === id)
    expect(listed?.summary.points).toBe(5)

    const opened = await myWork.fetchWork(id)
    expect(opened.project.datasets[0].points).toHaveLength(5)
    expect(opened.sha256).toBe(sha256)
    expect(opened.image.size).toBe(png.length)
    const thumb = await myWork.thumbnail(id)
    // eslint-disable-next-line no-console
    console.log(`thumbnail: ${thumb ? thumb.size : 'none'} bytes`)

    // INFO: the same id from another browser (Guest): 409, then a new work
    const other = await startedClient('guest')
    let otherProject = project(1)
    const otherSaver = new ProjectSaver({
      baseUrl: BASE as string,
      app: { commit: 'abcdef1', version: '2.0.0', build: 1 },
      client: other,
      getProject: () => otherProject,
      getImage: () => image,
      storage: null,
      setTimer: (fn) => setTimeout(fn, 0),
    })
    otherSaver.beginOpen()
    otherSaver.continueWork(id, sha256)
    otherProject = project(2)
    await otherSaver.save()
    for (let i = 0; i < 50 && otherSaver.view.state !== 'saved'; i++)
      await wait(50)
    expect(otherSaver.view.state).toBe('saved')
    expect(otherSaver.projectId).not.toBe(id)
    // eslint-disable-next-line no-console
    console.log(`409 → new work ${otherSaver.projectId}`)
    saver.stop()
    otherSaver.stop()
    client.stop()
    other.stop()
  })
})
