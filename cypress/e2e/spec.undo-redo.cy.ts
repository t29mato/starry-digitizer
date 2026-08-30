/* eslint-disable jest/expect-expect */
describe('undo/redo', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.get('#reset-canvas-scale').click()
  })

  it('undoes and redoes a point addition with the Ctrl/Cmd+Z shortcut', () => {
    cy.get('#canvasWrapper')
      // INFO: default calibration mode is "2 Points" — the first click sets
      // x1/y1, the second sets x2/y2 (see AxisSet#nextAxis), and only
      // clicks after that add data points. Mirrors spec.interpolation.cy.ts.
      .click(50, 390)
      .click(400, 50)
      .click(200, 200)

    cy.get('.canvas-point').should('have.length', 1)

    cy.get('body').trigger('keydown', {
      key: 'z',
      ctrlKey: true,
      metaKey: true,
    })
    cy.get('.canvas-point').should('have.length', 0)

    cy.get('body').trigger('keydown', {
      key: 'z',
      ctrlKey: true,
      metaKey: true,
      shiftKey: true,
    })
    cy.get('.canvas-point').should('have.length', 1)
  })

  it('undoes and redoes via the Undo/Redo header buttons', () => {
    cy.get('[title^="Undo"]').should('be.disabled')
    cy.get('[title^="Redo"]').should('be.disabled')

    cy.get('#canvasWrapper')
      .click(50, 390)
      .click(400, 50)
      .click(200, 200)
      .click(250, 150)

    cy.get('.canvas-point').should('have.length', 2)
    cy.get('[title^="Undo"]').should('be.enabled')

    cy.get('[title^="Undo"]').click()
    cy.get('.canvas-point').should('have.length', 1)
    cy.get('[title^="Redo"]').should('be.enabled')

    cy.get('[title^="Redo"]').click()
    cy.get('.canvas-point').should('have.length', 2)
    cy.get('[title^="Redo"]').should('be.disabled')
  })
})
