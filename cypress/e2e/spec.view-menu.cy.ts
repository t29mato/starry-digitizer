/* eslint-disable jest/expect-expect */
// INFO: The View and Help menus: zoom, the axes-marker and interpolation
// toggles, and the keyboard-shortcuts reference. Zoom is asserted on both the
// percentage the header shows and the real canvas element size, because a
// broken resize would leave the label right and the drawing wrong.

import {
  visitApp,
  calibrateTwoPoints,
  clickCanvas,
  setAxisValues,
  clickMenuItem,
  openMenu,
  closeMenu,
  menuItem,
  assertMenuItemChecked,
  canvasPoints,
  assertTableRow,
} from '../support/app'

const ORIGIN = { x: 60, y: 380 }
const OPPOSITE = { x: 360, y: 80 }
const MIDPOINT = { x: 210, y: 230 }

/** The image is 1180x980, so 100% means a canvas exactly 1180px wide. */
const ORIGINAL_WIDTH = 1180

function assertScale(percent: string, canvasWidth: number) {
  cy.contains('span', percent).should('be.visible')
  cy.get('#imageCanvas').should(($canvas) => {
    expect(($canvas[0] as HTMLCanvasElement).width).to.equal(canvasWidth)
  })
}

describe('View menu', () => {
  beforeEach(() => {
    visitApp()
  })

  it('zooms in, out and back to 100% from the menu', () => {
    assertScale('100%', ORIGINAL_WIDTH)

    clickMenuItem('View', 'Zoom In')
    assertScale('110%', Math.trunc(ORIGINAL_WIDTH * 1.1))

    clickMenuItem('View', 'Zoom In')
    assertScale('120%', Math.trunc(ORIGINAL_WIDTH * 1.2000000000000002))

    clickMenuItem('View', 'Zoom Out')
    assertScale('110%', Math.trunc(ORIGINAL_WIDTH * 1.1))

    clickMenuItem('View', 'Reset to 100%')
    assertScale('100%', ORIGINAL_WIDTH)
  })

  it('fits the image to the available space and back', () => {
    clickMenuItem('View', 'Fit')
    // The viewport is narrower than the image, so fitting must shrink it.
    cy.get('#imageCanvas').should(($canvas) => {
      expect(($canvas[0] as HTMLCanvasElement).width).to.be.lessThan(
        ORIGINAL_WIDTH,
      )
    })
    cy.contains('span', '100%').should('not.exist')

    clickMenuItem('View', 'Reset to 100%')
    assertScale('100%', ORIGINAL_WIDTH)
  })

  it('zooms with the keyboard shortcuts too', () => {
    cy.get('body').trigger('keydown', { key: '+' })
    assertScale('110%', Math.trunc(ORIGINAL_WIDTH * 1.1))

    cy.get('body').trigger('keydown', { key: '-' })
    assertScale('100%', ORIGINAL_WIDTH)

    cy.get('body').trigger('keydown', { key: 'f' })
    cy.get('#imageCanvas').should(($canvas) => {
      expect(($canvas[0] as HTMLCanvasElement).width).to.be.lessThan(
        ORIGINAL_WIDTH,
      )
    })

    cy.get('body').trigger('keydown', { key: '0' })
    assertScale('100%', ORIGINAL_WIDTH)
  })

  it('keeps the points where they belong across a zoom change', () => {
    calibrateTwoPoints(ORIGIN, OPPOSITE)
    setAxisValues({ x1: '0', x2: '10', y1: '0', y2: '100' })
    clickCanvas(MIDPOINT)
    assertTableRow(0, '5', '50')

    clickMenuItem('View', 'Zoom In')
    // Values are stored in image pixels, so zooming must not change them.
    assertTableRow(0, '5', '50')
    canvasPoints().should('have.length', 1)
  })

  it('toggles the axes marker with a check mark in the menu', () => {
    calibrateTwoPoints(ORIGIN, OPPOSITE)

    openMenu('View')
    assertMenuItemChecked('Show Axes Marker', true)
    menuItem('Show Axes Marker').click()

    openMenu('View')
    assertMenuItemChecked('Show Axes Marker', false)
    closeMenu()

    // The panel checkbox mirrors the menu.
    cy.contains('.sd-check', 'Show axes marker')
      .find('input')
      .should('not.be.checked')
  })

  it('opens and closes the keyboard shortcuts dialog from Help', () => {
    cy.get('[data-cy=keyboard-shortcuts-dialog]').should('not.exist')

    clickMenuItem('Help', 'Keyboard Shortcuts')

    cy.get('[data-cy=keyboard-shortcuts-dialog]').should('be.visible')
    cy.contains('.sd-dialog__title', 'Keyboard Shortcuts').should('be.visible')
    cy.contains('[data-cy=keyboard-shortcuts-dialog]', 'Save Project').should('be.visible')
    cy.contains('[data-cy=keyboard-shortcuts-dialog]', 'Undo').should('be.visible')

    cy.get('[data-cy=keyboard-shortcuts-close]').click()
    // INFO: SdDialog renders nothing while closed, so it is gone from the
    // DOM rather than merely hidden.
    cy.get('[data-cy=keyboard-shortcuts-dialog]').should('not.exist')
  })

  it('links the documentation and release notes from Help', () => {
    openMenu('Help')
    menuItem('Document')
      .should('have.attr', 'href')
      .and('contain', 'starrydigitizer.readthedocs.io')
    menuItem('Release Note')
      .should('have.attr', 'href')
      .and('contain', 'github.com/t29mato/starry-digitizer/releases')
    closeMenu()
  })
})
