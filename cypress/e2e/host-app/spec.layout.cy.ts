// INFO: The layout half of the embedding contract: the panel feature flags,
// the host slots, and the `--sd-*` custom properties that let a host fit the
// digitizer into a pane it owns. Everything is asserted through the host app's
// own hooks or through public CSS custom properties — never by reaching into
// the library's internals to resize it.

import { calibrateAxes, visitHostApp } from '../../support/hostApp'

/** The panel each feature flag owns, addressed the way a user would see it. */
const PANELS = {
  axisPanel: () => cy.contains('h4', 'XY Axes List'),
  datasetPanel: () => cy.contains('h4', 'Datasets'),
  extractionPanel: () => cy.contains('h4', 'Manual Extraction'),
  magnifier: () => cy.get('.c__magnifier'),
  dataTable: () => cy.get('[data-cy=data-table]'),
}

describe('host app: panel feature flags', () => {
  beforeEach(() => {
    visitHostApp()
  })

  it('shows every panel by default', () => {
    Object.values(PANELS).forEach((panel) => panel().should('exist'))
  })

  it('hides the axis panel and its calibration fields', () => {
    cy.get('[data-cy=toggle-axis-panel]').click()
    cy.get('[data-cy=toggle-axis-panel]').should(
      'contain.text',
      'axisPanel: off',
    )
    PANELS.axisPanel().should('not.exist')
    cy.get('[data-cy=x1-value]').should('not.exist')
    // INFO: hiding one panel must leave the rest of the layout alone.
    PANELS.datasetPanel().should('exist')
    cy.get('[data-cy=image-canvas]').should('exist')

    cy.get('[data-cy=toggle-axis-panel]').click()
    PANELS.axisPanel().should('exist')
    cy.get('[data-cy=x1-value]').should('exist')
  })

  it('hides the dataset panel', () => {
    cy.get('[data-cy=toggle-dataset-panel]').click()
    cy.get('[data-cy=toggle-dataset-panel]').should(
      'contain.text',
      'datasetPanel: off',
    )
    PANELS.datasetPanel().should('not.exist')
    cy.get('.c__dataset-row').should('not.exist')
    PANELS.axisPanel().should('exist')

    cy.get('[data-cy=toggle-dataset-panel]').click()
    PANELS.datasetPanel().should('exist')
    cy.get('.c__dataset-row').should('exist')
  })

  it('hides the extraction panel', () => {
    cy.get('[data-cy=toggle-extraction-panel]').click()
    cy.get('[data-cy=toggle-extraction-panel]').should(
      'contain.text',
      'extractionPanel: off',
    )
    PANELS.extractionPanel().should('not.exist')
    cy.contains('h4', 'Automatic Extraction').should('not.exist')
    // INFO: the magnifier shares the right column; it must survive.
    PANELS.magnifier().should('exist')

    cy.get('[data-cy=toggle-extraction-panel]').click()
    PANELS.extractionPanel().should('exist')
  })

  it('hides the magnifier', () => {
    cy.get('[data-cy=toggle-magnifier]').click()
    cy.get('[data-cy=toggle-magnifier]').should(
      'contain.text',
      'magnifier: off',
    )
    PANELS.magnifier().should('not.exist')
    PANELS.extractionPanel().should('exist')

    cy.get('[data-cy=toggle-magnifier]').click()
    PANELS.magnifier().should('exist')
  })

  it('hides the data table', () => {
    cy.get('[data-cy=toggle-data-table]').click()
    cy.get('[data-cy=toggle-data-table]').should(
      'contain.text',
      'dataTable: off',
    )
    PANELS.dataTable().should('not.exist')
    PANELS.datasetPanel().should('exist')

    cy.get('[data-cy=toggle-data-table]').click()
    PANELS.dataTable().should('exist')
  })

  it('keeps digitizing usable with every optional panel hidden', () => {
    // INFO: calibrate while the axis panel is still there — the point is that
    // an already-set-up digitizer keeps working without any of the panels.
    calibrateAxes()
    cy.get('[data-cy=toggle-axis-panel]').click()
    cy.get('[data-cy=toggle-dataset-panel]').click()
    cy.get('[data-cy=toggle-extraction-panel]').click()
    cy.get('[data-cy=toggle-magnifier]').click()
    cy.get('[data-cy=toggle-data-table]').click()
    Object.values(PANELS).forEach((panel) => panel().should('not.exist'))

    cy.get('[data-cy=canvas-wrapper]').click(300, 250)
    cy.get('.canvas-point').should('have.length', 1)
    cy.get('[data-cy=error-codes]').should('have.text', '')
  })
})

