// INFO: "one thing the user did = one undo entry", checked through the real
// components rather than through the use cases alone. A host embedding the
// digitizer builds its own undo stack out of `historyManager.subscribe()`
// (see README "The single undo stack recipe"), so both halves matter: an
// operation that captures nothing is a change the host can never take back,
// and an operation that captures many times fills the host's stack with
// entries that do not match anything the user remembers doing.
//
// The first four cases here are the ones found in the earlier round:
// automatic extraction, confirming an interpolation and deleting a point by
// click captured nothing at all, and an arrow key held down captured once per
// OS key-repeat event.
//
// The rest came out of the exhaustive audit that followed (every state-changing
// method on the repositories/models cross-referenced against its call sites —
// see README "Undo granularity"). They are all the same shape: a destructive
// change to project data made from a panel that never captured, so ⌘Z undid
// something ELSE and said nothing about it.
import { mount, VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

import ExtractorSettings from './Settings/ExtractorSettings.vue'
import AxisSetSettings from './Settings/AxisSetSettings.vue'
import AxisSetManager from './AxisSetManager/AxisSetManager.vue'
import CanvasPoint from './Canvas/CanvasPoint.vue'
import CanvasMain from './Canvas/CanvasMain.vue'
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import { HTMLCanvas } from '@/application/canvas/HTMLCanvas'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import {
  DIGITIZER_OPTIONS_KEY,
  createDigitizerOptions,
} from '@/presentation/digitizerOptions'
import { MANUAL_MODE } from '@/constants'
import type { Point } from '@/@types/types'

type AnyComponent = new () => ComponentPublicInstance

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mountWithContext(component: any, ctx: DigitizerContext, props = {}) {
  return mount<AnyComponent>(component, {
    props,
    global: {
      provide: {
        [DIGITIZER_CONTEXT_KEY as symbol]: ctx,
        [DIGITIZER_OPTIONS_KEY as symbol]: createDigitizerOptions(),
      },
    },
  })
}

/** The points of the active dataset, as plain data for comparison. */
function pointsOf(ctx: DigitizerContext): Point[] {
  return ctx.datasetRepository.activeDataset.points.map((point) => ({
    ...point,
  }))
}

/**
 * The interpolator's canvas port wants a real element. Nothing here asserts on
 * what is drawn — the mock 2D context from jest.setup.js is enough — but
 * `clearPreview()` throws without one.
 */
function attachGuideCanvas(ctx: DigitizerContext): void {
  ctx.interpolator.setGuideCanvas(
    new HTMLCanvas(document.createElement('canvas')),
  )
}

describe('one operation is one undo entry', () => {
  let wrapper: VueWrapper | undefined

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    jest.restoreAllMocks()
  })

  describe('automatic extraction (Run)', () => {
    /**
     * The extraction algorithm itself is not under test — it needs a decoded
     * image — so the strategy's output is stubbed. What is under test is that
     * "replace every point in the dataset" leaves a way back.
     */
    function setup(): { ctx: DigitizerContext; wrapper: VueWrapper } {
      const ctx = createDigitizerContext()
      attachGuideCanvas(ctx)
      jest
        .spyOn(ctx.extractor, 'execute')
        .mockReturnValue([{ xPx: 30, yPx: 40 }, { xPx: 10, yPx: 20 }])
      return { ctx, wrapper: mountWithContext(ExtractorSettings, ctx) }
    }

    function clickRun(w: VueWrapper): Promise<void> {
      const run = w
        .findAll('button')
        .find((button) => button.text().startsWith('Run'))
      if (!run) throw new Error('the Run button is not rendered')
      return run.trigger('click')
    }

    it('restores the points it replaced when undone', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      // INFO: the work the user would lose. Extraction does not add to it, it
      // throws it away and refills the dataset from the algorithm.
      ctx.datasetRepository.activeDataset.addPoint(111, 222)
      const before = pointsOf(ctx)

      await clickRun(w)
      expect(pointsOf(ctx)).toHaveLength(2)

      ctx.historyManager.undo()

      expect(pointsOf(ctx)).toStrictEqual(before)
    })

    it('captures exactly once', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      ctx.datasetRepository.activeDataset.addPoint(111, 222)
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      await clickRun(w)

      expect(capture).toHaveBeenCalledTimes(1)
    })

    it('leaves no entry behind when the extraction fails', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      jest.spyOn(console, 'error').mockImplementation(() => undefined)
      jest.spyOn(ctx.extractor, 'execute').mockImplementation(() => {
        throw new Error('no image loaded')
      })

      await clickRun(w)

      // INFO: nothing changed, so an entry here would make the next Cmd+Z a
      // no-op for the user and swallow the host's own undo turn.
      expect(ctx.historyManager.canUndo).toBe(false)
    })
  })

  describe('confirming an interpolation', () => {
    /**
     * Two anchor points and the preview they produced. Confirm turns the
     * preview into real points and consumes the anchors, which is the part
     * that used to be unrecoverable.
     */
    function setup(): { ctx: DigitizerContext; wrapper: VueWrapper } {
      const ctx = createDigitizerContext()
      attachGuideCanvas(ctx)
      const dataset = ctx.datasetRepository.activeDataset
      dataset.addPoint(10, 10)
      dataset.addManuallyAddedPointId(dataset.lastPointId)
      dataset.addPoint(50, 50)
      dataset.addManuallyAddedPointId(dataset.lastPointId)
      ctx.interpolator.setIsActive(true)
      ctx.interpolator.updatePreview()
      return { ctx, wrapper: mountWithContext(ExtractorSettings, ctx) }
    }

    function clickConfirm(w: VueWrapper): Promise<void> {
      return w.get('#confirm-interpolation').trigger('click')
    }

    it('restores the anchor points it consumed when undone', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      const anchorsBefore = [
        ...ctx.datasetRepository.activeDataset.manuallyAddedPointIds,
      ]
      const before = pointsOf(ctx)
      expect(anchorsBefore).toHaveLength(2)

      await clickConfirm(w)
      // INFO: the interpolated points became real ones and the anchors are
      // gone — that is what Confirm is for.
      expect(
        ctx.datasetRepository.activeDataset.manuallyAddedPointIds,
      ).toHaveLength(0)

      ctx.historyManager.undo()

      expect(pointsOf(ctx)).toStrictEqual(before)
      expect(
        ctx.datasetRepository.activeDataset.manuallyAddedPointIds,
      ).toStrictEqual(anchorsBefore)
    })

    it('captures exactly once', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      await clickConfirm(w)

      expect(capture).toHaveBeenCalledTimes(1)
    })

    it('captures nothing when there is nothing to confirm', async () => {
      const ctx = createDigitizerContext()
      attachGuideCanvas(ctx)
      wrapper = mountWithContext(ExtractorSettings, ctx)
      ctx.interpolator.setIsActive(true)
      await wrapper.vm.$nextTick()
      jest.spyOn(window, 'alert').mockImplementation(() => undefined)

      await clickConfirm(wrapper)

      expect(ctx.historyManager.canUndo).toBe(false)
    })
  })

  describe('deleting a point by clicking it in DELETE mode', () => {
    function setup(): { ctx: DigitizerContext; wrapper: VueWrapper } {
      const ctx = createDigitizerContext()
      ctx.datasetRepository.activeDataset.addPoint(10, 20)
      ctx.canvasHandler.setManualMode(MANUAL_MODE.DELETE)
      const point = ctx.datasetRepository.activeDataset.points[0]
      return {
        ctx,
        wrapper: mountWithContext(CanvasPoint, ctx, {
          point,
          isVisible: true,
        }),
      }
    }

    it('restores the point when undone', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      const before = pointsOf(ctx)

      await w.trigger('click')
      expect(pointsOf(ctx)).toHaveLength(0)

      ctx.historyManager.undo()

      expect(pointsOf(ctx)).toStrictEqual(before)
    })

    it('captures exactly once — the same as the Backspace path', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      await w.trigger('click')

      expect(capture).toHaveBeenCalledTimes(1)
    })
  })

  describe('holding an arrow key down', () => {
    /**
     * A point is selected, so every arrow keydown below really does move
     * something (the capture is skipped when nothing would move).
     */
    function setup(): { ctx: DigitizerContext; wrapper: VueWrapper } {
      const ctx = createDigitizerContext()
      const w = mountWithContext(CanvasMain, ctx)
      ctx.datasetRepository.activeDataset.addPoint(10, 20)
      return { ctx, wrapper: w }
    }

    /**
     * INFO: `repeat` has to be set by hand. No browser automation tool
     * (Puppeteer, Playwright, Cypress) reproduces OS key repeat by holding a
     * key down — it sends one keydown — so a test that "holds" a key would
     * pass with the suppression deleted.
     */
    function pressArrow(w: VueWrapper, repeat: boolean, times: number): void {
      const frame = w.get('[data-cy=canvas-wrapper]').element
      for (let i = 0; i < times; i++) {
        frame.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowRight',
            repeat,
            bubbles: true,
          }),
        )
      }
    }

    it('captures once for a burst of key-repeat events', () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      // INFO: the first keydown of a hold is a real press; the rest carry
      // repeat === true.
      pressArrow(w, false, 1)
      pressArrow(w, true, 5)

      expect(capture).toHaveBeenCalledTimes(1)
      // ... and every one of the six events moved the point.
      expect(ctx.datasetRepository.activeDataset.points[0].xPx).toBe(16)
    })

    it('captures once per press when the key is tapped', () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      // INFO: the counterpart to the test above, and the one that pins the
      // rule to `repeat` rather than to "ignore everything after the first".
      // Five taps are five separate things the user did.
      pressArrow(w, false, 5)

      expect(capture).toHaveBeenCalledTimes(5)
    })

    it('undoes the whole burst in one go', () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      const before = pointsOf(ctx)

      pressArrow(w, false, 1)
      pressArrow(w, true, 9)
      expect(ctx.datasetRepository.activeDataset.points[0].xPx).toBe(20)

      ctx.historyManager.undo()

      expect(pointsOf(ctx)).toStrictEqual(before)
    })

    it('coalesces an axis nudge the same way', () => {
      const ctx = createDigitizerContext()
      const w = mountWithContext(CanvasMain, ctx)
      wrapper = w
      // INFO: axis markers are moved with the very same keys, and a held key
      // is one adjustment there too.
      ctx.axisSetRepository.activeAxisSet.addAxisCoord({ xPx: 10, yPx: 20 })
      ctx.axisSetRepository.activeAxisSet.activateAxisByName('x1')
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      pressArrow(w, false, 1)
      pressArrow(w, true, 3)

      expect(capture).toHaveBeenCalledTimes(1)
      expect(ctx.axisSetRepository.activeAxisSet.x1.coord.xPx).toBe(14)
    })
  })

  // INFO: the switch does not just stop drawing the preview — it DELETES every
  // anchor point and adds a copy of it back under a new id at the end of
  // `points`. The embedding host reported this one by name: flip the switch,
  // press ⌘Z, and the point you plotted a minute ago disappears instead.
  describe('turning interpolation off', () => {
    function setup(): { ctx: DigitizerContext; wrapper: VueWrapper } {
      const ctx = createDigitizerContext()
      attachGuideCanvas(ctx)
      const dataset = ctx.datasetRepository.activeDataset
      dataset.addPoint(10, 10)
      dataset.addManuallyAddedPointId(dataset.lastPointId)
      dataset.addPoint(50, 50)
      dataset.addManuallyAddedPointId(dataset.lastPointId)
      ctx.interpolator.setIsActive(true)
      ctx.interpolator.updatePreview()
      return { ctx, wrapper: mountWithContext(ExtractorSettings, ctx) }
    }

    function flipSwitch(w: VueWrapper, on: boolean): Promise<void> {
      return w.get('#switch-interpolation').setValue(on)
    }

    it('restores the anchor points it re-created when undone', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      const before = pointsOf(ctx)
      const anchorsBefore = [
        ...ctx.datasetRepository.activeDataset.manuallyAddedPointIds,
      ]

      await flipSwitch(w, false)
      // INFO: same coordinates, different ids — that is precisely why the
      // exported rows change and why this has to be undoable.
      expect(pointsOf(ctx)).not.toStrictEqual(before)

      ctx.historyManager.undo()

      expect(pointsOf(ctx)).toStrictEqual(before)
      expect(
        ctx.datasetRepository.activeDataset.manuallyAddedPointIds,
      ).toStrictEqual(anchorsBefore)
    })

    it('captures exactly once', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      await flipSwitch(w, false)

      expect(capture).toHaveBeenCalledTimes(1)
    })

    it('captures nothing when it is turned back on', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      await flipSwitch(w, false)
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      // INFO: turning it ON writes tempPoints only, which no snapshot holds.
      // An entry here would cost the user a ⌘Z press that does nothing.
      await flipSwitch(w, true)

      expect(capture).not.toHaveBeenCalled()
    })
  })

  describe('clearing the calibration ("Clear XY Axes")', () => {
    function setup(): { ctx: DigitizerContext; wrapper: VueWrapper } {
      const ctx = createDigitizerContext()
      ctx.axisSetRepository.activeAxisSet.addAxisCoord({ xPx: 10, yPx: 90 })
      ctx.axisSetRepository.activeAxisSet.addAxisCoord({ xPx: 90, yPx: 10 })
      return { ctx, wrapper: mountWithContext(AxisSetSettings, ctx) }
    }

    function clickClear(w: VueWrapper): Promise<void> {
      const button = w
        .findAll('button')
        .find((b) => b.text() === 'Clear XY Axes')
      if (!button) throw new Error('the Clear XY Axes button is not rendered')
      return button.trigger('click')
    }

    it('restores the axis coordinates when undone', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      const before = { ...ctx.axisSetRepository.activeAxisSet.x1.coord }

      await clickClear(w)
      expect(ctx.axisSetRepository.activeAxisSet.hasAtLeastOneAxis).toBe(false)

      ctx.historyManager.undo()

      expect(ctx.axisSetRepository.activeAxisSet.x1.coord).toStrictEqual(before)
    })

    it('captures exactly once', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      await clickClear(w)

      expect(capture).toHaveBeenCalledTimes(1)
    })
  })

  // INFO: flipping an axis to log scale changes EVERY value the dataset
  // exports. It looks like a view setting and is not one.
  describe('switching an axis to log scale', () => {
    it('flips back when undone, in one entry', async () => {
      const ctx = createDigitizerContext()
      const w = mountWithContext(AxisSetSettings, ctx)
      wrapper = w
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      await w.get('#x-is-log').setValue(true)
      expect(ctx.axisSetRepository.activeAxisSet.xIsLogScale).toBe(true)
      expect(capture).toHaveBeenCalledTimes(1)

      ctx.historyManager.undo()

      expect(ctx.axisSetRepository.activeAxisSet.xIsLogScale).toBe(false)
    })
  })

  describe('the axis-set list', () => {
    function setup(): { ctx: DigitizerContext; wrapper: VueWrapper } {
      const ctx = createDigitizerContext()
      return { ctx, wrapper: mountWithContext(AxisSetManager, ctx) }
    }

    it('undoes adding an axis set', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      await w.get('[data-cy=add-axis-set]').trigger('click')
      expect(ctx.axisSetRepository.axisSets).toHaveLength(2)
      expect(capture).toHaveBeenCalledTimes(1)

      ctx.historyManager.undo()

      expect(ctx.axisSetRepository.axisSets).toHaveLength(1)
    })

    it('undoes removing an axis set, calibration and all', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      await w.get('[data-cy=add-axis-set]').trigger('click')
      // INFO: an uncalibrated, unrenamed axis set is removed without a
      // confirmation dialog (atLeastOneCoordOrValueIsChanged is false), which
      // keeps this test about the history rather than about the dialog.
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      await w.get('[data-cy=remove-axis-set]').trigger('click')
      expect(ctx.axisSetRepository.axisSets).toHaveLength(1)
      expect(capture).toHaveBeenCalledTimes(1)

      ctx.historyManager.undo()

      expect(ctx.axisSetRepository.axisSets).toHaveLength(2)
      expect(ctx.datasetRepository.activeDataset.axisSetId).toBe(2)
    })

    it('undoes re-binding the active dataset by clicking another row', async () => {
      const { ctx, wrapper: w } = setup()
      wrapper = w
      await w.get('[data-cy=add-axis-set]').trigger('click')
      expect(ctx.datasetRepository.activeDataset.axisSetId).toBe(2)
      const capture = jest.spyOn(ctx.historyManager, 'capture')

      // INFO: clicking a row is not a selection here — it moves the active
      // dataset onto that axis set, so every value it exports is now
      // calibrated against different axes.
      await w.findAll('.c__axisSet-item')[0].trigger('click')
      expect(ctx.datasetRepository.activeDataset.axisSetId).toBe(1)
      expect(capture).toHaveBeenCalledTimes(1)

      ctx.historyManager.undo()

      expect(ctx.datasetRepository.activeDataset.axisSetId).toBe(2)
    })
  })
})
