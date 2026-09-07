/// <reference types="cypress" />

// INFO: Shared helpers for the STANDALONE app specs (http://localhost:8888).
// The host-app specs live under cypress/e2e/host-app and have their own
// helpers; nothing here may assume the App.vue menu bar exists there.

// INFO: from './session', NOT from './e2e'. Importing it from the support
// file would pull a second copy of that file — listeners, hooks and all —
// into the spec bundle, and the flag would then be set on a copy the support
// file's listener does not read. See the note in support/session.ts.
import { AUTO_SAVE_DB_NAME, keepSessionOnNextVisit } from './session'

export type Coord = { x: number; y: number }

/**
 * Dispatches a keyboard shortcut at the digitizer.
 *
 * INFO: the shortcuts used to be listened for on `document`, so `body` was as
 * good a target as any. They now live on the canvas frame itself, so that a
 * Cmd+Z pressed elsewhere on an embedding page belongs to the host, not to
 * us. `.trigger()` dispatches on the element it is chained off, so the frame
 * is what specs must aim at.
 */
export function pressKey(
  key: string,
  options: Partial<KeyboardEventInit> = {},
): void {
  cy.get('[data-cy=canvas-wrapper]').trigger('keydown', { key, ...options })
}

/**
 * Visit the app and wait until the sample image has actually been decoded and
 * drawn, then reset the zoom to 100%.
 *
 * The app boots with a "fit" zoom whose factor depends on the viewport, so
 * every spec that clicks the canvas at fixed coordinates must pin the scale
 * first. `0` is the documented "Reset to 100%" shortcut.
 */
export function visitApp(
  options?: Partial<Cypress.VisitOptions> & { keepSession?: boolean },
): void {
  // INFO: every visit starts from an empty auto-save unless the test says
  // otherwise, because that is what a reload meant before the auto-save
  // existed and what the specs assume. `keepSession: true` is for the specs
  // that assert a setting survives a reload.
  const { keepSession, ...visitOptions } = options ?? {}
  if (keepSession) keepSessionOnNextVisit()
  cy.visit('/', visitOptions)
  waitForImage()
  resetZoom()
}

/**
 * Waits until the app's auto-save has really written `isInterpolatorActive`
 * to IndexedDB.
 *
 * INFO: the write is fire-and-forget — App.vue watches `interpolator.isActive`
 * and queues `persistence.saveSettings()`, which resolves on its own time. A
 * `visitApp()` issued in the same breath as the click can therefore tear the
 * page down before the IndexedDB transaction commits, and the reload then
 * finds no setting at all. Driving the app with a real browser, reloading
 * immediately after the click lost the setting in 2 of 10 runs; waiting for it
 * to land first made all 10 pass. So the specs that assert "the setting
 * survives a reload" wait for the save here, which is also the honest reading
 * of what they mean: first it is saved, then a reload brings it back.
 *
 * The connection is closed again before yielding — an open one would block the
 * `deleteDatabase()` that the next visit issues.
 */
export function waitForSavedInterpolation(isActive: boolean): void {
  readSavedInterpolation(isActive, 60)
}

function readSavedInterpolation(expected: boolean, attemptsLeft: number): void {
  cy.window({ log: false })
    .then(
      (win) =>
        new Cypress.Promise<boolean | undefined>((resolve) => {
          const request = win.indexedDB.open(AUTO_SAVE_DB_NAME)
          request.onerror = () => resolve(undefined)
          // INFO: opening a database that does not exist CREATES it, at
          // version 1 and without any object store — exactly the version the
          // app then asks for, so its own open() would find it there, skip
          // `onupgradeneeded` and never get its store. Aborting the
          // version-change transaction rolls the creation back, leaving
          // nothing behind for the app to trip over; `onerror` follows and
          // this attempt simply reports "not saved yet".
          request.onupgradeneeded = () => request.transaction?.abort()
          request.onsuccess = () => {
            const db = request.result
            // INFO: the store only exists once the app has created it, which
            // is itself part of what this waits for.
            if (!db.objectStoreNames.contains('session')) {
              db.close()
              resolve(undefined)
              return
            }
            const read = db
              .transaction('session', 'readonly')
              .objectStore('session')
              .get('settings')
            read.onerror = () => {
              db.close()
              resolve(undefined)
            }
            read.onsuccess = () => {
              db.close()
              const settings = read.result as
                | { isInterpolatorActive?: boolean }
                | undefined
              resolve(settings?.isInterpolatorActive)
            }
          }
        }),
    )
    .then((saved) => {
      if (saved === expected) return
      if (attemptsLeft === 0) {
        expect(saved, 'auto-saved isInterpolatorActive').to.equal(expected)
        return
      }
      cy.wait(50, { log: false }).then(() =>
        readSavedInterpolation(expected, attemptsLeft - 1),
      )
    })
}

