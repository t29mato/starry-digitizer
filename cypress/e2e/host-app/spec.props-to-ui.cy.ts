/* eslint-disable jest/expect-expect */
// INFO: Every <StarryDigitizer> prop that only changes what the host's users
// can see or do: `readonly`, the three `features` flags and
// `datasetNameCandidates`. Assertions are on the rendered UI (buttons,
// inputs, the data table) rather than on internal state.

import {
  addPoints,
  calibrateAxes,
  FIRST_IMAGE_WIDTH,
  readCount,
  SECOND_IMAGE_WIDTH,
  visitHostApp,
} from '../../support/hostApp'

const POINTS: [number, number][] = [
  [200, 200],
  [250, 150],
]

/** Pastes a real PNG onto the document, the way a user pastes a screenshot. */
function pasteImage(): void {
  cy.window().then(async (win) => {
    const response = await win.fetch('/sample_graph_curve_2.png')
    const blob = await response.blob()
    const file = new win.File([blob], 'pasted.png', { type: 'image/png' })
    const transfer = new win.DataTransfer()
    transfer.items.add(file)
    win.document.dispatchEvent(
      new win.ClipboardEvent('paste', { clipboardData: transfer }),
    )
  })
}

describe('host app: readonly prop disables every editing affordance', () => {
  beforeEach(() => {
    visitHostApp()
    calibrateAxes()
    addPoints(POINTS)
    cy.get('.canvas-point').should('have.length', POINTS.length)
    cy.get('[data-cy=toggle-readonly]').click()
    cy.get('[data-cy=toggle-readonly]').should('contain.text', 'readonly: on')
  })

  it('adds no point when the canvas is clicked', () => {
    cy.get('[data-cy=canvas-wrapper]').click(300, 250)
    cy.get('[data-cy=canvas-wrapper]').click(320, 260)
    // INFO: wait past the update debounce so a point that did get added
    // would have had time to show up.
    cy.wait(500)
    cy.get('.canvas-point').should('have.length', POINTS.length)
    cy.get('.dataset-count-1').should('contain.text', String(POINTS.length))
  })

  it('disables the axis settings controls', () => {
    cy.get('[data-cy=x1-value]').should('be.disabled')
    cy.get('[data-cy=x2-value]').should('be.disabled')
    cy.get('[data-cy=y1-value]').should('be.disabled')
    cy.get('[data-cy=y2-value]').should('be.disabled')
    cy.get('#x-is-log').should('be.disabled')
    cy.get('#y-is-log').should('be.disabled')
    cy.contains('button', 'Edit Axes').should('be.disabled')
    cy.contains('button', 'Clear XY Axes').should('be.disabled')
    cy.contains('button', 'Auto-fill values (OCR)').should('be.disabled')
  })

  it('disables the dataset and axis-set list buttons', () => {
    cy.contains('h4', 'Datasets').find('button').should('be.disabled')
    cy.contains('h4', 'XY Axes List').find('button').should('be.disabled')
    // INFO: per-row "clear points" / "delete dataset" buttons; the CSV copy
    // button stays enabled because reading data out is not an edit.
    cy.get('.c__dataset-row button[title="Clear points"]').should('be.disabled')
    cy.get('.c__dataset-row button[title="Delete dataset"]').should(
      'be.disabled',
    )
  })

  it('disables the extraction controls', () => {
    cy.contains('button', 'Run').should('be.disabled')
    cy.contains('button', 'Add (A)').should('be.disabled')
    cy.contains('button', 'Edit (E)').should('be.disabled')
    cy.contains('button', 'Delete (D)').should('be.disabled')
    cy.contains('h5', 'Interpolation')
      .parent()
      .find('input')
      .should('be.disabled')
  })

  it('renders the data table read-only', () => {
    // INFO: the table is plain read-only markup now — no editor opens on any
    // cell, in readonly mode or out of it.
    cy.get('[data-cy=data-table] td').should('have.length.greaterThan', 0)
    cy.get('[data-cy=data-table] td').first().dblclick()
    cy.get('[data-cy=data-table] input').should('not.exist')
  })

  it('re-enables everything when readonly goes back off', () => {
    cy.get('[data-cy=toggle-readonly]').click()
    cy.get('[data-cy=toggle-readonly]').should('contain.text', 'readonly: off')
    cy.get('[data-cy=x1-value]').should('not.be.disabled')
    cy.contains('button', 'Run').should('not.be.disabled')
    cy.get('[data-cy=canvas-wrapper]').click(300, 250)
    cy.get('.canvas-point').should('have.length', POINTS.length + 1)
  })
})

