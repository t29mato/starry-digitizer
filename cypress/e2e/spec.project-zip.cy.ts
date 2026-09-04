/* eslint-disable jest/expect-expect */
// INFO: Standalone app (GitHub Pages build). The File menu still has to
// produce a project ZIP after the library refactor. The download itself is
// intercepted by stubbing the anchor click, so the test never depends on the
// browser's download folder or on the timestamped file name.

describe('File menu: project ZIP', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        // INFO: presentation/utils/downloadBlob creates an <a download> and
        // clicks it; stub the click so the assertion can read the attributes.
        cy.stub(win.HTMLAnchorElement.prototype, 'click').as('anchorClick')
      },
    })
  })

  it('saves the project as a ZIP download', () => {
    cy.get('[data-cy=canvas-wrapper]').click(50, 390).click(400, 50).click(200, 200)

    cy.get('[data-cy=menu-file]').click()
    cy.get('[data-cy=menu-item-save-project]').click()

    cy.get('@anchorClick').should('have.been.calledOnce')
    cy.get('@anchorClick').then((stub) => {
      const anchor = (stub as unknown as { thisValues: HTMLAnchorElement[] })
        .thisValues[0]
      expect(anchor.download).to.match(/\.zip$/)
      expect(anchor.href).to.contain('blob:')
    })

    // INFO: errors surface in the app's snackbar; none must appear.
    cy.get('[data-cy=error-snackbar]').should('not.exist')
  })

  it('offers Load Project in the File menu', () => {
    // INFO: clicking it opens a native file dialog that Cypress cannot drive,
    // so only its presence and enabled state are checked here. The actual
    // ZIP restore path is covered by the host-app spec (spec.zip-vs-api).
    cy.get('[data-cy=menu-file]').click()
    cy.get('[data-cy=menu-item-load-project]').should('not.be.disabled')
  })
})
