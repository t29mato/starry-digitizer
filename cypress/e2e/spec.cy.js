describe('template spec', () => {
  beforeEach(() => {
    cy.visit('/')
  })
  it('red line test', () => {
    cy.contains('Run').click()
    cy.cy.wait(1000)
    cy.get('.dataset-count-1').should('contain.text', '123')
  })
  it('red line test with changing delta x and y', () => {
    cy.get('#line-extract-dx').clear().type('20')
    cy.contains('Run').click()
    cy.wait(1000)
    cy.get('.dataset-count-1').should('contain.text', '63')
  })
})
