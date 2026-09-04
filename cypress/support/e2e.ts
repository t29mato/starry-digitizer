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
Cypress.on('window:before:load', (win) => {
  win.indexedDB.deleteDatabase('starry-digitizer-app')
})
