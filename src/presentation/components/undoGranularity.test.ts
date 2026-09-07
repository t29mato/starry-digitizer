// INFO: "one thing the user did = one undo entry", checked through the real
// components rather than through the use cases alone. A host embedding the
// digitizer builds its own undo stack out of `historyManager.subscribe()`
// (see README "The single undo stack recipe"), so both halves matter: an
// operation that captures nothing is a change the host can never take back,
// and an operation that captures many times fills the host's stack with
// entries that do not match anything the user remembers doing.
//
// The four cases here are the ones that were wrong: automatic extraction,
// confirming an interpolation and deleting a point by click captured nothing
// at all, and an arrow key held down captured once per OS key-repeat event.
import { mount, VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

import ExtractorSettings from './Settings/ExtractorSettings.vue'
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
})
