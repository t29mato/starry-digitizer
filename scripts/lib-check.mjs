// INFO: Guard for the published tarball. Checks 1-3 run against the build
// output (`npm run lib-build`); check 4 reads the TypeScript sources and needs
// no build, so `node scripts/lib-check.mjs --source-only` runs it alone (that
// is what `npm run lint` does — see check 4 for why).
//
// Four independent invariants, all of which have been broken by accident
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
//   4. The same invariant as 3, checked one step earlier — on the sources that
//      the core entry is built from, before anything is bundled.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const DIST = 'library-build/dist'

// INFO: `--source-only` skips checks 1-3, which need library-build/dist to
// exist. It is how `npm run lint` (and therefore the "Static code analysis"
// step of every workflow) reaches check 4 without paying for a library build.
const SOURCE_ONLY = process.argv.includes('--source-only')

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

if (!SOURCE_ONLY) {
  // --- 1. external origins -------------------------------------------------
  for (const file of walk(DIST)) {
    const text = readFileSync(file, 'utf8')
    const hit = text.match(FORBIDDEN_ORIGINS)
    if (hit) fail(`${file} references a forbidden external origin (${hit[0]})`)
  }

  // --- 2. every entry loads ------------------------------------------------
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

  // --- 3. core is renderer-free (built output) -----------------------------
  // INFO: follows the entry's own imports, because most of core's code lives
  // in shared chunks rather than in core.js itself.
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
}

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

// --- 4. core is renderer-free (sources) ------------------------------------
// INFO: check 3 can only speak after `lib-build`, which is the last thing CI
// does; this one reads the sources, so `yarn lint` — the "Static code
// analysis" step of all three workflows, and the command a developer runs
// locally — rejects the import as soon as it is written. Check 3 stays: the
// tarball job (vercel-production-deployment.yaml, Release-Package-Tarball)
// runs lib-build + lib-check without lint, and only check 3 sees what Rollup
// actually pulled in.
//
// INFO: the roots are every directory `src/core-main.ts` transitively reaches
// (65 modules: application/, domain/, general/instanceManager, @types/ and
// constants.ts). presentation/ and the `.vue` files are deliberately absent —
// that layer is where the renderer belongs.
const SOURCE_ROOTS = [
  'src/domain',
  'src/application',
  'src/general',
  'src/@types',
  'src/constants.ts',
]

// INFO: matched against a whole module specifier, not against the file text.
// `@vue/reactivity` is core's change notification and is allowed; bare `vue`,
// its subpaths (`vue/jsx-runtime`, ...) and the renderer packages are not.
const RENDERER_SPECIFIER = /^(?:vue|vue\/.*|@vue\/runtime-.*)$/
// INFO: importing a component or anything under presentation/ drags the
// renderer in just as surely, and neither specifier contains "vue".
const PRESENTATION_SPECIFIER = /\.vue$|(?:^|\/)presentation\//

// INFO: a plain grep over the sources reports the rule's own documentation.
// digitizerContext.ts explains itself with
//   // (verified: `require('vue').reactive === require('@vue/reactivity')...`)
// and the RENDERER_IMPORT regex above matches that comment. So comments are
// removed, and string literals are collected as units, before anything is
// matched: only a literal that a `from` / `import(` / `require(` actually
// consumes counts as an import. Test files are skipped — they are not part of
// any entry, and a test may legitimately mount a component.
function moduleSpecifiers(text) {
  const specifiers = []
  let code = ''
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
      continue
    }
    if (c === '/' && text[i + 1] === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 2
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      const start = i
      let value = ''
      i++
      while (i < text.length && text[i] !== c) {
        if (text[i] === '\\') i++
        else value += text[i]
        i++
      }
      i++
      // INFO: a literal leaves an index behind instead of its own text, so
      // nothing written inside a string or a template can be read back as
      // code. NUL cannot occur in the source, so the marker is unambiguous.
      specifiers.push({ value, offset: start })
      code += `\u0000${specifiers.length - 1}\u0000`
      continue
    }
    code += c
    i++
  }
  // INFO: `from` covers `import ... from` and `export ... from` alike, over
  // however many lines the clause is spread; `import(` / `require(` cover the
  // dynamic forms; a bare `import 'x'` is `import` with no parenthesis.
  const used = []
  for (const m of code.matchAll(
    /(?:\bfrom|\bimport|\brequire)\s*\(?\s*\u0000(\d+)\u0000/g,
  )) {
    used.push(specifiers[Number(m[1])])
  }
  return used
}

const lineOf = (text, offset) => text.slice(0, offset).split('\n').length

const sourceFiles = SOURCE_ROOTS.flatMap((root) =>
  statSync(root).isDirectory() ? walk(root) : [root],
).filter((f) => f.endsWith('.ts') && !/\.(test|spec)\.ts$/.test(f))

for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8')
  for (const { value, offset } of moduleSpecifiers(text)) {
    const where = `${file}:${lineOf(text, offset)}`
    if (RENDERER_SPECIFIER.test(value)) {
      fail(
        `${where} imports Vue's renderer ('${value}'); ` +
          `this file is reachable from src/core-main.ts, and ` +
          `starry-digitizer/core must depend on @vue/reactivity only. ` +
          `Import what you need from '@vue/reactivity', or move the code ` +
          `that needs the renderer to src/presentation/`,
      )
    } else if (PRESENTATION_SPECIFIER.test(value)) {
      fail(
        `${where} imports the presentation layer ('${value}'), which pulls ` +
          `Vue's renderer into starry-digitizer/core; ` +
          `invert the dependency (let presentation/ call into this file) or ` +
          `move the code that needs the renderer to src/presentation/`,
      )
    }
  }
}

if (failed) process.exit(1)
console.log('lib-check: OK')