describe('host app: features.imageUpload', () => {
  beforeEach(() => {
    visitHostApp()
  })

  it('hides the file input while off', () => {
    cy.get('[data-cy=toggle-image-upload]').should(
      'contain.text',
      'imageUpload: off',
    )
    cy.get('[data-cy=image-file-input]').should('not.exist')
  })

  it('ignores a pasted image while off', () => {
    pasteImage()
    cy.wait(500)
    cy.get('[data-cy=image-replaced-count]').should('have.text', '0')
    cy.get('[data-cy=image-canvas]').should(
      'have.attr',
      'width',
      String(FIRST_IMAGE_WIDTH),
    )
    cy.get('[data-cy=error-codes]').should('have.text', '')
  })

  it('shows the file input and accepts a pasted image while on', () => {
    cy.get('[data-cy=toggle-image-upload]').click()
    cy.get('[data-cy=toggle-image-upload]').should(
      'contain.text',
      'imageUpload: on',
    )
    cy.get('[data-cy=image-file-input]').should('exist')

    pasteImage()
    // INFO: image-replaced only fires once the new image is decoded and drawn.
    cy.get('[data-cy=image-replaced-count]').should('have.text', '1')
    // INFO: a replaced image is drawn fit-to-wrapper; zoom back to 100% so
    // the canvas reports the new figure's intrinsic width.
    cy.get('body').trigger('keydown', { key: '0' })
    cy.get('[data-cy=image-canvas]').should(
      'have.attr',
      'width',
      String(SECOND_IMAGE_WIDTH),
    )
    cy.get('[data-cy=error-codes]').should('have.text', '')
  })

  it('accepts an uploaded file and reports image-replaced while on', () => {
    cy.get('[data-cy=toggle-image-upload]').click()
    cy.get('[data-cy=image-file-input]').selectFile(
      'cypress/fixtures/sample_graph_curve_2.png',
      { force: true },
    )
    cy.get('[data-cy=image-replaced-count]').should('have.text', '1')
    cy.get('body').trigger('keydown', { key: '0' })
    cy.get('[data-cy=image-canvas]').should(
      'have.attr',
      'width',
      String(SECOND_IMAGE_WIDTH),
    )
  })
})

describe('host app: features.csvExport', () => {
  beforeEach(() => {
    visitHostApp()
    calibrateAxes()
    addPoints(POINTS)
    cy.get('.canvas-point').should('have.length', POINTS.length)
  })

  it('shows the copy buttons while on (the host default)', () => {
    cy.get('[data-cy=toggle-csv-export]').should(
      'contain.text',
      'csvExport: on',
    )
    cy.contains('button', 'Copy to Clipboard').should('exist')
    cy.get('.c__dataset-row [data-cy=dataset-copy]').should('exist')
  })

  it('hides every copy button while off', () => {
    cy.get('[data-cy=toggle-csv-export]').click()
    cy.get('[data-cy=toggle-csv-export]').should(
      'contain.text',
      'csvExport: off',
    )
    cy.contains('button', 'Copy to Clipboard').should('not.exist')
    cy.get('.c__dataset-row [data-cy=dataset-copy]').should('not.exist')
    // INFO: hiding CSV export must not take the points with it.
    cy.get('.canvas-point').should('have.length', POINTS.length)
  })
})

describe('host app: features.axisOcr', () => {
  beforeEach(() => {
    visitHostApp()
  })

  it('shows the OCR button and its accuracy hint while on (the default)', () => {
    cy.get('[data-cy=toggle-axis-ocr]').should('contain.text', 'axisOcr: on')
    cy.contains('button', 'Auto-fill values (OCR)').should('exist')
    cy.get('.c__AxisSetRepository-settings__ocr-warning').should('exist')
  })

  it('hides the OCR button and its accuracy hint while off', () => {
    cy.get('[data-cy=toggle-axis-ocr]').click()
    cy.get('[data-cy=toggle-axis-ocr]').should('contain.text', 'axisOcr: off')
    cy.contains('button', 'Auto-fill values (OCR)').should('not.exist')
    cy.get('.c__AxisSetRepository-settings__ocr-warning').should('not.exist')
    // INFO: only the OCR affordance goes away — the rest of the axis panel
    // (the value fields, the calibration mode radios, the other buttons)
    // has nothing to do with OCR and must stay.
    cy.get('[data-cy=x1-value]').should('exist')
    cy.get('[data-cy=y2-value]').should('exist')
    cy.get('[data-cy=calibration-mode]').should('exist')
    cy.contains('button', 'Edit Axes').should('exist')
    cy.contains('button', 'Clear XY Axes').should('exist')
  })
})

