/// <reference types="cypress" />

// INFO: the standalone app auto-saves into IndexedDB (src/appPersistence.ts).
// This module owns the one bit of state that says whether the NEXT page load
// of the app is allowed to see what the previous one saved.
//
// It lives in a file of its own, and it parks its flag on `Cypress.env()`
// rather than in a module variable, because of how Cypress loads code:
// the support file and the spec file are two SEPARATE scripts, each
// preprocessed into its own webpack bundle (the preprocessor compiles one
// entry per file). A module that both of them import is therefore
// INSTANTIATED TWICE, once per bundle, with two independent copies of every
// module-level `let`.
//
// That is what broke the two "the setting survives a reload" specs: the flag
// used to be a `let` inside support/e2e.ts, `support/app.ts` imported the
// setter from there — pulling a second copy of e2e.ts into the spec bundle —
// so `visitApp({ keepSession: true })` set copy B's flag while the
// `window:before:load` listener registered by the support file kept reading
// copy A's. The listener never saw the request, wiped the session on the
// reload anyway, and the specs failed asserting that the interpolation switch
// was still checked. (The duplicate import also re-ran e2e.ts's side effects,
// registering a second listener and loading cypress-file-upload twice.)
//
// `Cypress` is ONE object shared by both bundles, so a flag on it is seen by
// whichever copy asks.

export const AUTO_SAVE_DB_NAME = 'starry-digitizer-app'

const KEEP_SESSION_KEY = 'sdKeepNextSession'

/** Keep the auto-saved session across the next cy.visit() of this test. */
export function keepSessionOnNextVisit(): void {
  Cypress.env(KEEP_SESSION_KEY, true)
}

/** Back to the default ("every load starts from an empty auto-save"). */
export function forgetKeepSessionRequest(): void {
  Cypress.env(KEEP_SESSION_KEY, false)
}

/**
 * Whether this load must keep the auto-saved session — true at most once per
 * request, so `keepSession: true` covers the visit that asked for it and not
 * whatever the test does afterwards.
 */
export function consumeKeepSessionRequest(): boolean {
  const keep = Boolean(Cypress.env(KEEP_SESSION_KEY))
  forgetKeepSessionRequest()
  return keep
}

/** Drops the app's auto-saved work in `win` before it boots. */
export function clearAutoSavedSession(win: Window): void {
  win.indexedDB.deleteDatabase(AUTO_SAVE_DB_NAME)
}
