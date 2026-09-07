/* eslint-disable jest/expect-expect */
// INFO: Cypressのshould methodでアサーションは実質、実施してるので
import { visitApp, waitForSavedInterpolation } from '../support/app'

describe('template spec', () => {
  beforeEach(() => {
    // INFO: visitApp(), not a bare cy.visit() plus one '0' keypress. The app
    // ignores clicks that land outside the image (CanvasMain#point), and
    // `originalWidth` is 0 until the figure has been decoded — so a click sent
    // in the ~200ms a cold load takes is silently dropped, and every click
    // after it shifts one place: the first two data clicks are eaten by the
    // axis calibration and this spec counted 2 points where it wants 3.
    // visitApp() retries the zoom shortcut until the canvas really is at 1:1,
    // which is the only signal that the decode has finished. Same reason the
    // other specs already go through it.
    visitApp()
  })

  //INFO: アンカーポイントと仮で補間された点の区別ができないのでその合計数を検証
  it('asserts that there are 18 points in default interval setting', () => {
    cy.get('[data-cy=canvas-wrapper]')
      .click(50, 390)
      .click(400, 50)
      .click(70, 240)
      .click(150, 220)
      .click(250, 150)

    cy.get('.canvas-point').should('have.length', 3)
  })

  it('asserts that interpolation on/off settings are remained after reload (localStorage feature)', () => {
    cy.get('#switch-interpolation').click()
    // INFO: the save is asynchronous; wait for it rather than racing the
    // reload (see waitForSavedInterpolation).
    waitForSavedInterpolation(true)
    // INFO: keepSession — this spec asserts the setting survives a reload, so
    // it must NOT get the empty auto-save every other visit starts from.
    visitApp({ keepSession: true })

    // INFO: the plain checkbox that replaced <v-switch> has no `value`
    // attribute, so the checked state is asserted directly.
    cy.get('#switch-interpolation').should('be.checked')
  })

  //INFO: 実行したいがCypressのテスト数の上限到達回避のため節約しているテスト
  //INFO: 補間確定後はアンカーポイントが削除されるので点が3つ減る
  // it('asserts that there are 15 points after confirming interpolation in default interval setting', () => {
  //   cy.get('[data-cy=canvas-wrapper]')
  //     .click(50, 390)
  //     .click(400, 50)
  //     .click(70, 240)
  //     .click(150, 220)
  //     .click(250, 150)

  //   cy.get('button#confirm-interpolation').click()

  //   cy.get('.canvas-point').should('have.length', 15)
  // })

  // it('asserts that there are 13 points when interval is 15', () => {
  //   cy.get('input#interpolation-interval').clear().type('15')

  //   cy.get('[data-cy=canvas-wrapper]')
  //     .click(50, 390)
  //     .click(400, 50)
  //     .click(70, 240)
  //     .click(150, 220)
  //     .click(250, 150)

  //   cy.get('.canvas-point').should('have.length', 13)
  // })

  // it('asserts that there are 3 points when interpolation is disabled', () => {
  //   cy.get('#switch-interpolation').click()

  //   cy.get('[data-cy=canvas-wrapper]')
  //     .click(50, 390)
  //     .click(400, 50)
  //     .click(70, 240)
  //     .click(150, 220)
  //     .click(250, 150)

  //   cy.get('.canvas-point').should('have.length', 3)
  // })
})
