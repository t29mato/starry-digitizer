#!/usr/bin/env node
// INFO: a browser check of the starryai build (docs/design/starryai-auto.md
// §2.3, scripts/e2e-starryai/README.md). It builds the page like deploy.sh,
// starts a local wpd-auto backend and a same-origin proxy (127.0.0.1 only),
// drives a headless Chromium through the starryai features, takes a
// screenshot of each step and exits non-zero when a check fails.
//
//   node scripts/e2e-starryai/run.mjs [--out DIR] [--no-build]
//
// Environment: CHROME_PATH (a Chromium/headless-shell binary),
// WPD_AUTO_BACKEND (the wpd-auto backend checkout, with its .venv).

import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')
const BACKEND_PORT = 24866
const PAGE_PORT = 24960
const ORIGIN = `http://127.0.0.1:${PAGE_PORT}`
const PAGE_URL = `${ORIGIN}/sd/`
const API = '/wpd-auto/api/v1'
const LOGIN_PASSWORD = 'e2e-only-password'

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
function argValue(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const OUT = path.resolve(
  argValue('--out') ??
    path.join(
      os.tmpdir(),
      `sd-e2e-starryai-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    ),
)
const BUILD = !args.includes('--no-build')
const CHROME =
  process.env.CHROME_PATH ??
  path.join(
    os.homedir(),
    '.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux-arm64/chrome-headless-shell',
  )
const WPD_AUTO_BACKEND =
  process.env.WPD_AUTO_BACKEND ??
  path.join(os.homedir(), 'research/repos/wpd-auto/backend')

const WWW = path.join(OUT, 'www')
// INFO: what deploy.sh gives a real build (VITE_APP_COMMIT / VITE_APP_BUILD
// and VERSION.txt); the build number is raised in step 6b to see the
// new-version bar
const E2E_COMMIT = spawnSync('git', ['rev-parse', 'HEAD'], {
  cwd: REPO,
})
  .stdout.toString()
  .trim()
const E2E_BUILD = '1'
function writeVersionTxt(build) {
  fs.writeFileSync(
    path.join(WWW, 'VERSION.txt'),
    `${E2E_COMMIT}\nversion=e2e\nbuild=${build}\nenvironment=staging\ndeployed=${new Date().toISOString()}\n`,
  )
}
const COLLECT = path.join(OUT, 'collect')
const SHOTS = path.join(OUT, 'shots')

// ---------------------------------------------------------------------------
// results
// ---------------------------------------------------------------------------
const results = [] // {step, name, ok, detail}
const shots = [] // {file, caption}
let currentStep = ''

function check(name, ok, detail = '') {
  results.push({ step: currentStep, name, ok: Boolean(ok), detail })
  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`,
  )
}

async function step(name, fn) {
  currentStep = name
  console.log(`\n== ${name}`)
  try {
    await fn()
  } catch (e) {
    check('the step ran to the end', false, String(e?.stack ?? e))
  }
}

// ---------------------------------------------------------------------------
// console / page errors
// ---------------------------------------------------------------------------
// INFO: the known noise, each with its reason. Anything else on the console
// at "error" level, and every uncaught error, fails the run.
const ALLOWED_CONSOLE = [
  {
    // the wpd-auto backend has no /auth/* yet; the page then keeps the name
    // choice (docs/design/starryai-auto.md §11.2). Chromium logs the 404.
    why: 'backend has no /auth/status yet (404 = names, not passwords)',
    test: (text, url) =>
      /Failed to load resource/.test(text) &&
      url.endsWith(`${API}/auth/status`),
  },
  {
    // Server Extraction / Auto digitize against a backend without weights:
    // the extract request fails on purpose in the "extraction" step
    why: 'extract without weights fails by design in this check',
    test: (text, url) =>
      /Failed to load resource/.test(text) && url.includes(`${API}/extract?`),
  },
  {
    // a backend without the starry-digitizer project format (P1) refuses the
    // work with 400; the page then stops sending it quietly
    // (docs/design/starryai-auto.md §3.2(c)). Chromium logs the 400.
    why: 'backend without the project format refuses /collect/project (400)',
    test: (text, url) =>
      /status of 400/.test(text) && url.endsWith(`${API}/collect/project`),
  },
  {
    // the wrong password in the login step: Chromium logs the 401
    why: 'wrong password on purpose in the login step',
    test: (text, url) =>
      /Failed to load resource/.test(text) && url.endsWith(`${API}/auth/login`),
  },
  {
    // <StarryDigitizer> logs every error it emits to the host
    // (StarryDigitizer.vue onError); here the expected 503 of extract
    why: 'the digitizer logs the error it shows (extract without weights)',
    test: (text, url, step) =>
      /^\[starry-digitizer\] DigitizerError: The auto service failed \(HTTP 503, method_unavailable: weights_missing\)/.test(
        text,
      ) && /^[78] /.test(step),
  },
]
const problems = [] // {kind, text, url, step}

function watchPage(page, label) {
  page.on('pageerror', (e) =>
    problems.push({ kind: 'pageerror', text: e.message, step: currentStep }),
  )
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    const url = msg.location()?.url ?? ''
    const allowed = ALLOWED_CONSOLE.find((a) => a.test(text, url, currentStep))
    if (allowed) return
    problems.push({
      kind: `console.error (${label})`,
      text,
      url,
      step: currentStep,
    })
  })
  page.on('dialog', (dialog) => dialog.accept())
}