describe('host app: features.zipExportImport', () => {
  beforeEach(() => {
    visitHostApp()
    calibrateAxes()
    addPoints(POINTS)
    cy.get('.canvas-point').should('have.length', POINTS.length)
    // INFO: "Save Project" downloads through a synthetic <a>, "Load Project"
    // opens a synthetic <input type=file>. Stubbing .click() on both is the
    // only way to observe that the shortcuts did nothing at all.
    cy.window().then((win) => {
      cy.stub(win.HTMLAnchorElement.prototype, 'click').as('anchorClick')
      cy.stub(win.HTMLInputElement.prototype, 'click').as('inputClick')
    })
  })

  it('ignores Cmd+S and Cmd+O while off', () => {
    cy.get('[data-cy=toggle-zip-feature]').should(
      'contain.text',
      'zipExportImport: off',
    )
    cy.get('body').trigger('keydown', { key: 's', metaKey: true })
    cy.get('body').trigger('keydown', { key: 'o', metaKey: true })
    cy.wait(500)
    cy.get('@anchorClick').should('not.have.been.called')
    cy.get('@inputClick').should('not.have.been.called')
    cy.get('[data-cy=error-codes]').should('have.text', '')
  })

  it('saves and opens the file dialog once the feature is on', () => {
    cy.get('[data-cy=toggle-zip-feature]').click()
    cy.get('[data-cy=toggle-zip-feature]').should(
      'contain.text',
      'zipExportImport: on',
    )
    cy.get('body').trigger('keydown', { key: 's', metaKey: true })
    cy.get('@anchorClick').should('have.been.calledOnce')
    cy.get('body').trigger('keydown', { key: 'o', metaKey: true })
    cy.get('@inputClick').should('have.been.calledOnce')
  })
})

describe('host app: datasetNameCandidates', () => {
  beforeEach(() => {
    visitHostApp()
  })

  it('offers the candidates and renames the dataset when one is picked', () => {
    // INFO: the combobox suggestions are a native <datalist>. Its dropdown is
    // drawn by the browser outside the page, so the candidates are read off
    // the <option> elements through jQuery rather than clicked open.
    cy.get('.c__dataset-row .sd-combobox').first().as('nameField')
    cy.get('@nameField')
      .find('input')
      .then(($input) => {
        const listId = $input.attr('list')
        expect(listId, 'name field is wired to a datalist').to.be.a('string')
        const values = Cypress.$(`datalist#${listId} option`)
          .toArray()
          .map((option) => option.getAttribute('value'))
        expect(values).to.deep.equal(['Sample A', 'Sample B'])
      })

    // INFO: picking a suggestion is set-the-value-and-fire-input, which is
    // what the native widget does. It is NOT cy.type()'d: as soon as the typed
    // prefix matches an <option> Chromium opens the suggestion popup, and
    // rendering it segfaults the Electron test runner.
    cy.get('@nameField')
      .find('input')
      .then(($input) => {
        const input = $input[0] as HTMLInputElement
        input.value = 'Sample B'
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    cy.get('.c__dataset-row .sd-combobox input')
      .first()
      .should('have.value', 'Sample B')
    // INFO: the header mirrors the active dataset's name.
    cy.get('.c__current-dataset-and-axis').should('contain.text', 'Sample B')

    // INFO: renaming is a project change, so it has to reach the host.
    cy.get('[data-cy=project-json]').should('contain.text', '"Sample B"')
    readCount('update-count').should('be.greaterThan', 0)
  })

  it('still accepts free text that is not a candidate', () => {
    cy.get('.c__dataset-row .sd-combobox input')
      .first()
      .clear()
      .type('Totally custom name{enter}')
    cy.get('body').click(0, 0)
    cy.get('.c__dataset-row .sd-combobox input')
      .first()
      .should('have.value', 'Totally custom name')
    cy.get('[data-cy=project-json]').should(
      'contain.text',
      '"Totally custom name"',
    )
  })
})