describe('host app: layout slots', () => {
  beforeEach(() => {
    visitHostApp()
  })

  it('renders the aside-top and footer slots', () => {
    cy.get('[data-cy=slot-aside-top]').should('be.visible')
    cy.get('[data-cy=slot-footer]').should('be.visible')
  })

  it('hands aside-top the measured sidebar width', () => {
    cy.get('[data-cy=aside-top-width]')
      .invoke('text')
      .then((text) => {
        const width = Number(text)
        expect(width, 'aside-top width slot prop').to.be.greaterThan(100)
      })
    // INFO: and it really is the left column's width, not an arbitrary number.
    cy.get('.c__left-sidebar').then(($sidebar) => {
      cy.get('[data-cy=aside-top-width]')
        .invoke('text')
        .should('equal', String($sidebar[0].clientWidth))
    })
  })

  it('places aside-top above the first panel of the left column', () => {
    cy.get('[data-cy=slot-aside-top]').then(($slot) => {
      cy.contains('h4', 'XY Axes List').then(($panel) => {
        expect($slot[0].getBoundingClientRect().top).to.be.lessThan(
          $panel[0].getBoundingClientRect().top,
        )
      })
    })
  })
})

describe('host app: compact (fixed-height) embedding', () => {
  beforeEach(() => {
    visitHostApp()
    cy.get('[data-cy=toggle-compact]').click()
    cy.get('[data-cy=toggle-compact]').should('contain.text', 'compact: on')
  })

  it('fits the digitizer to the pane the host gave it', () => {
    cy.get('.host-pane').then(($pane) => {
      const paneHeight = $pane[0].getBoundingClientRect().height
      expect(paneHeight, 'host pane has a fixed height').to.be.greaterThan(200)
      cy.get('.starry-digitizer').then(($digitizer) => {
        expect(
          $digitizer[0].getBoundingClientRect().height,
          'digitizer fills its pane exactly',
        ).to.be.closeTo(paneHeight, 1)
      })
    })
  })

  it('narrows the sidebars and the magnifier with them', () => {
    // INFO: --sd-right-sidebar-width is 200px in compact mode and the
    // magnifier box follows the column instead of holding it open.
    cy.get('.c__right-sidebar').then(($sidebar) => {
      expect($sidebar[0].getBoundingClientRect().width).to.be.closeTo(200, 1)
    })
    cy.get('.c__magnifier__box').then(($box) => {
      expect($box[0].getBoundingClientRect().width).to.be.closeTo(200, 20)
    })
    cy.get('.c__left-sidebar').then(($sidebar) => {
      expect($sidebar[0].getBoundingClientRect().width).to.be.closeTo(210, 1)
    })
    // INFO: the slot prop reports the narrowed width, not the default one.
    cy.get('[data-cy=aside-top-width]')
      .invoke('text')
      .then((text) => expect(Number(text)).to.be.closeTo(210, 20))
  })

  it('does not make the page scroll', () => {
    cy.document().then((doc) => {
      const root = doc.documentElement
      expect(
        root.scrollHeight,
        'page height stays within the viewport',
      ).to.be.at.most(root.clientHeight + 1)
    })
  })

  it('is still fully usable inside the pane', () => {
    // INFO: the canvas is shorter in compact mode, so calibration clicks stay
    // well inside it.
    calibrateAxes([50, 200], [400, 50])
    cy.get('[data-cy=canvas-wrapper]').click(300, 150)
    cy.get('.canvas-point').should('have.length', 1)
    cy.get('[data-cy=slot-footer]').should('be.visible')
  })
})