// ---------------------------------------------------------------------------
// page helpers
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function shot(page, name, caption) {
  const file = `${String(shots.length + 1).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: path.join(SHOTS, file), fullPage: true })
  shots.push({ file, caption, step: currentStep })
}

async function textOf(page, selector) {
  return page.$eval(selector, (e) => e.innerText).catch(() => null)
}

async function waitText(page, selector, pattern, timeout = 30000) {
  await page.waitForFunction(
    (sel, src, flags) => {
      const el = document.querySelector(sel)
      return !!el && new RegExp(src, flags).test(el.innerText)
    },
    { timeout },
    selector,
    pattern.source,
    pattern.flags,
  )
  return textOf(page, selector)
}

async function clickButton(page, text, scope = '') {
  const handles = await page.$$(`${scope} button`)
  for (const h of handles) {
    const t = await h.evaluate((e) => e.innerText.trim())
    if (t.toLowerCase() === text.toLowerCase()) {
      await h.click()
      return
    }
  }
  throw new Error(`no button "${text}" in "${scope || 'page'}"`)
}

async function axisValues(page) {
  return page.evaluate(() =>
    Object.fromEntries(
      ['x1', 'x2', 'y1', 'y2'].map((n) => [
        n,
        document.querySelector(`[data-cy=${n}-value]`)?.value ?? null,
      ]),
    ),
  )
}

async function menu(page, title, item) {
  await page.click(`[data-cy=menu-${title}]`)
  await page.waitForSelector(`[data-cy=menu-item-${item}]`, { visible: true })
  await page.click(`[data-cy=menu-item-${item}]`)
}

// a click on the figure at image pixel (x, y), whatever the zoom
async function clickImage(page, x, y) {
  const box = await page.$eval('[data-cy=image-canvas]', (c) => {
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, scale: r.width / 1180 }
  })
  await page.mouse.click(box.x + x * box.scale, box.y + y * box.scale)
  await sleep(150)
}

async function waitForImage(page) {
  await page.waitForFunction(
    () => {
      const c = document.querySelector('[data-cy=image-canvas]')
      return !!c && c.width > 0 && c.height > 0
    },
    { timeout: 30000 },
  )
  await sleep(500)
}

// ---------------------------------------------------------------------------
// servers
// ---------------------------------------------------------------------------
const children = []

function start(cmd, argv, opts, logName) {
  const log = fs.openSync(path.join(OUT, logName), 'a')
  const child = spawn(cmd, argv, {
    ...opts,
    stdio: ['ignore', log, log],
    detached: true,
  })
  children.push(child)
  return child
}

// INFO: waits until every server has exited (SIGKILL after 10 s), so the
// ports are free when this script returns
async function stopAll() {
  const signal = (child, sig) => {
    try {
      process.kill(-child.pid, sig)
    } catch {
      // already gone
    }
  }
  await Promise.all(
    children.map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null)
            return resolve()
          const timer = setTimeout(() => signal(child, 'SIGKILL'), 10000)
          child.once('exit', () => {
            clearTimeout(timer)
            resolve()
          })
          signal(child, 'SIGTERM')
        }),
    ),
  )
}

function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer()
    s.once('error', () => resolve(false))
    s.once('listening', () => s.close(() => resolve(true)))
    s.listen(port, '127.0.0.1')
  })
}

async function waitHttp(url, timeoutMs = 60000) {
  const until = Date.now() + timeoutMs
  while (Date.now() < until) {
    try {
      const r = await fetch(url)
      if (r.ok) return
    } catch {
      // not up yet
    }
    await sleep(300)
  }
  throw new Error(`${url} did not answer in ${timeoutMs} ms`)
}

// ---------------------------------------------------------------------------
// the report page (served by `python3 -m http.server`, see README)
// ---------------------------------------------------------------------------
function escapeHtml(s) {
  return String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )
}

function writeReport(summary) {
  const rows = results
    .map(
      (r) =>
        `<tr class="${r.ok ? 'ok' : 'ng'}"><td>${
          r.ok ? 'ok' : 'FAIL'
        }</td><td>${escapeHtml(r.step)}</td><td>${escapeHtml(
          r.name,
        )}</td><td>${escapeHtml(r.detail).slice(0, 600)}</td></tr>`,
    )
    .join('\n')
  const figs = shots
    .map(
      (s) =>
        `<figure><figcaption><b>${escapeHtml(s.file)}</b> — ${escapeHtml(
          s.caption,
        )}</figcaption><img src="shots/${escapeHtml(s.file)}" alt="${escapeHtml(
          s.caption,
        )}" loading="lazy"></figure>`,
    )
    .join('\n')
  const probs = problems
    .map(
      (p) =>
        `<li>${escapeHtml(p.kind)} [${escapeHtml(p.step)}] ${escapeHtml(
          p.text,
        )} ${escapeHtml(p.url ?? '')}</li>`,
    )
    .join('\n')
  const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>starryai browser check</title>
