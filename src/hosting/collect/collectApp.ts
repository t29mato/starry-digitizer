import { watch } from 'vue'
import type { DigitizerContext } from '@/application/digitizerContext'
import type { ProjectDTO } from '@/application/dto/projectDTO'
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
import { ListParams, MyWorkApi, OpenedWork, WorkList } from './myWork'
import { ProjectSaver, SaveView, projectHasWork } from './projectSaver'

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
  /** the work saved on the server (projectSaver.ts) */
  save: SaveView
  /** My work can be listed now (collection on, a name or Guest chosen) */
  myWork: boolean
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
  /** My work: a page of the person's works on the server */
  listWorks(params?: ListParams): Promise<WorkList>
  /** My work: a work's thumbnail (null when none) */
  thumbnail(projectId: string): Promise<Blob | null>
  /**
   * My work's Open: saves the work on screen first, downloads the work
   * (nothing changes when that fails: MyWorkError), hands it to `restore`,
   * and later saves continue that work.
   */
  openWork(
    projectId: string,
    restore: (project: ProjectDTO, image: File) => Promise<void>,
  ): Promise<OpenedWork>
  /** whether the screen holds work (to confirm before replacing it) */
  hasWork(): boolean
  /** File > Start Over: what comes next is a new work on the server */
  newWork(): void
  stop(): void
}

// INFO: Open waits this long for the work on screen to reach the server
const SAVE_BEFORE_OPEN_MS = 5000

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
  const app = appInfo(options.commit, options.build, options.version)
  const client =
    options.client ??
    new CollectClient({
      baseUrl,
      app,
      auth: new AuthSession({
        baseUrl,
        headers: () => ({ [APP_HEADER]: APP_NAME }),
      }),
    })
  // INFO: the client's own login; a client made without one has none (the
  // requests then go out as before, without waiting for a login check)
  const auth = client.auth ?? new AuthSession({ baseUrl })
  if (!client.auth) auth.disable()
  const calls: ServiceCalls = { calibrate: null, extract: null }
  const wiring = attachCollector(ctx, client, calls)
  const baseFetch: typeof fetch =
    options.fetch ?? ((input, init) => fetch(input, init))
  const saver = new ProjectSaver({
    baseUrl,
    app,
    client,
    getProject: () => ctx.projectService.toProjectDTO(),
    getImage: () => wiring.currentImage(),
    fetch: options.fetch,
    onChange: () => options.onChange(view()),
  })
  // INFO: the work goes first when the tab is hidden or closed, the events
  // in the rest of the keepalive budget
  client.onHide = (budget) => saver.flushOnHide(budget)
  const stopWatch = watch(
    () => [ctx.projectService.revision, ctx.canvasHandler.uploadImageUrl],
    () => saver.changed(),
  )
  const myWork = new MyWorkApi({
    baseUrl,
    headers: () => client.headers(),
    fetch: auth.wrapFetch(baseFetch),
  })
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
      save: { ...saver.view },
      myWork: client.canSend && client.user !== undefined,
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
    // INFO: the view's `myWork` depends on it
    options.onChange(view())
  })
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
    listWorks: (params) => myWork.list(params),
    thumbnail: (projectId) => myWork.thumbnail(projectId),
    async openWork(projectId, restore) {
      // INFO: the work on screen reaches the server first (as in wpd-auto),
      // so nothing is lost when the opened one replaces it
      let timer: ReturnType<typeof setTimeout> | undefined
      await Promise.race([
        saver.save(),
        new Promise(
          (resolve) => (timer = setTimeout(resolve, SAVE_BEFORE_OPEN_MS)),
        ),
      ])
      clearTimeout(timer)
      const opened = await myWork.fetchWork(projectId)
      saver.beginOpen()
      try {
        // INFO: the file's name goes into the `image` record and `files`
        wiring.noteFile(opened.image)
        await restore(opened.project, opened.image)
      } catch (error) {
        saver.endOpen()
        throw error
      }
      saver.continueWork(opened.projectId, opened.sha256)
      return opened
    },
    hasWork: () => projectHasWork(ctx.projectService.toProjectDTO()),
    newWork: () => saver.newWork(),
    stop() {
      unsubscribe()
      unsubscribeAuth()
      stopWatch()
      wiring.flushPending()
      wiring.detach()
      saver.stop()
      client.onHide = null
      client.stop()
    },
  }
}
