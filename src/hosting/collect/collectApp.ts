import type { DigitizerContext } from '@/application/digitizerContext'
import type { AutoService } from '@/application/services/autoService/autoService'
import { refreshAutoFeatures } from '@/application/utils/autoFeatureOperations'
import { AuthSession, LoginResult, SignOutReason } from './auth'
import {
  APP_HEADER,
  APP_NAME,
  CollectClient,
  CollectUser,
} from './collectClient'
import {
  attachCollector,
  createCollectingAutoService,
  ServiceCalls,
} from './collectWiring'

// INFO: the one call App.vue makes: a CollectClient for the auto service's
// base URL, wired to the digitizer, plus the auto service that carries its
// headers. Keeps the component thin (the rules live in collectClient.ts /
// collectWiring.ts, which are tested).

/** What the page shows of the password login (auth.ts). */
export interface LoginView {
  /** the server uses passwords (`login: password`) */
  on: boolean
  /** the signed-in person's name; null = Guest / signed out */
  userName: string | null
  /** signed out and Guest not chosen: the login dialog must be shown */
  needed: boolean
  guestAllowed: boolean
  /** names offered in the dialog (empty = the name is typed) */
  users: CollectUser[]
  /** why the last sign-in ended, for the dialog's first line */
  reason: SignOutReason | null
  /** the id to offer first (the person whose sign-in ended) */
  lastUser: string | null
}

/** What the page shows of the collection. */
export interface CollectView {
  on: boolean
  hasNames: boolean
  needsUser: boolean
  userName: string | null
  users: CollectUser[]
  guestAllowed: boolean
  login: LoginView
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
  /** for tests (given with `client`, it must be the client's own) */
  auth?: AuthSession
  /** for tests: the fetch under the auto service */
  fetch?: typeof fetch
}

export interface CollectHandle {
  service: AutoService
  noteFile(file: Blob): void
  chooseUser(user: string | null): void
  /** password mode: sign in (the password is not kept) */
  signIn(user: string, password: string): Promise<LoginResult>
  /** password mode: send what is queued, then sign out */
  signOut(): Promise<void>
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
  const auth =
    options.auth ??
    new AuthSession({
      baseUrl,
      headers: () => ({ [APP_HEADER]: APP_NAME }),
    })
  const client =
    options.client ??
    new CollectClient({
      baseUrl,
      app: appInfo(options.commit, options.build, options.version),
      auth,
    })
  const calls: ServiceCalls = { calibrate: null, extract: null }
  const wiring = attachCollector(ctx, client, calls)
  const view = (): CollectView => {
    const password = auth.passwordMode
    return {
      on: client.state === 'on',
      hasNames: !password && client.users !== null,
      needsUser: client.needsUserChoice,
      userName: client.userName,
      users: client.users ?? [],
      guestAllowed: client.guestAllowed,
      login: {
        on: password,
        userName: auth.user?.name ?? null,
        needed:
          password &&
          auth.phase === 'signed-out' &&
          !(client.guestChosen && auth.guestAllowed),
        guestAllowed: auth.guestAllowed,
        users: password ? client.users ?? [] : [],
        reason: auth.signOutReason,
        lastUser: auth.lastUserId,
      },
    }
  }
  const unsubscribe = client.subscribe(() => options.onChange(view()))
  // INFO: a new person may see other features (the capabilities answer is
  // per request); asked again when the person changes after the start
  let person: string | null = null
  void auth.ready.then(() => (person = auth.user?.id ?? ''))
  const unsubscribeAuth = auth.subscribe(() => {
    const now = auth.user?.id ?? ''
    if (person === null || now === person) return
    person = now
    if (ctx.autoFeatures.service) void refreshAutoFeatures(ctx)
  })
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
  const baseFetch: typeof fetch =
    options.fetch ?? ((input, init) => fetch(input, init))
  return {
    service: createCollectingAutoService(
      client,
      { baseUrl, fetch: auth.wrapFetch(baseFetch) },
      calls,
    ),
    noteFile: (file) => wiring.noteFile(file),
    chooseUser: (user) => client.chooseUser(user),
    signIn: (user, password) => auth.login(user, password),
    async signOut() {
      // INFO: what this person did is sent with their token while it still
      // works; what fails waits for the next sign-in
      await client.flush()
      await auth.logout()
    },
    stop() {
      unsubscribe()
      unsubscribeAuth()
      wiring.flushPending()
      wiring.detach()
      client.stop()
    },
  }
}