<style>
:root { --bg: #fff; --fg: #1a1a1a; --ok: #1b7f3b; --ng: #b3261e; --line: #ddd; }
@media (prefers-color-scheme: dark) { :root { --bg: #161616; --fg: #e8e8e8; --ok: #6fcf8a; --ng: #ff8a80; --line: #333; } }
body { background: var(--bg); color: var(--fg); font: 14px/1.5 system-ui, sans-serif; margin: 0 auto; max-width: 1200px; padding: 16px; }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
td { border-bottom: 1px solid var(--line); padding: 3px 6px; vertical-align: top; word-break: break-word; }
tr.ok td:first-child { color: var(--ok); } tr.ng td:first-child { color: var(--ng); font-weight: bold; }
figure { margin: 24px 0; } img { max-width: 100%; border: 1px solid var(--line); }
</style></head><body>
<h1>starryai browser check</h1>
<p>${escapeHtml(summary)}</p>
<h2>Checks</h2><table>${rows}</table>
<h2>Console errors and uncaught errors (not allow-listed)</h2><ul>${
    probs || '<li>none</li>'
  }</ul>
<h2>Screenshots</h2>${figs}
</body></html>
`
  fs.writeFileSync(path.join(OUT, 'index.html'), html)
  fs.writeFileSync(
    path.join(OUT, 'result.json'),
    JSON.stringify({ summary, results, problems, shots }, null, 2),
  )
}

// ---------------------------------------------------------------------------
// the request interception used by some steps
// ---------------------------------------------------------------------------
// INFO: the local backend has no model weights and no /auth/* yet, so two
// steps stand in for the server with fixed answers in the browser:
// - "extraction": /capabilities also lists markernet, and /extract/methods
//   says markernet is available (as on starryai with the weights). The
//   extract request itself still goes to the real backend (and fails there).
// - "login": /auth/* answers as wpd-auto's draft API (docs/user-passwords.md
//   0.0.2). Everything else goes to the real backend.
// INFO: for the legend steps: an extract answer the backend would give with
// MarkerNet weights, made by hand from sample_graph_curve.png (Blue and Red
// markers, backend pixels), and a VLM legend answer (fake.legend). With
// fake.legend null the real /legend answers (no VLM here: vlm_unavailable).
const fake = { extract: false, legend: null }
const yPx = (v) => Math.round(1129 - 73 * v)
const FAKE_EXTRACT = {
  method: 'markernet',
  elapsed_ms: 12,
  series: [
    { label: 'square', vals: [4, 6, 7.2, 8.1, 9] },
    { label: 'square', vals: [7, 9, 10.8, 12.5, 14] },
  ].map((s) => ({
    label: s.label,
    score: 0.9,
    points: s.vals.map((v, i) => [164 + 237.2 * i, yPx(v)]),
    point_scores: s.vals.map(() => 0.9),
  })),
}
const FAKE_LEGEND = {
  status: 'ok',
  reason: null,
  elapsed_ms: 20,
  legend: {
    legend: { source: 'vlm' },
    assignments: [
      { series_id: 's0', label: 'Blue', confidence: 0.92 },
      { series_id: 's1', label: 'Red', confidence: 0.4 },
    ],
    draft_order: ['s0', 's1'],
  },
}

async function interceptExtraction(page) {
  await page.setRequestInterception(true)
  page.on('request', async (req) => {
    const url = new URL(req.url())
    if (req.isInterceptResolutionHandled()) return
    if (fake.extract && url.pathname === `${API}/extract`) {
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FAKE_EXTRACT),
      })
    }
    if (fake.legend && url.pathname === `${API}/legend`) {
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fake.legend),
      })
    }
    if (url.pathname === `${API}/capabilities`) {
      const r = await fetch(
        `http://127.0.0.1:${BACKEND_PORT}/api/v1/capabilities`,
      )
      const body = await r.json()
      body.features = [...new Set([...(body.features ?? []), 'markernet'])]
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    }
    if (url.pathname === `${API}/extract/methods`) {
      const r = await fetch(
        `http://127.0.0.1:${BACKEND_PORT}/api/v1/extract/methods`,
      )
      const body = await r.json()
      for (const m of body.methods ?? []) {
        if (m.id === 'markernet') {
          m.available = true
          m.unavailable_reason = null
        }
      }
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    }
    return req.continue()
  })
}

const loginLog = { tokens: new Set(), calls: [], tokenHeaders: [] }

async function interceptLogin(page) {
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    if (req.isInterceptResolutionHandled()) return
    const url = new URL(req.url())
    const json = (status, body, headers = {}) =>
      req.respond({
        status,
        contentType: 'application/json',
        headers,
        body: JSON.stringify(body),
      })
    if (url.pathname.startsWith(API)) {
      const token = req.headers()['x-wpd-token']
      loginLog.tokenHeaders.push({
        path: url.pathname.slice(API.length),
        token: token
          ? loginLog.tokens.has(token)
            ? 'valid'
            : 'unknown'
          : null,
        user: req.headers()['x-wpd-user'] ?? null,
      })
    }
    if (url.pathname === `${API}/auth/status`) {
      return json(200, { login: 'password', guest: true })
    }
    if (url.pathname === `${API}/auth/login` && req.method() === 'POST') {
      let body = {}
      try {
        body = JSON.parse(req.postData() ?? '{}')
      } catch {
        body = {}
      }
      loginLog.calls.push({
        user: body.user,
        passwordGiven: Boolean(body.password),
      })
      if (body.user !== 'alice' || body.password !== LOGIN_PASSWORD) {
        return json(401, { error: 'invalid_login', detail: 'invalid_login' })
      }
      const token = `e2e-token-${Date.now()}`
      loginLog.tokens.add(token)
      return json(200, {
        token,
        user: { id: 'alice', name: 'Alice Example' },
        expires_at: new Date(Date.now() + 86400000)
          .toISOString()
          .replace(/\.\d+Z$/, 'Z'),
      })
    }
    if (url.pathname === `${API}/auth/me`) {
      const token = req.headers()['x-wpd-token']
      if (!loginLog.tokens.has(token))
        return json(401, { error: 'invalid_token' })
      return json(200, {
        user: { id: 'alice', name: 'Alice Example' },
        expires_at: new Date(Date.now() + 86400000)
          .toISOString()
          .replace(/\.\d+Z$/, 'Z'),
      })
    }
    if (url.pathname === `${API}/auth/logout`) {
      loginLog.tokens.delete(req.headers()['x-wpd-token'])
      return req.respond({ status: 204, body: '' })
    }
    return req.continue()
  })
}

