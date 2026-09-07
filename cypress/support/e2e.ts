// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

import {
  clearAutoSavedSession,
  consumeKeepSessionRequest,
  forgetKeepSessionRequest,
} from './session'

// INFO: the standalone app auto-saves work into IndexedDB and restores it on
// load (src/appPersistence.ts). Cypress clears cookies and localStorage between
// tests but NOT IndexedDB, so without this every spec would start with the
// previous one's image, axes and points — spec.data-table then found 255 rows
// where it expected the single blank row of an empty dataset.
//
// `window:before:load` fires for every cy.visit(), including the specs that
// call it directly instead of going through visitApp(), and it runs in the
// app's own window before it boots — the only point early enough to beat the
// restore in mounted().
//
// INFO: cleared on EVERY load by default. Before the auto-save existed, a
// reload always produced a brand-new app, and the specs were written against
// that: spec.project-round-trip reloads mid-test and asserts "a fresh app has
// no points". Keeping the session by default silently broke that assumption
// (it found the 2 points from before the reload). The specs that DO want the
// session to survive a reload are the ones testing persistence, and they now
// say so at the call site — see keepSession in cypress/support/app.ts.
//
// INFO: the "keep it this once" flag lives in support/session.ts, on the
// Cypress object rather than in a module variable, and support/app.ts imports
// it from THERE rather than from this file. Both details matter — see the
// note in that module: a module imported by the support file and by the spec
// is instantiated twice, so a `let` here and a setter called from a spec are
// two different variables.

beforeEach(() => {
  forgetKeepSessionRequest()
})

Cypress.on('window:before:load', (win) => {
  if (consumeKeepSessionRequest()) return
  clearAutoSavedSession(win)
})
