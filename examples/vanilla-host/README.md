# starry-digitizer vanilla host example

A **framework-less** host page. There is no `.vue` file here and no Vue code in
the host's own source: everything Vue-related is confined to one wrapper module,
`src/mountDigitizer.ts`, which mounts `<StarryDigitizer>` into an arbitrary DOM
element and hands back a plain imperative handle.

Copy `src/mountDigitizer.ts` into a React, Svelte or plain-JavaScript host and
you can use the digitizer without adopting Vue anywhere else.

For a Vue 3 host, see `examples/host-app` instead.

## Two pages

| page | entry | what it shows |
| --- | --- | --- |
| `index.html` | `starry-digitizer` | the full component mounted into a plain `<div>` (`src/mountDigitizer.ts`) |
| `core.html` | `starry-digitizer/core` | the engine with **no library UI at all** (`src/core-demo.ts`) |

`core.html` is the proof that the `core` subpath export really is free of Vue's
renderer. `src/core-demo.ts` imports from `starry-digitizer/core` and from
nothing else — no `vue`, no default entry, no `starry-digitizer/vue`, and no
`starry-digitizer/styles`, because a core-only host has no library UI to style.
It:

1. lends the engine the page's own `#canvasWrapper` + three `<canvas>` elements
   with `ctx.canvasHandler.attachCanvases({...})` (the wrapper needs a definite
   size: `drawFitSizeImage()` measures it);
2. loads the sample PNG as a `Blob` through `applyImage(ctx, blob)`;
3. calibrates with two `addAxisCoord()` calls and `setAxisValues(ctx, ...)`,
   with no calibration UI in between;
4. runs `extractPoints(ctx)` — the automatic extraction, which reads pixels
   through the `PixelSource` port;
5. keeps the read-outs up to date with the `effect()` that `core` re-exports,
   writing straight into text nodes. This is what a React or Svelte host would
   replace with `setState` or a store write;
6. prints `getDatasetValues(...)` as JSON.

### `npm run verify:core`

After `npm run build`, this script walks the build manifest from the `core.html`
entry through its (static and dynamic) imports and fails if any of those chunks
contains Vue's renderer. The marker is `shapeFlag` — the property every vnode
carries and the renderer branches on in ~36 places. It is a property name, so
minifiers keep it, and it exists nowhere but the renderer. `__isTeleport` and
`__isSuspense` corroborate it.

The script also self-tests: the same markers **must** be found in `index.html`'s
own chunks, which do contain the renderer. Without that, a stale marker would
make the check pass while proving nothing. Note that grepping for anything from
`@vue/shared` would be wrong — `@vue/reactivity` depends on it too, so it is
legitimately part of `core.html`'s graph.

This complements the repository's `yarn lib-check` (check 3), which greps the
library's own `core.js` for a `vue` import. That is a static check on a bundle
built with `vue` marked external; this one looks at what a host actually ships.

## Run it

The library must be built first, from the repository root:

```sh
yarn        # once
yarn lib-build
```

Then:

```sh
cd examples/vanilla-host
npm install
npm run dev         # http://localhost:5175 (/ and /core.html)
npm run build       # tsc --noEmit && vite build (both pages)
npm run verify:core # asserts core.html's chunks carry no Vue renderer
```

The page has a toolbar (`Load sample`, `Get values`, `Get project`,
`Toggle readonly`, `Unmount`) and a `<pre>` that prints the latest project DTO
or dataset values.

## The API

```ts
const handle = mountDigitizer(document.querySelector('#digitizer')!, {
  image,                                   // Blob or URL
  project,                                 // ProjectDTO to restore, optional
  readonly: false,
  datasetNameCandidates: ['Sample A'],
  features: { imageUpload: false, zipExportImport: false },
  onReady: ({ version }) => {},
  onProjectChange: (project) => {},        // update:project
  onChange: ({ project, datasets }) => {},
  onError: ({ code, message }) => {},
})

handle.getProject()
handle.getDatasetValues()
await handle.loadProject(dto, imageBlob)
handle.reset()
await handle.exportZip()
handle.update({ readonly: true })          // change props without remounting
handle.unmount()
```

`update()` works because the wrapper keeps the props in a `reactive()` object
that the render function reads. Mutating it patches the mounted component in
place, so the digitized state survives a `readonly` or `features` change.

## Using it from React

`mountDigitizer` is called in an effect and torn down in its cleanup. This
snippet is documentation only — React is **not** a dependency of this example.

```tsx
import { useEffect, useRef } from 'react'
import { mountDigitizer } from './mountDigitizer'
import type { ProjectDTO } from 'starry-digitizer'

export function Digitizer({ image, onProject }: {
  image: Blob
  onProject: (p: ProjectDTO) => void
}) {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = mountDigitizer(el.current!, {
      image,
      onProjectChange: onProject,
    })
    return () => handle.unmount()   // StrictMode double-invokes this; unmount is idempotent
  }, [image])                       // deliberately not onProject: remounting on every render would lose state

  return <div ref={el} />
}
```

To change props from React without remounting, keep the handle in a ref and call
`handle.update({ readonly })` from a second effect.

## Why there is no `@vitejs/plugin-vue`

The plugin only compiles Single File Components. This host has none, and the
`starry-digitizer` package ships **already-compiled** render functions in
`library-build/dist/index.js`, so nothing in the module graph reaches the SFC
compiler. `npm run build` and `npm run dev` both work without it.

One thing the plugin's absence does change: Vue's `esm-bundler` build expects
the compile-time feature flags `__VUE_OPTIONS_API__`,
`__VUE_PROD_DEVTOOLS__` and `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__` to be
replaced by the bundler. Without them Vue logs a console warning and uses its
defaults. `vite.config.ts` sets them through `define`. `__VUE_OPTIONS_API__`
must stay `true`, because several library components are still written with the
Options API.

Type checking uses plain `tsc`, not `vue-tsc`, for the same reason.

## Two other things `vite.config.ts` has to say

`resolve.dedupe: ['vue']` is needed **only because this example consumes the
library through `file:../..`**. npm symlinks that to the repository root, so the
library's own `vue` import resolves against the root `node_modules` while the
host resolves its own copy — two Vue runtimes on one page. A normal
`npm install starry-digitizer` has one copy and needs none of this.

`optimizeDeps.exclude: ['starry-digitizer']` keeps Vite from caching a stale
build of the library, but it also hides the library's bare imports from Vite's
dependency scan, so `optimizeDeps.include` lists them explicitly.
