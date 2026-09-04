/* eslint-disable jest/expect-expect */
// INFO: The five events <StarryDigitizer> emits — ready, update:project,
// change, image-replaced and error — observed through the host app's own
// counters and JSON dumps.

import {
  addPoints,
  calibrateAxes,
  DatasetValuesLike,
  expectedLinearValue,
  ProjectLike,
  readCount,
  readJson,
  setAxisValues,
  visitHostApp,
} from '../../support/hostApp'

describe('host app: ready', () => {
  it('fires exactly once after mount, carrying the DTO version', () => {
    visitHostApp()
    cy.get('[data-cy=ready]').should('have.text', '{"version":"2.0.0"}')
    cy.get('[data-cy=ready-count]').should('have.text', '1')
  })

  it('fires again for every remount', () => {
    visitHostApp()
    cy.get('[data-cy=remount]').click()
    cy.get('[data-cy=ready-count]').should('have.text', '2')
  })
})

describe('host app: update:project', () => {
  beforeEach(() => {
    visitHostApp()
  })

  it('is not emitted for the initial load', () => {
    // INFO: restoring the host's own project must not immediately echo back
    // at it — a host that persists on every update would loop forever.
    cy.wait(800)
    cy.get('[data-cy=update-count]').should('have.text', '0')
    cy.get('[data-cy=change-count]').should('have.text', '0')
    cy.get('[data-cy=project-json]').should('have.text', '')
  })

  it('coalesces several rapid clicks into a single debounced emission', () => {
    calibrateAxes()
    // INFO: the calibration clicks emit on their own; start counting after
    // them so the assertion is about the burst that follows.
    cy.get('[data-cy=update-count]').should('not.have.text', '0')
    cy.get('[data-cy=clear-log]').click()

    // INFO: four clicks well inside the 300ms debounce window.
    cy.get('[data-cy=canvas-wrapper]')
      .click(200, 200)
      .click(220, 210)
      .click(240, 220)
      .click(260, 230)
    cy.get('.canvas-point').should('have.length', 4)

    cy.wait(800)
    cy.get('[data-cy=update-count]').should('have.text', '1')
    cy.get('[data-cy=change-count]').should('have.text', '1')
    // INFO: the single emission has to describe the FINAL state, not the
    // first click of the burst.
    readJson<ProjectLike>('project-json').should((project) => {
      expect(project.datasets[0].points).to.have.length(4)
    })
  })

  it('emits again for a later, separate edit', () => {
    calibrateAxes()
    cy.get('[data-cy=clear-log]').click()
    addPoints([[200, 200]])
    cy.get('.canvas-point').should('have.length', 1)
    cy.get('[data-cy=update-count]').should('have.text', '1')
    cy.wait(500)
    addPoints([[260, 230]])
    cy.get('.canvas-point').should('have.length', 2)
    cy.get('[data-cy=update-count]').should('have.text', '2')
  })
})