/**
 * Waits for [data-cy=image-canvas] to exist.
 *
 * NOTE: this deliberately does NOT try to detect that the image has been
 * decoded. A `<canvas>` with no width attribute reports the HTML default of
 * 300x150, so "width > 0" is true from the very first render and any such
 * check is a no-op. Waiting for the image is `resetZoom`'s job — it retries
 * the shortcut, which is the only signal that survives the async decode.
 */
export function waitForImage(): void {
  cy.get('[data-cy=image-canvas]').should('exist')
}

/**
 * Presses the "Reset to 100%" shortcut until the canvas really is at 1:1 with
 * the image. `expectedWidth` defaults to the sample graph the app boots with;
 * pass the width of a replacement image after an upload.
 *
 * INFO: the shortcut has to be RETRIED, not just asserted on. Loading an
 * image is asynchronous (`initializeImageElement` resolves on the <img>'s
 * onload) and finishes with `drawFitSizeImage()`. A single keydown that
 * arrives before that is lost twice over: `CanvasHandler.resize()` bails out
 * while `originalWidth` is still 0, and the fit draw that follows the decode
 * would overwrite a 100% scale anyway. The canvas then stays at the fit width
 * (e.g. 680 for the 1180x980 sample) and the assertion times out — the
 * order-dependent flake this replaces, which surfaced in whichever spec
 * happened to visit while the machine was busy.
 */
export function resetZoom(expectedWidth = 1180): void {
  cy.contains('.c__current-dataset-and-axis', 'Dataset:')
  pressResetZoom(expectedWidth, 40)
}

/** One "Reset to 100%" attempt, retried until the canvas reports `expected`. */
function pressResetZoom(expected: number, attemptsLeft: number): void {
  pressKey('0')
  cy.get('[data-cy=image-canvas]').then(($canvas) => {
    const width = ($canvas[0] as HTMLCanvasElement).width
    if (width === expected) return
    if (attemptsLeft === 0) {
      expect(width, 'canvas width after "Reset to 100%"').to.equal(expected)
      return
    }
    cy.wait(100, { log: false })
    pressResetZoom(expected, attemptsLeft - 1)
  })
}

// INFO: SdMenu derives a stable test hook from each item's label:
// lowercase, every run of non-alphanumerics becomes a dash, dashes trimmed.
// "Reset to 100%" -> menu-item-reset-to-100. Mirrored here so specs can keep
// naming menu entries by the words the user actually sees.
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Opens one of the App.vue menu-bar menus (File / Edit / View / Help). */
export function openMenu(title: string): void {
  cy.get(`[data-cy=menu-${title.toLowerCase()}]`).click()
  cy.get('.sd-menu__list').should('be.visible')
}

/** One entry of an open menu, addressed by its visible label. */
export function menuItem(item: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get(`[data-cy=menu-item-${slug(item)}]`)
}

/** Opens a menu and clicks one of its items by visible text. */
export function clickMenuItem(menu: string, item: string): void {
  openMenu(menu)
  menuItem(item).click()
}

export function closeMenu(): void {
  cy.get('body').type('{esc}')
  cy.get('.sd-menu__list').should('not.exist')
}

/**
 * Asserts whether an open menu entry shows its check mark.
 *
 * INFO: the check is an inline SVG inside `.sd-menu__check`, which is always
 * rendered so the labels stay aligned — only the icon comes and goes.
 */
export function assertMenuItemChecked(item: string, checked: boolean): void {
  menuItem(item)
    .find('.sd-menu__check svg')
    .should(checked ? 'exist' : 'not.exist')
}

/**
 * Clicks the canvas at a coordinate relative to the canvas wrapper's top-left.
 *
 * INFO: a plain `.click(x, y)` is enough now that the app derives the image
 * pixel from `clientX/clientY` minus the image canvas' bounding rect (see
 * getMouseCoordFromMouseEvent). Both sides start from the same viewport
 * coordinate, so there is no second, independent rounding to disagree with —
 * the earlier helper had to compensate for Chrome rounding `offsetX` on its
 * own.
 */
export function clickCanvas(coord: Coord): void {
  cy.get('[data-cy=canvas-wrapper]').click(coord.x, coord.y)
}

/**
 * Calibrates the axes in the default "2 Points" mode.
 *
 * The first click fixes x1 AND y1, the second fixes x2 AND y2 (see
 * AxisSet#addAxisCoord), so `origin` is the bottom-left marker and `opposite`
 * the top-right one. Specs pick a data-point coordinate that is an exact
 * linear combination of these two, which makes the expected physical value
 * independent of the canvas' pixel offset inside the page.
 */
