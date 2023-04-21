/* eslint-disable jest/expect-expect */
// INFO: Cypressのshould methodでアサーションは実質、実施してるので
describe('template spec', () => {
  beforeEach(() => {
    cy.visit('/')
  })
  it('should enable x10 and x0.1 buttons when Log checkbox is checked', () => {
    cy.get('#multiply-by-ten-x1').should('not.exist')
    cy.get('#divide-by-ten-x1').should('not.exist')
    // Log checkboxをクリック
    cy.get('#x-is-log').click({ force: true })

    // x10 buttonをクリックして値が10倍になることを確認
    cy.get('#x1-value').type('{selectall}2').should('have.value', '2')
    cy.get('#multiply-by-ten-x1').click({ force: true })
    cy.get('#x1-value').should('have.value', '2e+1')
    cy.get('#x2-value').type('{selectall}5').should('have.value', '5')
    cy.get('#multiply-by-ten-x2').click()
    cy.get('#x2-value').should('have.value', '5e+1')

    // x0.1 buttonをクリックして値が0.1倍になることを確認
    cy.get('#x1-value').type('{selectall}2').should('have.value', '2')
    cy.get('#divide-by-ten-x1').click({ force: true })
    cy.get('#x1-value').should('have.value', '0.2')
    cy.get('#x2-value').type('{selectall}5').should('have.value', '5')
    cy.get('#divide-by-ten-x2').click()
    cy.get('#x2-value').should('have.value', '0.5')

    cy.get('#x-is-log').click({ force: true })
    cy.get('#multiply-by-ten-x1').should('not.exist')
    cy.get('#divide-by-ten-x1').should('not.exist')

    cy.get('#multiply-by-ten-y1').should('not.exist')
    cy.get('#divide-by-ten-y1').should('not.exist')
    cy.get('#y-is-log').click({ force: true })
    // y軸に関してもx軸と同様のテストを実施
    cy.get('#y1-value').type('{selectall}2').should('have.value', '2')
    cy.get('#divide-by-ten-y1').click({ force: true })
    cy.get('#y1-value').should('have.value', '0.2')
    cy.get('#y2-value').type('{selectall}5').should('have.value', '5')
    cy.get('#divide-by-ten-y2').click()
    cy.get('#y2-value').should('have.value', '0.5')
    cy.get('#y1-value').type('{selectall}2').should('have.value', '2')
    cy.get('#multiply-by-ten-y1').click({ force: true })
    cy.get('#y1-value').should('have.value', '2e+1')
    cy.get('#y2-value').type('{selectall}5').should('have.value', '5')
    cy.get('#multiply-by-ten-y2').click()
    cy.get('#y2-value').should('have.value', '5e+1')
    cy.get('#y-is-log').click({ force: true })
    cy.get('#multiply-by-ten-y1').should('not.exist')
    cy.get('#divide-by-ten-y1').should('not.exist')
  })
})
