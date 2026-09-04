// INFO: Post-build guard for the published tarball (`npm run lib-build`).
// Two independent invariants, both of which have been broken by accident
// before:
//
//   1. No external origin ends up in the bundle. Starrydata3 serves the
//      digitizer under a CSP that blocks third-party origins, so a CDN URL
//      baked in by Sentry, GTM or tesseract.js is a runtime failure there and
//      not something a type check would catch (integration spec R8).
//   2. Every built entry actually loads. A multi-entry build emits shared
//      chunks, and getting their file extensions wrong under `"type": "module"`
//      breaks `require()` in a way no type check or bundle grep notices.
//   3. `starry-digitizer/core` does not reach Vue's renderer. The whole point
//      of the entry is that a React/Svelte/plain-JS host can import it; an
//      accidental `import { ref } from 'vue'` somewhere in application/ would
//      silently pull the renderer back in (docs/design/engine-boundary.md §3).
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const DIST = 'library-build/dist'

const FORBIDDEN_ORIGINS =
  /sentry|googletagmanager|cdn\.jsdelivr|projectnaptha|import\.meta\.env/i

// INFO: `@vue/reactivity` is allowed (it is core's change notification);
// bare `vue` and its renderer subpaths are not.
const RENDERER_IMPORT =
  /(?:from\s*|import\s*\(\s*|require\(\s*)["'](vue|vue\/[^"']*|@vue\/runtime-[^"']*)["']/

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  )
}

let failed = false
const fail = (msg) => {
  console.error(`lib-check: ${msg}`)
  failed = true
}

// --- 1. external origins ---------------------------------------------------
for (const file of walk(DIST)) {
  const text = readFileSync(file, 'utf8')
  const hit = text.match(FORBIDDEN_ORIGINS)
  if (hit) fail(`${file} references a forbidden external origin (${hit[0]})`)
}

// --- 2. every entry loads --------------------------------------------------
const require_ = createRequire(import.meta.url)
const abs = (f) => resolve(DIST, f)

for (const file of ['index.cjs', 'core.cjs', 'vue.cjs']) {
  try {
    require_(abs(file))
  } catch (e) {
    fail(`${DIST}/${file} cannot be require()d: ${e.message}`)
  }
}
for (const file of ['index.js', 'core.js', 'vue.js']) {
  try {
    await import(pathToFileURL(abs(file)).href)
  } catch (e) {
    fail(`${DIST}/${file} cannot be imported: ${e.message}`)
  }
}

// --- 3. core is renderer-free ----------------------------------------------
// INFO: follows the entry's own imports, because most of core's code lives in
// shared chunks rather than in core.js itself.
function collectModules(entry) {
  const seen = new Set()
  const queue = [entry]
  while (queue.length) {
    const file = queue.pop()
    if (seen.has(file)) continue
    seen.add(file)
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(
      /(?:from\s*|import\s*\(\s*|require\(\s*)["'](\.[^"']*)["']/g,
    )) {
      queue.push(join(dirname(file), m[1]))
    }
  }
  return seen
}

for (const entry of [`${DIST}/core.js`, `${DIST}/core.cjs`]) {
  for (const file of collectModules(entry)) {
    const hit = readFileSync(file, 'utf8').match(RENDERER_IMPORT)
    if (hit) {
      fail(
        `${file} (reachable from ${entry}) imports Vue's renderer (${hit[1]}); ` +
          `core must depend on @vue/reactivity only`,
      )
    }
  }
}

if (failed) process.exit(1)
console.log('lib-check: OK')