// ---------------------------------------------------------------------------
// the steps
// ---------------------------------------------------------------------------
// INFO: sample_graph_curve.png (1180×980), where the backend's calibration
// put the ticks (checked once with curl): x 1..5 at x=164,401,638,875,1113
// on y=873; y 14..4 at y=107,253,399,545,691,837 on x=116. The manual
// markers use other ticks than Apply picks, so the values have to be read.
const MANUAL_MARKERS = {
  x1: { x: 401, y: 873, value: 2 },
  x2: { x: 875, y: 873, value: 4 },
  y1: { x: 116, y: 691, value: 6 },
  y2: { x: 116, y: 253, value: 12 },
}

async function mainSession(browser) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1400, height: 900 })
  watchPage(page, 'main')
  const apiCalls = []
  page.on('response', (r) => {
    const u = new URL(r.url())
    if (u.pathname.startsWith(API))
      apiCalls.push(
        `${r.request().method()} ${u.pathname.slice(API.length)} ${r.status()}`,
      )
  })

  await step('1 load: research notice and the name dialog', async () => {
    await page.goto(PAGE_URL, { waitUntil: 'networkidle0' })
    await waitForImage(page)
    const inline = await textOf(page, '[data-cy=collect-notice]')
    check(
      'the research notice is on the page',
      /saved on the NIMS server for research/.test(inline ?? ''),
      inline ?? 'missing',
    )
    await page.waitForSelector('[data-cy=collect-user-alice]', {
      visible: true,
      timeout: 10000,
    })
    const dialog = await textOf(page, '[data-cy=collect-user-dialog]')
    check(
      'the "Who is working?" names are offered',
      /alice example/i.test(dialog ?? ''),
      dialog ?? '',
    )
    check(
      'the dialog repeats the notice',
      /saved on the NIMS server for research/.test(dialog ?? ''),
    )
    check(
      'nothing is sent to /collect/events before a name is chosen',
      !apiCalls.some((c) => c.startsWith('POST /collect/events')),
      apiCalls.join(', '),
    )
    await shot(
      page,
      'notice-and-names',
      'First load: the research notice (left, footer) and the name dialog',
    )
  })

  await step('2 choose a name: footer', async () => {
    await page.click('[data-cy=collect-user-alice]')
    await sleep(500)
    const footer = await textOf(page, 'footer')
    check(
      'the footer names the person',
      /Name: Alice Example/.test(footer ?? ''),
      footer ?? '',
    )
    check(
      'the footer has the notice',
      /saved on the NIMS server for research/.test(footer ?? ''),
    )
    const hours = await textOf(page, '[data-cy=auto-hours]')
    check(
      'the footer has the supported hours (F7)',
      /Automatic features are supported 09:00–17:00 \(Asia\/Tokyo\)\. Manual digitizing works at any time\./.test(
        hours ?? '',
      ),
      hours ?? 'missing',
    )
    await sleep(1500)
    check(
      'events are sent once a name is chosen',
      apiCalls.some((c) => c.startsWith('POST /collect/events 200')),
      apiCalls.filter((c) => c.includes('collect')).join(', '),
    )
    await shot(
      page,
      'name-chosen',
      'Alice Example chosen; the footer shows the name',
    )
  })

  await step('3 Axis Auto-place (real /calibrate) and Apply', async () => {
    const panel = await textOf(page, '[data-cy=auto-place]')
    check('the Axis Auto-place panel is shown', panel !== null, panel ?? '')
    const plotChoice = await page.$('[data-cy=auto-place-plot]')
    check(
      'no Bar choice (the backend does not list auto_axis_bar)',
      plotChoice === null,
    )
    await page.click('[data-cy=auto-place-request]')
    const proposal = await waitText(
      page,
      '[data-cy=auto-place-proposal]',
      /ticks/,
      60000,
    )
    check(
      'a proposal for x and y',
      /x:\s*linear/.test(proposal) && /y:\s*linear/.test(proposal),
      proposal,
    )
    await shot(
      page,
      'auto-place-proposal',
      'Auto-place: the proposal from the real /calibrate (before Apply)',
    )
    await page.click('[data-cy=auto-place-apply]')
    await sleep(500)
    const v = await axisValues(page)
    const nums = Object.values(v).map(Number)
    check(
      'Apply fills the four axis values',
      Object.values(v).every((s) => s !== null && s !== '') &&
        nums.every(Number.isFinite),
      JSON.stringify(v),
    )
    check(
      'the values are ticks of the figure (x 1..5, y 4..14)',
      [v.x1, v.x2].every((s) => ['1', '2', '3', '4', '5'].includes(s)) &&
        [v.y1, v.y2].every((s) =>
          ['4', '6', '8', '10', '12', '14'].includes(s),
        ) &&
        v.x1 !== v.x2 &&
        v.y1 !== v.y2,
      JSON.stringify(v),
    )
    await shot(
      page,
      'auto-place-applied',
      'Auto-place applied: the four axis values filled',
    )
  })

  await step('4 manual markers and Auto-fill values (service)', async () => {
    await clickButton(page, 'Clear XY Axes')
    await sleep(300)
    await page.click('[data-cy=calibration-mode-4]')
    await sleep(200)
    for (const name of ['x1', 'x2', 'y1', 'y2']) {
      await clickImage(page, MANUAL_MARKERS[name].x, MANUAL_MARKERS[name].y)
    }
    const label = await textOf(page, '[data-cy=auto-fill-values]')
    check(
      'the button says "Auto-fill values" (service), not "(OCR)"',
      /^auto-fill values$/i.test((label ?? '').trim()),
      label ?? '',
    )
    await page.click('[data-cy=auto-fill-values]')
    const note = await waitText(
      page,
      '[data-cy=auto-fill-note]',
      /Read by|browser OCR/,
      90000,
    )
    const v = await axisValues(page)
    const want = Object.fromEntries(
      Object.entries(MANUAL_MARKERS).map(([k, m]) => [k, String(m.value)]),
    )
    check(
      'the four values are read right (2, 4, 6, 12)',
      JSON.stringify(v) === JSON.stringify(want),
      `got ${JSON.stringify(v)}`,
    )
    check(
      'the note says the service read all four',
      /Read by the auto service: x1, x2, y1, y2\./.test(note) &&
        !/browser OCR/.test(note),
      note,
    )
    await shot(
      page,
      'auto-fill-values',
      'Manual markers (2, 4 / 6, 12) and Auto-fill values with the note',
    )
  })

  await step('5 Help > About with Components', async () => {
    await menu(page, 'help', 'about')
    await page.waitForSelector('[data-cy=about-dialog]', { visible: true })
    const version = await textOf(page, '[data-cy=about-page-version]')
    check(
      'About shows the page version',
      /2\.0\.0/.test(version ?? ''),
      version ?? '',
    )
    await page.waitForSelector('[data-cy=auto-components] summary', {
      visible: true,
      timeout: 10000,
    })
    await page.click('[data-cy=auto-components] summary')
    const comps = await waitText(
      page,
      '[data-cy=auto-components]',
      /markernet|MarkerNet|PlotRuler/i,
      30000,
    )
    check(
      'Components lists the backend parts',
      /PlotRuler|calibration/i.test(comps),
      comps.slice(0, 400),
    )
    check(
      'Components says MarkerNet has no weights',
      /weights/i.test(comps),
      '',
    )
    await shot(
      page,
      'about-components',
      'Help > About with Components expanded',
    )
    await page.click('[data-cy=about-close]')
    await sleep(300)
  })

  await step('6 Start over (keep image) and Undo', async () => {
    // a point, so there is data to clear as well as axes
    await clickImage(page, 638, 545)
    const before = await axisValues(page)
    await page.click('[data-cy=start-over-button]')
    await sleep(800)
    const after = await axisValues(page)
    const imageKept = await page.$eval(
      '[data-cy=image-canvas]',
      (c) => c.width > 0,
    )
    check(
      'Start over resets the axis values',
      JSON.stringify(after) !== JSON.stringify(before),
      `before ${JSON.stringify(before)}, after ${JSON.stringify(after)}`,
    )
    check('the image stays', imageKept)
    const notes = await page.evaluate(() => ({
      autoFill:
        document.querySelector('[data-cy=auto-fill-note]')?.innerText ?? null,
      autoPlace:
        document.querySelector('[data-cy=auto-place]')?.innerText ?? '',
    }))
    check(
      'no note about the removed markers is left (Auto-fill, Auto-place "Applied")',
      notes.autoFill === null && !/Applied — drag/.test(notes.autoPlace),
      JSON.stringify(notes),
    )
    await shot(
      page,
      'start-over',
      'Start over (keep image): axes and data cleared, the image kept',
    )
    await menu(page, 'edit', 'undo')
    await sleep(800)
    const undone = await axisValues(page)
    check(
      'Undo brings the axis values back',
      JSON.stringify(undone) === JSON.stringify(before),
      JSON.stringify(undone),
    )
    await shot(
      page,
      'start-over-undo',
      'Edit > Undo after Start over: the axes are back',
    )
  })

  await step('6b a new version on the server: the Reload bar', async () => {
    check(
      'no bar while the served version is the running one',
      !(await page.$('[data-cy=version-notice]')),
    )
    writeVersionTxt('2')
    // INFO: the page looks again when the tab is shown (versionCheck.ts)
    await page.evaluate(() =>
      document.dispatchEvent(new Event('visibilitychange')),
    )
    const bar = await page
      .waitForSelector('[data-cy=version-notice]', { timeout: 5000 })
      .catch(() => null)
    check('the bar appears after the build number changed', Boolean(bar))
    await shot(page, 'version-notice', 'A new build was deployed: Reload bar')
    if (bar) await page.click('[data-cy=version-notice-close]')
    writeVersionTxt(E2E_BUILD)
  })

  // INFO: closing the page sends the queued events (pagehide, keepalive)
  await sleep(1500)
  await page.close({ runBeforeUnload: true })
  await sleep(1500)
  await context.close()
  return apiCalls
}

