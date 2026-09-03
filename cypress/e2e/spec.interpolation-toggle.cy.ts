/* eslint-disable jest/expect-expect */
// INFO: Turning interpolation off used to lose the points the user had
// clicked by hand (they only existed as interpolation anchors), so these
// specs pin down that manual points survive both directions of the toggle
// and that the View menu and the panel switch stay in step.

import {
  visitApp,
  calibrateTwoPoints,
  clickCanvas,
  setAxisValues,
  openMenu,
  menuItem,
  assertMenuItemChecked,
  canvasPoints,
  pointCount,
  tableRows,
} from '../support/app'

const ORIGIN = { x: 60, y: 380 }
const OPPOSITE = { x: 360, y: 80 }
const ANCHORS = [
  { x: 100, y: 340 },
  { x: 200, y: 240 },
  { x: 300, y: 140 },
]

function calibrate() {
  calibrateTwoPoints(ORIGIN, OPPOSITE)
  setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
}

describe('interpolation toggle', () => {
  beforeEach(() => {
    visitApp()
  })

  it('starts switched off', () => {
    cy.get('#switch-interpolation').should('not.be.checked')
    cy.get('#interpolation-interval').should('not.exist')
  })

  it('keeps the manually added points when interpolation is switched on', () => {
    calibrate()
    ANCHORS.forEach(clickCanvas)
    canvasPoints().should('have.length', 3)
    pointCount(1).should('have.text', '3')

    cy.get('#switch-interpolation').click()

    // The dataset still holds exactly the user's own three points...
    pointCount(1).should('have.text', '3')
    // ...while the canvas additionally previews the interpolated curve.
    canvasPoints().should(($points) => {
      expect($points.length).to.be.greaterThan(3)
    })
    // The interval control appears with interpolation on.
    cy.get('#interpolation-interval').should('exist')
    cy.contains('.sd-btn', 'Confirm').should('be.visible')
  })

  it('keeps the manually added points when interpolation is switched back off', () => {
    calibrate()
    cy.get('#switch-interpolation').click()
    ANCHORS.forEach(clickCanvas)
    pointCount(1).should('have.text', '3')
    canvasPoints().should(($points) => {
      expect($points.length).to.be.greaterThan(3)
    })

    cy.get('#switch-interpolation').click()

    // The preview is dropped and only the three hand-placed points remain.
    canvasPoints().should('have.length', 3)
    pointCount(1).should('have.text', '3')
    tableRows().should('have.length', 3)
    cy.get('#interpolation-interval').should('not.exist')
  })

  it('turns interpolation on and off from the View menu as well', () => {
    openMenu('View')
    assertMenuItemChecked('Interpolation', false)
    menuItem('Interpolation').click()

    cy.get('#switch-interpolation').should('be.checked')

    openMenu('View')
    assertMenuItemChecked('Interpolation', true)
    menuItem('Interpolation').click()

    cy.get('#switch-interpolation').should('not.be.checked')
  })

  it('remembers the setting across a reload', () => {
    cy.get('#switch-interpolation').click()
    cy.get('#switch-interpolation').should('be.checked')

    visitApp()

    cy.get('#switch-interpolation').should('be.checked')
    cy.get('#interpolation-interval').should('exist')
  })

  it('materialises the interpolated points when Confirm is pressed', () => {
    calibrate()
    cy.get('#switch-interpolation').click()
    ANCHORS.forEach(clickCanvas)
    pointCount(1).should('have.text', '3')

    cy.contains('.sd-btn', 'Confirm').click()

    // INFO: confirming drops the three anchors and keeps the sampled curve,
    // so the dataset ends up with more points than were clicked.
    pointCount(1).should(($count) => {
      expect(Number($count.text())).to.be.greaterThan(3)
    })
    tableRows().should(($rows) => {
      expect($rows.length).to.be.greaterThan(3)
    })
  })
})
