import type { DigitizerContext } from '@/application/digitizerContext'
import type { AutoService } from '@/application/services/autoService/autoService'
import { CollectClient, CollectUser } from './collectClient'
import {
  attachCollector,
  createCollectingAutoService,
  ServiceCalls,
} from './collectWiring'

// INFO: the one call App.vue makes: a CollectClient for the auto service's
// base URL, wired to the digitizer, plus the auto service that carries its
// headers. Keeps the component thin (the rules live in collectClient.ts /
// collectWiring.ts, which are tested).

/** What the page shows of the collection. */
export interface CollectView {
  on: boolean
  hasNames: boolean
  needsUser: boolean
  userName: string | null
  users: CollectUser[]
  guestAllowed: boolean
}

export interface CollectAppOptions {
  /** VITE_APP_COMMIT (deploy.sh), unset for a local build */
  commit?: string
  /** VITE_APP_BUILD (deploy.sh), unset for a local build */
  build?: string
  /** package.json's version */
  version: string
  onChange(view: CollectView): void
  /** resolves once the page has rendered what onChange gave it */
  afterRender(): Promise<void>
  /** for tests */
  client?: CollectClient
}

export interface CollectHandle {
  service: AutoService
  noteFile(file: Blob): void
  chooseUser(user: string | null): void
  stop(): void
}

const COMMIT_RE = /^[0-9a-f]{7,40}$/
const VERSION_RE = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.+-]+)?$/

/** The app fields of every collect request, or null where not valid. */
export function appInfo(
  commit: string | undefined,
  build: string | undefined,
  version: string,
) {
  const number = Number(build)
  return {
    commit: commit && COMMIT_RE.test(commit) ? commit : null,
    version: VERSION_RE.test(version) && version.length <= 64 ? version : null,
    build:
      Number.isInteger(number) && number > 0 && number < 1e9 ? number : null,
  }
}

export function startCollect(
  ctx: DigitizerContext,
  baseUrl: string,
  options: CollectAppOptions,
): CollectHandle {
  const client =
    options.client ??
    new CollectClient({
      baseUrl,
      app: appInfo(options.commit, options.build, options.version),
    })
  const calls: ServiceCalls = { calibrate: null, extract: null }
  const wiring = attachCollector(ctx, client, calls)
  const view = (): CollectView => ({
    on: client.state === 'on',
    hasNames: client.users !== null,
    needsUser: client.needsUserChoice,
    userName: client.userName,
    users: client.users ?? [],
    guestAllowed: client.guestAllowed,
  })
  const unsubscribe = client.subscribe(() => options.onChange(view()))
  void client.start().then(async (state) => {
    if (state !== 'on') {
      // INFO: off for good: nothing is recorded, and the hook is let go
      wiring.detach()
      return
    }
    options.onChange(view())
    await options.afterRender()
    client.markNoticeShown()
  })
  return {
    service: createCollectingAutoService(client, { baseUrl }, calls),
    noteFile: (file) => wiring.noteFile(file),
    chooseUser: (user) => client.chooseUser(user),
    stop() {
      unsubscribe()
      wiring.flushPending()
      wiring.detach()
      client.stop()
    },
  }
}