async function extractionSession(browser) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1400, height: 1000 })
  watchPage(page, 'extraction')
  await interceptExtraction(page)

  await step(
    '7 Server Extraction (markernet allowed in the browser; LineFormer as the server says)',
    async () => {
      await page.goto(PAGE_URL, { waitUntil: 'networkidle0' })
      await waitForImage(page)
      await page.waitForSelector('[data-cy=collect-user-dialog]', {
        visible: true,
        timeout: 10000,
      })
      await page.click('[data-cy=collect-user-guest]')
      await sleep(300)
      await page.waitForSelector('[data-cy=server-extraction]', {
        visible: true,
        timeout: 10000,
      })
      const lines = await page.$$eval(
        '[data-cy=server-extraction-unavailable]',
        (els) => els.map((e) => e.innerText),
      )
      check(
        'LineFormer is listed as not available now, with the reason',
        lines.some((l) => /LineFormer.*not available now \(\w+\)/.test(l)),
        JSON.stringify(lines),
      )
      const hours = await textOf(page, '[data-cy=server-extraction-hours]')
      check(
        'the hours caption',
        /Automatic features are supported 09:00–17:00 \(Asia\/Tokyo\)\. Manual digitizing works at any time\./.test(
          hours ?? '',
        ),
        hours ?? 'missing',
      )
      const attribution = await textOf(
        page,
        '[data-cy=server-extraction-attribution]',
      )
      check(
        'the method attribution is shown',
        Boolean(attribution),
        attribution ?? '',
      )
      await page.evaluate(() =>
        document.querySelector('[data-cy=server-extraction]').scrollIntoView(),
      )
      await shot(
        page,
        'server-extraction',
        'Server Extraction: LineFormer not available now, the hours caption',
      )

      await page.click('[data-cy=server-extraction-run]')
      await page.waitForFunction(
        () =>
          !document
            .querySelector('[data-cy=server-extraction-run]')
            ?.textContent.includes('…'),
        { timeout: 60000 },
      )
      await sleep(300)
      const panel = await textOf(page, '[data-cy=server-extraction]')
      const errorLine = await page
        .$eval('[data-cy=server-extraction] .c__error', (e) => e.innerText)
        .catch(() => '')
      check(
        'the error and the hours note are two sentences',
        !/is not set Automatic/.test(errorLine) &&
          (!/Automatic features/.test(errorLine) ||
            /[.!?] Automatic features/.test(errorLine)),
        errorLine,
      )
      check(
        'Extract without weights shows an error in the panel (no crash)',
        /fail|error|not available|weights|HTTP/i.test(panel ?? ''),
        (panel ?? '')
          .split('\n')
          .filter((l) => /fail|error|HTTP|weights/i.test(l))
          .join(' | '),
      )
      await shot(
        page,
        'server-extraction-error',
        'Extract with MarkerNet against a backend without weights: the error line',
      )
    },
  )

  await step(
    '7b legend naming: no VLM on the backend (extract answered in the browser)',
    async () => {
      fake.extract = true
      await page.click('[data-cy=server-extraction-run]')
      const caption = await waitText(
        page,
        '[data-cy=legend-naming-caption]',
        /Legend not read/,
        60000,
      )
      check(
        'the caption says the legend reader is not running (real /legend)',
        /Legend not read: the legend reader is not running\./.test(caption),
        caption,
      )
      const names = await page.$$eval('.c__dataset-row input', (els) =>
        els.map((e) => e.value),
      )
      check(
        'two drafts from the extract answer (they take the empty dataset’s place)',
        names.length === 2 && names.every((n) => /\(markernet\)/.test(n)),
        JSON.stringify(names),
      )
      await page.evaluate(() =>
        document.querySelector('[data-cy=server-extraction]').scrollIntoView(),
      )
      await shot(
        page,
        'legend-not-read',
        'Extract (answer made in the browser) and the real /legend without a VLM: the caption',
      )
    },
  )

  await step(
    '7c legend naming: a VLM answer (legend answered in the browser)',
    async () => {
      fake.legend = FAKE_LEGEND
      await page.click('[data-cy=server-extraction-run]')
      const named = await waitText(
        page,
        '[data-cy=legend-naming-named]',
        /Blue/,
        30000,
      )
      check(
        'the confident name is applied with the "auto" mark',
        /auto\s*Blue/.test(named),
        named,
      )
      const suggestion = await textOf(
        page,
        '[data-cy=legend-naming-suggestion]',
      )
      check(
        'the unsure name is a suggestion with "Use this name"',
        /Red\?/.test(suggestion ?? '') &&
          /Use this name/i.test(suggestion ?? ''),
        suggestion ?? '',
      )
      let names = await page.$$eval('.c__dataset-row input', (els) =>
        els.map((e) => e.value),
      )
      check(
        'a draft is named "Blue" (the legend text only)',
        names.includes('Blue'),
        JSON.stringify(names),
      )
      await page.evaluate(() =>
        document.querySelector('[data-cy=server-extraction]').scrollIntoView(),
      )
      await shot(
        page,
        'legend-named',
        'Legend reader answer: "Blue" named (auto), "Red?" offered',
      )
      await page.click('[data-cy=legend-naming-accept]')
      await sleep(300)
      names = await page.$$eval('.c__dataset-row input', (els) =>
        els.map((e) => e.value),
      )
      check(
        '"Use this name" names the other draft "Red"',
        names.includes('Red'),
        JSON.stringify(names),
      )
      fake.extract = false
      fake.legend = null
    },
  )

  await step('8 Auto digitize panel', async () => {
    const panel = await textOf(page, '[data-cy=auto-digitize]')
    check(
      'the Auto digitize panel is shown',
      panel !== null,
      (panel ?? '').slice(0, 200),
    )
    await page.click('[data-cy=auto-digitize-run]')
    await page.waitForSelector('[data-cy=auto-digitize-result]', {
      visible: true,
      timeout: 90000,
    })
    const result = await textOf(page, '[data-cy=auto-digitize-result]')
    check(
      'Auto digitize ends with a result line (extract fails without weights)',
      Boolean(result),
      (result ?? '').replace(/\n/g, ' | '),
    )
    await page.evaluate(() =>
      document.querySelector('[data-cy=auto-digitize]').scrollIntoView(),
    )
    await shot(
      page,
      'auto-digitize',
      'Auto digitize: calibrate ok, extract fails without weights',
    )
  })

  await page.close({ runBeforeUnload: true })
  await sleep(1000)
  await context.close()
}