export function calibrateTwoPoints(origin: Coord, opposite: Coord): void {
  clickCanvas(origin)
  clickCanvas(opposite)
}

/** Calibrates in "4 Points" mode: x1, x2, y1, y2 in that click order. */
export function calibrateFourPoints(
  x1: Coord,
  x2: Coord,
  y1: Coord,
  y2: Coord,
): void {
  selectCalibrationMode('4 Points')
  clickCanvas(x1)
  clickCanvas(x2)
  clickCanvas(y1)
  clickCanvas(y2)
}

export function selectCalibrationMode(label: '2 Points' | '4 Points'): void {
  cy.contains('.sd-check', label).click()
}

export type AxisValues = {
  x1?: string
  x2?: string
  y1?: string
  y2?: string
}

/** Types the four axis values into the AxisSetSettings fields. */
export function setAxisValues(values: AxisValues): void {
  ;(Object.keys(values) as (keyof AxisValues)[]).forEach((key) => {
    const value = values[key]
    if (value === undefined) return
    cy.get(`#${key}-value`).clear().type(value)
  })
}

export function assertAxisValues(values: Required<AxisValues>): void {
  ;(Object.keys(values) as (keyof AxisValues)[]).forEach((key) => {
    cy.get(`#${key}-value`).should('have.value', values[key])
  })
}

export function setLogScale(axis: 'x' | 'y'): void {
  cy.get(`#${axis}-is-log`).check({ force: true })
}

/** The data table's body rows. */
export function tableRows(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('[data-cy=data-table] tbody tr')
}

/** Asserts the numeric content of one data-table row. */
export function assertTableRow(index: number, x: string, y: string): void {
  tableRows()
    .eq(index)
    .within(() => {
      cy.get('td').eq(0).should('have.text', x)
      cy.get('td').eq(1).should('have.text', y)
    })
}

/** The dataset rows of the DatasetManager list, in display order. */
export function datasetRows(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('.c__dataset-row')
}

export function datasetName(
  index: number,
): Cypress.Chainable<JQuery<HTMLInputElement>> {
  return datasetRows().eq(index).find('input')
}

/**
 * NOTE: names may contain spaces. The old `<v-list-item link>` wrapper
 * swallowed the space key as an "activate" gesture; the plain clickable div
 * that replaced it does not. Most callers still pass single words simply
 * because they were written before the fix.
 */
export function renameDataset(index: number, name: string): void {
  datasetName(index).clear().type(name).blur()
}

/** Makes the dataset at `index` the active one by clicking its list row. */
export function selectDataset(index: number): void {
  cy.get('.c__dataset-item').eq(index).click()
}

type RowAction = 'copy' | 'clear' | 'delete'

// NOTE: icons are inline SVG now (no icon font, so no `.mdi-*` classes);
// every icon button carries a `data-cy` instead.
const ROW_ACTION_SELECTOR: Record<RowAction, string> = {
  copy: '[data-cy=dataset-copy]',
  clear: '[data-cy=dataset-clear]',
  delete: '[data-cy=dataset-delete]',
}

/** Clicks one of the per-dataset icon buttons (copy / clear points / delete). */
export function datasetAction(index: number, action: RowAction): void {
  datasetRows().eq(index).find(ROW_ACTION_SELECTOR[action]).click()
}

export function addDataset(): void {
  cy.get('[data-cy=add-dataset]').click()
}

export function removeAllDatasets(): void {
  cy.get('[data-cy=remove-all-datasets]').click()
}

export function viewAllDatasets(): void {
  cy.get('[data-cy=view-all-datasets]').click()
}

export function addAxisSet(): void {
  cy.get('[data-cy=add-axis-set]').click()
}

export function axisSetRows(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('.c__axisSet-item')
}

export function selectAxisSet(index: number): void {
  axisSetRows().eq(index).click()
}

export function pointCount(
  datasetId: number,
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get(`.dataset-count-${datasetId}`)
}

/** Triggers the Ctrl/Cmd+Z undo shortcut. */
export function undo(times = 1): void {
  for (let i = 0; i < times; i++) {
    pressKey('z', { ctrlKey: true, metaKey: true })
  }
}

/** Triggers the Ctrl/Cmd+Shift+Z redo shortcut. */
export function redo(times = 1): void {
  for (let i = 0; i < times; i++) {
    pressKey('z', { ctrlKey: true, metaKey: true, shiftKey: true })
  }
}

