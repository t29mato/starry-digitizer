// INFO: The runtime counterpart to the repository's `lib-check` (scripts/
// lib-check.mjs, check 3). That one greps the library's own `core.js` for a
// forbidden `import ... from 'vue'`; it is a static check on a module that was
// built with `vue` marked EXTERNAL, so it can only ever see the import
// statement — never what a real host ends up shipping.
//
// This script checks the other end: after `vite build`, the chunks that
// core.html actually loads must not contain Vue's renderer, with the renderer
// resolved, bundled and minified for real. That is only meaningful because
// index.html in this same build DOES pull the renderer in — so the marker is
// proven to survive the bundler before it is required to be absent.
//
// Usage: npm run build && npm run verify:core
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(here, '..', 'dist')

// INFO: the markers, and why these.
//
//   `shapeFlag` is the property every vnode carries and the renderer branches
//   on in ~36 places (runtime-core/vnode.ts, renderer.ts, runtime-dom). It is
//   a PROPERTY NAME, so no minifier renames it, and it exists only where
//   vnodes are created or patched — i.e. only in the renderer. It is the
//   primary marker.
//
//   `__isTeleport` / `__isSuspense` are the brand properties runtime-core uses
//   to recognise its two built-in components. Same reasoning (property names,
//   renderer-only), kept as corroboration so one rename upstream cannot make
//   the check silently vacuous.
//
// Rejected candidates, checked empirically against this build:
//   - `createElementVNode` / `createVNode` / `resolveComponent`: these are
//     local bindings in the bundle, so esbuild renames them. 0 hits even in
//     the chunk that unquestionably contains the renderer.
//   - anything from `@vue/shared` (e.g. the `onVnodeBeforeMount` string in
//     `isReservedProp`): @vue/shared is a dependency of @vue/REACTIVITY too,
//     so it is legitimately present in core.html's graph. Grepping for it
//     would fail a correct build.
const MARKERS = ['shapeFlag', '__isTeleport', '__isSuspense']

function readManifest() {
  // INFO: Vite 4 writes dist/manifest.json; Vite 5+ writes dist/.vite/.
  for (const candidate of ['manifest.json', join('.vite', 'manifest.json')]) {
    const path = join(DIST, candidate)
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'))
  }
  throw new Error(
    `no manifest in ${DIST}. Run \`npm run build\` first (build.manifest must stay on).`,
  )
}

/**
 * Every JS chunk the given HTML entry loads: its own chunk plus the transitive
 * static `imports`. Dynamic imports are followed too — a lazily loaded chunk
 * is still this page's code.
 */
function chunksFor(manifest, entrySrc) {
  const key = Object.keys(manifest).find(
    (k) => manifest[k].src === entrySrc || k === entrySrc,
  )
  if (!key) throw new Error(`no manifest entry for ${entrySrc}`)

  const files = new Set()
  const seen = new Set()
  const visit = (k) => {
    if (seen.has(k)) return
    seen.add(k)
    const chunk = manifest[k]
    if (!chunk) return
    if (chunk.file.endsWith('.js')) files.add(chunk.file)
    ;[...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])].forEach(visit)
  }
  visit(key)
  return [...files]
}

function hits(file) {
  const text = readFileSync(join(DIST, file), 'utf8')
  return MARKERS.filter((marker) => text.includes(marker))
}

const manifest = readManifest()
const coreChunks = chunksFor(manifest, 'core.html')
const mainChunks = chunksFor(manifest, 'index.html')

let failed = false

// --- 1. the check itself -----------------------------------------------------
for (const file of coreChunks) {
  const found = hits(file)
  if (found.length > 0) {
    console.error(
      `verify:core: dist/${file} is loaded by core.html and contains Vue's renderer (${found.join(
        ', ',
      )}).`,
    )
    failed = true
  }
}

// --- 2. the check's own self-test -------------------------------------------
// INFO: without this, a build in which the markers went stale (upstream rename)
// or Vue disappeared entirely would report success while proving nothing.
//
// Only meaningful when check 1 passed: once the renderer HAS leaked into
// core.html's graph, Rollup puts it in the chunk both entries share, so
// index.html has no renderer of its own left to find and this would report
// three misleading extra failures on top of the real one.
if (!failed) {
  const mainOnly = mainChunks.filter((file) => !coreChunks.includes(file))
  const proven = new Set(mainOnly.flatMap(hits))
  for (const marker of MARKERS) {
    if (!proven.has(marker)) {
      console.error(
        `verify:core: marker "${marker}" was not found in index.html's own chunks either, so its absence from core.html proves nothing. Update MARKERS.`,
      )
      failed = true
    }
  }
}

if (failed) process.exit(1)

console.log(
  `verify:core: OK — no Vue renderer in the ${coreChunks.length} chunk(s) core.html loads ` +
    `(${coreChunks.map((f) => `dist/${f}`).join(', ')}); ` +
    `markers [${MARKERS.join(
      ', ',
    )}] confirmed present in index.html's own chunks.`,
)