async function loginSession(browser) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1400, height: 900 })
  watchPage(page, 'login')
  await interceptLogin(page)

  await step('9 sign in (draft /auth/* answered in the browser)', async () => {
    await page.goto(PAGE_URL, { waitUntil: 'networkidle0' })
    await waitForImage(page)
    await page.waitForSelector('[data-cy=login-dialog]', {
      visible: true,
      timeout: 10000,
    })
    const names = await page.$$('[data-cy=collect-user-dialog]')
    let nameDialogVisible = false
    for (const n of names) nameDialogVisible ||= await n.isVisible()
    check(
      'only the Sign in dialog is open (not also "Who is working?")',
      !nameDialogVisible,
    )
    await shot(page, 'login-dialog', 'Sign in dialog (password mode)')
    await page.select('[data-cy=login-name]', 'alice')
    await page.type('[data-cy=login-password]', 'wrong')
    await page.click('[data-cy=login-submit]')
    const error = await waitText(page, '[data-cy=login-error]', /./, 10000)
    check(
      'a wrong password says so',
      /The name or password is not correct\./.test(error),
      error,
    )
    const cleared = await page.$eval('[data-cy=login-password]', (e) => e.value)
    check('the password field is cleared after sending', cleared === '')
    await shot(page, 'login-wrong-password', 'Sign in with a wrong password')
    await page.type('[data-cy=login-password]', LOGIN_PASSWORD)
    await page.keyboard.press('Enter')
    await waitText(
      page,
      '[data-cy=auth-status]',
      /Signed in as Alice Example/,
      10000,
    )
    const status = await textOf(page, '[data-cy=auth-status]')
    check(
      'the footer says "Signed in as Alice Example"',
      /Signed in as Alice Example/.test(status ?? ''),
      status ?? '',
    )
    await sleep(300)
    const stillOpen = await page
      .$eval('[data-cy=login-dialog]', (e) => e.offsetParent !== null)
      .catch(() => false)
    check('the dialog closes after signing in', !stillOpen)
    await shot(page, 'signed-in', 'Signed in: the footer')
    // an auto request after signing in carries the token, not X-WPD-User
    loginLog.tokenHeaders.length = 0
    await page.click('[data-cy=auto-place-request]')
    await waitText(page, '[data-cy=auto-place-proposal]', /ticks/, 60000)
    await page.click('[data-cy=auto-place-apply]')
    // the events go out in batches (4 s) after the calibration settles (2 s)
    for (let i = 0; i < 40; i++) {
      if (loginLog.tokenHeaders.some((h) => h.path === '/collect/events')) break
      await sleep(500)
    }
    const calibrate = loginLog.tokenHeaders.find((h) => h.path === '/calibrate')
    check(
      '/calibrate carries the token and no X-WPD-User',
      calibrate?.token === 'valid' && calibrate?.user === null,
      JSON.stringify(calibrate),
    )
    const events = loginLog.tokenHeaders.filter(
      (h) => h.path === '/collect/events',
    )
    check(
      'the events carry the token',
      events.length > 0 &&
        events.every((h) => h.token === 'valid' && h.user === null),
      JSON.stringify(loginLog.tokenHeaders),
    )
    await page.click('[data-cy=auth-sign-out]')
    await page.waitForSelector('[data-cy=login-dialog]', {
      visible: true,
      timeout: 10000,
    })
    check('Sign out opens the Sign in dialog again', true)
    await shot(page, 'signed-out', 'After Sign out')
  })

  await page.close()
  await context.close()
}

