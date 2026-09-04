# starry-digitizer host app example

A minimal Vue 3 application that embeds `<StarryDigitizer>` the way Starrydata3
does: the host fetches the figure image itself and passes a `Blob`, binds the
work state with `v-model:project`, and calls the exposed methods through a
template ref.

The library's only peer dependency is `vue`. There is no UI framework here: the
demo chrome is plain HTML with a little CSS, and the digitizer brings its own
styles through `import 'starry-digitizer/styles'` (scoped under
`.starry-digitizer`, so nothing leaks into the host page).

This directory is **independent from the repository's yarn workspace**. It has
its own `package.json` / `package-lock.json` and installs the library from the
repository root with `"starry-digitizer": "file:../.."`.

## Running it

The `file:` dependency resolves to the built library in `library-build/dist`, so
build the library first:

```sh
# from the repository root
yarn lib-build

# then, in this directory
npm install
npm run dev        # http://localhost:5174
```

After changing library source, re-run `yarn lib-build` at the root. The Vite
config excludes `starry-digitizer` from dependency pre-bundling so a rebuild is
picked up on reload.

## Running the end-to-end tests

The host-app Cypress specs live in `cypress/e2e/host-app/` at the repository
root and expect the dev server above on port 5174:

```sh
# terminal 1, in examples/host-app
npm run dev

# terminal 2, at the repository root
CYPRESS_HOST_APP=1 npx cypress run
```

`CYPRESS_HOST_APP=1` switches `cypress.config.ts` to `baseUrl`
`http://localhost:5174` and to the `cypress/e2e/host-app/**` spec pattern.
Without it, Cypress runs the standalone-app specs against `http://localhost:8888`
and skips the host-app ones.

## What the page exposes

The page renders debugging output with `data-cy` hooks the specs assert on:

| Hook | Content |
| --- | --- |
| `ready` | last `ready` payload |
| `update-count` | number of `update:project` emissions |
| `project-json` | last `update:project` payload |
| `datasets-json` | `datasets` from the last `change` payload (physical values) |
| `error` | last `error` payload |
| `values-json` | result of `getDatasetValues()` |

Buttons: `remount` (unmount + remount with the same image and project),
`remount-other` (remount with a second image and no project), `get-values`,
`export-zip` (stores the Blob in `window.__lastZip`), `reset`,
`toggle-readonly`, and a `zip-input` file input that unzips a project ZIP in the
host and restores it with `migrateProject` + `loadProject(dto, imageBlob)`.