/** Asserts the enabled state of the Edit menu's Undo/Redo items. */
export function assertEditMenu(options: {
  undo: 'enabled' | 'disabled'
  redo: 'enabled' | 'disabled'
}): void {
  openMenu('Edit')
  const assertion = (item: string, state: 'enabled' | 'disabled') =>
    menuItem(item).should(
      state === 'disabled' ? 'be.disabled' : 'not.be.disabled',
    )
  assertion('Undo', options.undo)
  assertion('Redo', options.redo)
  closeMenu()
}

export function canvasPoints(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('.canvas-point')
}

/**
 * Replaces navigator.clipboard.writeText with a stub aliased as
 * `@clipboardWrite`, so specs can assert the exact CSV without relying on
 * clipboard read permissions.
 */
export function stubClipboard(win: Cypress.AUTWindow): void {
  if (!win.navigator.clipboard) {
    Object.defineProperty(win.navigator, 'clipboard', {
      value: { writeText: () => Promise.resolve() },
      configurable: true,
    })
  }
  // INFO: .as() lives on the Cypress agent, and .resolves() returns a plain
  // SinonStub, so the alias must be taken before the behaviour is set.
  cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite').resolves()
}

/** Reads back what was last written through the stubbed clipboard. */
export function assertClipboard(expected: string): void {
  cy.get('@clipboardWrite').should('have.been.calledWith', expected)
}

/**
 * Stubs the click on the dynamically created `<input type=file>` that
 * "File > Load Project" opens, so the native picker never appears and the
 * spec can drive the input itself.
 */
export function stubFilePicker(win: Cypress.AUTWindow): void {
  const original = win.HTMLInputElement.prototype.click
  cy.stub(win.HTMLInputElement.prototype, 'click').callsFake(function (
    this: HTMLInputElement,
  ) {
    // INFO: only the hidden project-file picker is suppressed; the image
    // file input still needs a working click for the upload specs.
    if (this.type === 'file' && this.accept === '.zip') return
    return original.call(this)
  })
}

/** Selects a ZIP into the hidden "Load Project" input. */
export function selectProjectFile(
  file: string | { contents: unknown; fileName: string },
): void {
  cy.get('body > input[type=file][accept=".zip"]').selectFile(
    file as Cypress.FileReference,
    { force: true },
  )
}

// INFO: Cypress.Buffer is a value (the Buffer constructor), so the buffer
// type has to be derived from it rather than referenced directly.
type CypressBuffer = ReturnType<typeof Cypress.Buffer.from>

/**
 * Polls the downloads folder until exactly one `sd-*.zip` has appeared.
 *
 * INFO: `cy.task(...).should(...)` does NOT retry the task — the assertion
 * runs once against the first listing, so the check raced the browser's
 * download and failed with "expected [] to have a length of 1" whenever
 * building the ZIP took longer than the click-to-listing gap. Polling the
 * task explicitly is the only way to give the download time to land.
 */
function waitForDownloadedZipName(
  attemptsLeft = 100,
): Cypress.Chainable<string> {
  return cy.task('listDownloads').then((files) => {
    const zips = (files as string[]).filter((f) => /^sd-.*\.zip$/.test(f))
    if (zips.length === 1) {
      return cy.wrap(zips[0], { log: false })
    }
    if (attemptsLeft === 0) {
      expect(zips, 'exactly one sd-*.zip was downloaded').to.have.length(1)
    }
    return cy
      .wait(100, { log: false })
      .then(() => waitForDownloadedZipName(attemptsLeft - 1))
  })
}

/**
 * Waits for "Save Project" to have finished writing exactly one `sd-*.zip`
 * into the downloads folder and yields its contents.
 *
 * The bytes are read before the spec navigates away on purpose: reloading the
 * page while the browser still has the download in flight cancels it and
 * removes the half-written file.
 */
export function readDownloadedProject(): Cypress.Chainable<CypressBuffer> {
  return waitForDownloadedZipName()
    .then((name) => cy.readFile(`cypress/downloads/${name}`, null))
    .should((contents) => {
      // INFO: the ZIP always embeds the graph image, so a plausible download
      // is far bigger than this; the check guards against reading a file the
      // browser is still writing.
      expect((contents as CypressBuffer).length).to.be.greaterThan(10000)
    }) as Cypress.Chainable<CypressBuffer>
}

export function assertSnackbar(text: string | RegExp): void {
  cy.get('[data-cy=error-snackbar]').should(($el) => {
    const content = $el.text()
    if (typeof text === 'string') {
      expect(content).to.contain(text)
    } else {
      expect(content).to.match(text)
    }
  })
}

export function assertNoSnackbar(): void {
  cy.get('[data-cy=error-snackbar]').should('not.exist')
}
