import { defineConfig } from 'cypress'

export default defineConfig({
  projectId: 'qiq9zf',
  viewportWidth: 1280,
  viewportHeight: 700,
  e2e: {
    baseUrl: 'http://localhost:8080',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
})