describe('host app: change payload', () => {
  it('reports physical values consistent with the axis calibration', () => {
    visitHostApp()
    calibrateAxes([60, 400], [460, 60])
    setAxisValues({ x1: 0, x2: 100, y1: 0, y2: 50 })
    addPoints([
      [160, 300],
      [260, 200],
      [360, 120],
    ])
    cy.get('.canvas-point').should('have.length', 3)
    cy.wait(600)

    readJson<ProjectLike>('project-json').then((project) => {
      const axisSet = project.axisSets[0]
      expect(axisSet.xIsLogScale).to.equal(false)
      expect(axisSet.yIsLogScale).to.equal(false)
      expect(axisSet.x1.value).to.equal(0)
      expect(axisSet.x2.value).to.equal(100)
      expect(axisSet.y1.value).to.equal(0)
      expect(axisSet.y2.value).to.equal(50)

      readJson<DatasetValuesLike[]>('datasets-json').should((datasets) => {
        const dataset = datasets[0]
        expect(dataset.points).to.have.length(3)
        expect(dataset.pixelPoints).to.have.length(3)
        dataset.pixelPoints.forEach((pixel, index) => {
          const expectedValue = expectedLinearValue(axisSet, pixel)
          // INFO: the library rounds to the configured effective digits,
          // hence a relative tolerance rather than a strict equality.
          expect(dataset.points[index].x).to.be.closeTo(
            expectedValue.x,
            Math.abs(expectedValue.x) * 0.01 + 0.05,
          )
          expect(dataset.points[index].y).to.be.closeTo(
            expectedValue.y,
            Math.abs(expectedValue.y) * 0.01 + 0.05,
          )
        })
        // INFO: sanity check that the numbers are in the axis range at all,
        // so a formula that agrees with a broken calibration still fails.
        dataset.points.forEach((point) => {
          expect(point.x).to.be.within(0, 100)
          expect(point.y).to.be.within(0, 50)
        })
      })
    })
  })

  it('carries the same project the update:project event carried', () => {
    visitHostApp()
    calibrateAxes()
    addPoints([[200, 200]])
    cy.get('.canvas-point').should('have.length', 1)
    cy.wait(600)
    readCount('change-count').should('be.greaterThan', 0)
    readJson<DatasetValuesLike[]>('datasets-json').then((datasets) => {
      readJson<ProjectLike>('project-json').should((project) => {
        expect(datasets[0].pixelPoints).to.have.length(
          project.datasets[0].points.length,
        )
      })
    })
  })
})

describe('host app: image-replaced', () => {
  beforeEach(() => {
    visitHostApp()
  })

  it('never fires while features.imageUpload is off', () => {
    // INFO: with the feature off the file input is not even rendered, so the
    // only way in would be the paste listener — which is gone with it.
    cy.get('[data-cy=image-file-input]').should('not.exist')
    cy.get('[data-cy=image-replaced-count]').should('have.text', '0')
  })

  it('fires with a Blob payload once imageUpload is on', () => {
    cy.get('[data-cy=toggle-image-upload]').click()
    cy.get('[data-cy=image-file-input]').selectFile(
      'cypress/fixtures/sample_graph_curve_2.png',
      { force: true },
    )
    cy.get('[data-cy=image-replaced-count]').should('have.text', '1')
    // INFO: the host appends this marker when the payload is not a Blob.
    cy.get('[data-cy=error-codes]').should(
      'not.contain.text',
      'IMAGE_REPLACED_PAYLOAD_INVALID',
    )
  })
})

describe('host app: error', () => {
  beforeEach(() => {
    visitHostApp()
    calibrateAxes()
    addPoints([[200, 200]])
    cy.get('.canvas-point').should('have.length', 1)
    cy.wait(500)
    cy.get('[data-cy=clear-log]').click()
  })

  it('reports DTO_VERSION_UNSUPPORTED for a project from a newer major', () => {
    cy.get('[data-cy=load-future-version]').click()
    cy.get('[data-cy=error-codes]').should(
      'have.text',
      'DTO_VERSION_UNSUPPORTED',
    )
    cy.get('[data-cy=error]').should('contain.text', '3.0.0')
    // INFO: a rejected load must leave the current work untouched.
    cy.get('.canvas-point').should('have.length', 1)
  })

  it('reports INVALID_IMAGE_TYPE for a non-image blob', () => {
    cy.get('[data-cy=load-invalid-image-type]').click()
    cy.get('[data-cy=error-codes]').should('have.text', 'INVALID_IMAGE_TYPE')
    cy.get('[data-cy=error]').should('contain.text', 'png')
    cy.get('.canvas-point').should('have.length', 1)
  })

  it('reports IMAGE_LOAD_FAILED for bytes the decoder rejects', () => {
    cy.get('[data-cy=load-broken-image]').click()
    cy.get('[data-cy=error-codes]').should('have.text', 'IMAGE_LOAD_FAILED')
    cy.get('.canvas-point').should('have.length', 1)
  })

  it('stays silent for an ordinary editing session', () => {
    addPoints([[300, 260]])
    cy.get('.canvas-point').should('have.length', 2)
    cy.wait(500)
    cy.get('[data-cy=error-codes]').should('have.text', '')
  })
})
