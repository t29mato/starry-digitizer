/// <reference types="cypress" />

// INFO: Shared helpers for the STANDALONE app specs (http://localhost:8888).
// The host-app specs live under cypress/e2e/host-app and have their own
// helpers; nothing here may assume the App.vue menu bar exists there.

export type Coord = { x: number; y: number }

/**
 * Visit the app and wait until the sample image has actually been decoded and
 * drawn, then reset the zoom to 100%.
 *
 * The app boots with a "fit" zoom whose factor depends on the viewport, so
 * every spec that clicks the canvas at fixed coordinates must pin the scale
 * first. `0` is the documented "Reset to 100%" shortcut.
 */
export function visitApp(options?: Partial<Cypress.VisitOptions>): void {
  cy.visit('/', options)
  waitForImage()
  resetZoom()
}

/** Waits for the canvas to have a real image drawn on it. */
export function waitForImage(): void {
  cy.get('#imageCanvas')
    .should('exist')
    .and(($canvas) => {
      expect(($canvas[0] as HTMLCanvasElement).width).to.be.greaterThan(0)
    })
}

/**
 * Presses the "Reset to 100%" shortcut and waits until the canvas really is
 * at 1:1 with the image. `expectedWidth` defaults to the sample graph the app
 * boots with; pass the width of a replacement image after an upload.
 */
export function resetZoom(expectedWidth = 1180): void {
  cy.get('body').trigger('keydown', { key: '0' })
  cy.contains('.c__current-dataset-and-axis', 'Dataset:')
  cy.get('#imageCanvas').should(($canvas) => {
    expect(($canvas[0] as HTMLCanvasElement).width).to.equal(expectedWidth)
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

/** Clicks the canvas at a coordinate relative to #canvasWrapper's top-left. */
export function clickCanvas(coord: Coord): void {
  cy.get('#canvasWrapper').click(coord.x, coord.y)
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

export function pointCount(datasetId: number): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get(`.dataset-count-${datasetId}`)
}

/** Triggers the Ctrl/Cmd+Z undo shortcut. */
export function undo(times = 1): void {
  for (let i = 0; i < times; i++) {
    cy.get('body').trigger('keydown', { key: 'z', ctrlKey: true, metaKey: true })
  }
}

/** Triggers the Ctrl/Cmd+Shift+Z redo shortcut. */
export function redo(times = 1): void {
  for (let i = 0; i < times; i++) {
    cy.get('body').trigger('keydown', {
      key: 'z',
      ctrlKey: true,
      metaKey: true,
      shiftKey: true,
    })
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
  cy.stub(win.navigator.clipboard, 'writeText')
    .as('clipboardWrite')
    .resolves()
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
 * Waits for "Save Project" to have finished writing exactly one `sd-*.zip`
 * into the downloads folder and yields its contents.
 *
 * The bytes are read before the spec navigates away on purpose: reloading the
 * page while the browser still has the download in flight cancels it and
 * removes the half-written file.
 */
export function readDownloadedProject(): Cypress.Chainable<CypressBuffer> {
  cy.task('listDownloads').should((files) => {
    const zips = (files as string[]).filter((f) => /^sd-.*\.zip$/.test(f))
    expect(zips, 'exactly one sd-*.zip was downloaded').to.have.length(1)
  })
  return cy
    .task('listDownloads')
    .then((files) => {
      const name = (files as string[]).find((f) => /^sd-.*\.zip$/.test(f))
      return cy.readFile(`cypress/downloads/${name}`, null)
    })
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