function checkEvents() {
  currentStep = '10 research events reached the backend'
  console.log(`\n== ${currentStep}`)
  const dir = path.join(COLLECT, 'events')
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'))
    : []
  const rows = files.flatMap((f) =>
    fs
      .readFileSync(path.join(dir, f), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l)),
  )
  check(
    'events/*.jsonl has rows',
    rows.length > 0,
    `${rows.length} rows in ${files.join(', ')}`,
  )
  const clients = [...new Set(rows.map((r) => r.client))]
  check(
    'every row has client starry-digitizer',
    clients.length === 1 && clients[0] === 'starry-digitizer',
    JSON.stringify(clients),
  )
  const types = [
    ...new Set(rows.filter((r) => r.source === 'client').map((r) => r.type)),
  ]
  for (const t of [
    'session.start',
    'image',
    'calibration.auto',
    'calibration.final',
    'edit',
    'undo',
  ]) {
    check(`a "${t}" event`, types.includes(t), '')
  }
  const startOver = rows.some(
    (r) =>
      r.type === 'edit' &&
      JSON.stringify(r.data ?? {}).includes('project.start-over'),
  )
  check('Start over is recorded (edit project.start-over)', startOver)
  const alice = rows.filter((r) => r.user === 'alice')
  check(
    'the main session is stored as alice',
    alice.length > 0,
    `${alice.length} rows`,
  )
  const serverCal = rows.filter((r) => r.type === 'server.calibrate')
  check('server.calibrate rows', serverCal.length >= 2, `${serverCal.length}`)
  return { rows: rows.length, types }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  fs.mkdirSync(SHOTS, { recursive: true })
  fs.mkdirSync(COLLECT, { recursive: true })
  console.log(`out: ${OUT}`)
  for (const port of [BACKEND_PORT, PAGE_PORT]) {
    if (!(await portFree(port)))
      throw new Error(`port ${port} is in use; stop what is there first`)
  }
  if (!fs.existsSync(CHROME))
    throw new Error(`no browser at ${CHROME} (set CHROME_PATH)`)
  const python = path.join(WPD_AUTO_BACKEND, '.venv/bin/python')
  if (!fs.existsSync(python))
    throw new Error(`no ${python} (set WPD_AUTO_BACKEND)`)

  if (BUILD) {
    console.log('building the starryai page…')
    const r = spawnSync(
      'npx',
      [
        'vite',
        'build',
        '--base=/sd/',
        '--outDir',
        WWW,
        '--emptyOutDir',
      ],
      {
        cwd: REPO,
        stdio: [
          'ignore',
          fs.openSync(path.join(OUT, 'build.log'), 'w'),
          fs.openSync(path.join(OUT, 'build.log'), 'a'),
        ],
        env: {
          ...process.env,
          STARRY_DIGITIZER_PWA: 'off',
          STARRY_DIGITIZER_ANALYTICS: 'off',
          VITE_OCR_ASSET_DIR: 'tesseract',
          VITE_AUTO_SERVICE_URL: API,
          VITE_APP_COMMIT: E2E_COMMIT,
          VITE_APP_BUILD: E2E_BUILD,
        },
      },
    )
    if (r.status !== 0)
      throw new Error(`vite build failed; see ${path.join(OUT, 'build.log')}`)
  } else if (!fs.existsSync(path.join(WWW, 'index.html'))) {
    throw new Error(`--no-build needs an earlier build in ${WWW}`)
  }
  // INFO: as deploy/deploy.sh writes it; the page's new-version check reads it
  writeVersionTxt(E2E_BUILD)

  // INFO: two names, so the page asks "Who is working?" (COLLECT.md)
  fs.writeFileSync(
    path.join(COLLECT, 'users.json'),
    JSON.stringify({
      v: 1,
      guest: true,
      users: [
        {
          id: 'alice',
          name: 'Alice Example',
          enabled: true,
          added_at: '2026-11-24T00:00:00Z',
        },
        {
          id: 'bob',
          name: 'Bob',
          enabled: true,
          added_at: '2026-11-24T00:00:00Z',
        },
      ],
    }),
  )

  start(
    python,
    [
      '-m',
      'uvicorn',
      'wpd_auto_api.main:app',
      '--host',
      '127.0.0.1',
      '--port',
      String(BACKEND_PORT),
    ],
    {
      cwd: WPD_AUTO_BACKEND,
      env: {
        ...process.env,
        PYTHONPATH: 'src',
        PYTHONDONTWRITEBYTECODE: '1',
        WPD_AUTO_COLLECT_DIR: COLLECT,
        WPD_AUTO_ENVIRONMENT: 'staging',
        WPD_AUTO_AUTO_HOURS: '09:00-17:00',
        WPD_AUTO_AUTO_TIMEZONE: 'Asia/Tokyo',
      },
    },
    'backend.log',
  )
  start(
    'python3',
    [
      '-I',
      path.join(HERE, 'sameorigin.py'),
      WWW,
      `http://127.0.0.1:${BACKEND_PORT}`,
      String(PAGE_PORT),
    ],
    {},
    'proxy.log',
  )
  await waitHttp(`http://127.0.0.1:${BACKEND_PORT}/api/v1/capabilities`)
  await waitHttp(`${ORIGIN}${API}/capabilities`)
  const status = await (await fetch(`${ORIGIN}${API}/auto/status`)).json()
  console.log(`auto/status: ${JSON.stringify(status)}`)

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'shell',
    args: ['--no-sandbox', '--disable-gpu', '--no-first-run'],
  })
  try {
    await mainSession(browser)
    await extractionSession(browser)
    await loginSession(browser)
  } finally {
    await browser.close()
  }
  await sleep(500)
  const events = checkEvents()

  currentStep = 'console'
  check(
    'no uncaught errors and no console errors outside the allow-list',
    problems.length === 0,
    problems.map((p) => `${p.kind}: ${p.text} ${p.url ?? ''}`).join(' | '),
  )

  const failed = results.filter((r) => !r.ok)
  const summary = `${new Date().toISOString()} — ${
    results.length - failed.length
  }/${results.length} checks passed. auto/status available=${
    status?.auto?.available
  }. ${events.rows} event rows. out: ${OUT}`
  writeReport(summary)
  console.log(`\n${summary}`)
  console.log(`report: ${path.join(OUT, 'index.html')}`)
  return failed.length === 0
}

// INFO: Ctrl+C stops the servers too (they run in their own process groups)
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.once(sig, () => {
    stopAll().finally(() => process.exit(130))
  })
}

let ok = false
try {
  ok = await main()
} catch (e) {
  console.error(e)
  try {
    writeReport(`aborted: ${e}`)
  } catch {
    // nothing to report into
  }
} finally {
  await stopAll()
}
process.exit(ok ? 0 : 1)
