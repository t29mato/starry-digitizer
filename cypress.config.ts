import { defineConfig } from 'cypress'

// INFO: two e2e targets share one config. By default we test the standalone
// app on :8888; with CYPRESS_HOST_APP=1 we test examples/host-app on :5174
// (the library-as-a-component integration). The host-app specs are excluded
// from the default run because they need that separate dev server.
const isHostApp = process.env.CYPRESS_HOST_APP === '1'

export default defineConfig({
  projectId: 'qiq9zf',
  viewportWidth: 1280,
  viewportHeight: 700,
  e2e: {
    baseUrl: isHostApp ? 'http://localhost:5174' : 'http://localhost:8888',
    specPattern: isHostApp
      ? 'cypress/e2e/host-app/**/*.cy.ts'
      : 'cypress/e2e/*.cy.ts',
    // setupNodeEvents(on, config) {
    //   // implement node event listeners here
    // },
  },
})
