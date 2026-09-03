/* eslint-disable jest/expect-expect */
// INFO: Acceptance criterion 2 — the same figure restored from a ZIP and
// restored through the host API path (loadProject(dto, blob)) must yield the
// same getDatasetValues() output.

describe('host app: ZIP path and API path agree', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.get('[data-cy=ready]').should('contain.text', 'version')
    cy.get('body').trigger('keydown', { key: '0' })
  })

  it('produces identical dataset values after a ZIP round trip', () => {
    // INFO: select the calibration mode explicitly (see spec.props-and-events).
    cy.contains('.sd-check', '2 Points').click()
    cy.get('#canvasWrapper')
      .click(50, 390)
      .click(400, 50)
      .click(200, 200)
      .click(250, 150)
    cy.get('.canvas-point').should('have.length', 2)
    cy.wait(500)

    // Values produced by the live (API-path) state.
    let valuesBefore = ''
    cy.get('[data-cy=get-values]').click()
    cy.get('[data-cy=values-json]')
      .invoke('text')
      .then((text) => {
        valuesBefore = text
        expect(valuesBefore).to.contain('"points"')
      })

    // Export the ZIP and pull its bytes out of the page.
    // INFO: Cypress bundles its own Buffer implementation; typing this as the
    // global `Buffer` clashes with @types/node under vue-tsc.
    let zipBuffer: ReturnType<typeof Cypress.Buffer.from>
    cy.get('[data-cy=export-zip]').click()
    cy.window().its('__lastZip').should('exist')
    cy.window()
      .then((win) =>
        (win as unknown as { __lastZip: Blob }).__lastZip.arrayBuffer(),
      )
      .then((arrayBuffer) => {
        zipBuffer = Cypress.Buffer.from(new Uint8Array(arrayBuffer))
      })

    // Switch to a different figure so nothing can leak into the comparison.
    cy.get('[data-cy=remount-other]').click()
    cy.get('[data-cy=ready]').should('contain.text', 'version')
    cy.get('.dataset-count-1').should('contain.text', '0')

    // Load the ZIP the way a host would: unzip, migrateProject, loadProject.
    cy.then(() => {
      cy.get('[data-cy=zip-input]').selectFile(
        {
          contents: zipBuffer,
          fileName: 'project.zip',
          mimeType: 'application/zip',
        },
        { force: true },
      )
    })

    cy.get('.canvas-point').should('have.length', 2)
    cy.get('[data-cy=error]').should('have.text', '')

    cy.get('[data-cy=get-values]').click()
    cy.get('[data-cy=values-json]')
      .invoke('text')
      .should((text) => {
        expect(text).to.equal(valuesBefore)
      })
  })
})
