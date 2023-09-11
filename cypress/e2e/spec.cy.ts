/* eslint-disable jest/expect-expect */
// INFO: Cypressのshould methodでアサーションは実質、実施してるので
describe('template spec', () => {
  beforeEach(() => {
    cy.visit('/')
  })
  it('red line test with selected area', () => {
    cy.contains('Pen').click()
    cy.get('#canvasWrapper')
      .trigger('mousedown', 300, 100)
      //TODO: force: true is a work around
      .trigger('mousemove', 300, 300, { force: true })
      .trigger('mouseup')
    cy.contains('Run').click()
  })
  it('red line test', () => {
    cy.contains('Run').click()
    cy.wait(500)
    cy.get('.dataset-count-1').should('contain.text', '123')
  })
  it('red line test with changing delta x and y', () => {
    cy.get('#line-extract-dx').clear().type('20')
    cy.contains('Run').click()
    cy.wait(500)
    cy.get('.dataset-count-1').should('contain.text', '63')
  })
})
