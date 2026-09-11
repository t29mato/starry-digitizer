// INFO: the point-level use cases as a HOST calls them. The component-level
// counterpart (the real clicks) lives in
// presentation/components/undoGranularity.test.ts; this file pins what
// `starry-digitizer/core` promises on its own.
//
// The `addPoint` block exists because of one specific silent bug: plotting a
// point is three mutations, and the third — registering the point as an
// interpolation anchor — has no visible effect until much later, when
// `confirmInterpolation()` quietly returns false forever.
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import {
  addPoint,
  confirmInterpolation,
} from '@/application/utils/pointOperations'
import { HTMLCanvas } from '@/application/canvas/HTMLCanvas'

describe('addPoint', () => {
  let ctx: DigitizerContext

  beforeEach(() => {
    ctx = createDigitizerContext()
  })

  it('adds the point at the given image-pixel coordinate and returns its id', () => {
    const id = addPoint(ctx, { xPx: 12, yPx: 34 })

    const points = ctx.datasetRepository.activeDataset.points
    expect(points).toHaveLength(1)
    expect(points[0].id).toBe(id)
    expect(points[0].xPx).toBe(12)
    expect(points[0].yPx).toBe(34)
  })

  it('captures exactly once and undoes the point away', () => {
    const capture = jest.spyOn(ctx.historyManager, 'capture')

    addPoint(ctx, { xPx: 12, yPx: 34 })

    expect(capture).toHaveBeenCalledTimes(1)

    ctx.historyManager.undo()
    expect(ctx.datasetRepository.activeDataset.points).toHaveLength(0)
  })

  it('ends any axis-marker edit, so an arrow key afterwards nudges the point', () => {
    ctx.axisSetRepository.activeAxisSet.activateAxisByName('x1')

    addPoint(ctx, { xPx: 12, yPx: 34 })

    expect(ctx.axisSetRepository.activeAxisSet.activeAxisName).toBe('')
  })

  // INFO: this is the bug the operation exists to prevent. A host that wrote
  // `capture()` + `activeDataset.addPoint()` by hand got everything above
  // right and still left interpolation permanently unusable, with no error
  // raised anywhere — `confirmInterpolation()` only reports a `false`.
  it('registers the point as an interpolation anchor, so confirmInterpolation() works after two points', () => {
    addPoint(ctx, { xPx: 10, yPx: 10 })
    addPoint(ctx, { xPx: 90, yPx: 90 })

    expect(
      ctx.datasetRepository.activeDataset.manuallyAddedPointIds,
    ).toHaveLength(2)

    // INFO: the preview draws onto a guide canvas the presentation layer
    // normally owns; a headless host lends one the same way.
    ctx.interpolator.setGuideCanvas(
      new HTMLCanvas(document.createElement('canvas')),
    )
    ctx.interpolator.setIsActive(true)
    ctx.interpolator.updatePreview()

    expect(confirmInterpolation(ctx)).toBe(true)
    expect(ctx.datasetRepository.activeDataset.points.length).toBeGreaterThan(0)
  })

  it('leaves confirmInterpolation() refusing after a single point', () => {
    addPoint(ctx, { xPx: 10, yPx: 10 })

    expect(confirmInterpolation(ctx)).toBe(false)
  })
})
