/* eslint-disable jest/expect-expect */
// INFO: Cypressのshould methodでアサーションは実質、実施してるので
import { visitApp } from '../support/app'
describe('template spec', () => {
  beforeEach(() => {
    // INFO: visitApp(), not a bare cy.visit(). Extraction reads the ORIGINAL
    // image pixels, so pressing Run before the decode finishes yields a
    // different count — the same start-up race that made spec.interpolation
    // and spec.undo-redo drop their first click. resetZoom() inside visitApp()
    // retries until the canvas really carries the image, which is the only
    // signal that survives the async decode.
    visitApp()
  })
  it('red line test with selected area', () => {
    cy.contains('Pen').click()
    cy.get('[data-cy=canvas-wrapper]')
      .trigger('mousedown', 300, 100)
      //TODO: force: true is a work around
      .trigger('mousemove', 300, 300)
      .trigger('mouseup')
    cy.contains('Run').click()
  })
  it('red line test', () => {
    cy.contains('Run').click()
    cy.wait(500)
    cy.get('.dataset-count-1').should('contain.text', '509')
  })
  it('red line test with changing delta x and y', () => {
    cy.get('#line-extract-dx').clear().type('20')
    cy.contains('Run').click()
    cy.wait(500)
    cy.get('.dataset-count-1').should('contain.text', '255')
  })
})
