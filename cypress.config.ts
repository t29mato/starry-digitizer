import { defineConfig } from 'cypress'
import fs from 'fs'
import path from 'path'

// INFO: two e2e targets share one config. By default we test the standalone
// app on :8888; with CYPRESS_HOST_APP=1 we test examples/host-app on :5174
// (the library-as-a-component integration). The host-app specs are excluded
// from the default run because they need that separate dev server.
const isHostApp = process.env.CYPRESS_HOST_APP === '1'
// INFO: a third target, CYPRESS_VANILLA_HOST=1, runs examples/vanilla-host on
// :5175 (the framework-less mount wrapper). Like host-app it needs its own dev
// server; the default `cypress/e2e/*.cy.ts` pattern is non-recursive, so both
// example folders stay out of the default run.
const isVanillaHost = process.env.CYPRESS_VANILLA_HOST === '1'

function baseUrl(): string {
  if (isVanillaHost) return 'http://localhost:5175'
  return isHostApp ? 'http://localhost:5174' : 'http://localhost:8888'
}

function specPattern(): string {
  if (isVanillaHost) return 'cypress/e2e/vanilla-host/**/*.cy.ts'
  return isHostApp ? 'cypress/e2e/host-app/**/*.cy.ts' : 'cypress/e2e/*.cy.ts'
}

export default defineConfig({
  projectId: 'qiq9zf',
  viewportWidth: 1280,
  viewportHeight: 700,
  // INFO: "File > Save Project" is a real browser download; the round-trip
  // spec reads the produced ZIP back out of this folder, so it must be
  // emptied before every run to keep the "exactly one sd-*.zip" assertion
  // deterministic.
  downloadsFolder: 'cypress/downloads',
  trashAssetsBeforeRuns: true,
  e2e: {
    baseUrl: baseUrl(),
    specPattern: specPattern(),
    setupNodeEvents(on, config) {
      on('task', {
        // INFO: the saved ZIP's name is timestamped, so specs cannot guess
        // it; they list the folder instead and then read the file back.
        listDownloads() {
          const dir = path.resolve(config.downloadsFolder)
          if (!fs.existsSync(dir)) return []
          return fs.readdirSync(dir)
        },
        clearDownloads() {
          const dir = path.resolve(config.downloadsFolder)
          if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true })
          }
          return null
        },
      })
      return config
    },
  },
})
