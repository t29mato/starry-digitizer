// INFO: the six destructive actions the digitizer asks about, and the one
// thing every one of them owes the user: nothing happens on "no".
//
// They are tested together rather than per component because they share a
// single contract — `options.confirm`, the seam a host uses to replace the
// native dialog with its own (see digitizerOptions.ts). The point of these
// tests is that no call site quietly keeps calling `window.confirm`, and that
// none of them runs its operation anyway once the answer became a promise.
import { mount } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

import AxisSetManager from './AxisSetManager/AxisSetManager.vue'
import DatasetManager from './DatasetManager/DatasetManager.vue'
import ImageSettings from './Settings/ImageSettings.vue'
import {
  createDigitizerContext,
  type DigitizerContext,
} from '@/application/digitizerContext'
import { DIGITIZER_CONTEXT_KEY } from '@/presentation/digitizerContextProvider'
import {
  DIGITIZER_OPTIONS_KEY,
  createDigitizerOptions,
  type ConfirmDialog,
} from '@/presentation/digitizerOptions'

// INFO: `updateImage` decodes the file; the tests here only care about what
// happens before (and instead of) that, so the operation is stubbed out.
jest.mock('@/application/utils/digitizerOperations', () => ({
  ...jest.requireActual('@/application/utils/digitizerOperations'),
  replaceImage: jest.fn(() => Promise.resolve()),
}))

type AnyComponent = new () => ComponentPublicInstance

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mountPanel(component: any, ctx: DigitizerContext, confirm?: ConfirmDialog) {
  return mount<AnyComponent>(component, {
    global: {
      provide: {
        [DIGITIZER_CONTEXT_KEY as symbol]: ctx,
        [DIGITIZER_OPTIONS_KEY as symbol]: createDigitizerOptions({ confirm }),
      },
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vm = (wrapper: ReturnType<typeof mountPanel>) => wrapper.vm as any

/** A dataset the user would not want to lose: it has a point in it. */
function addDatasetWithPoint(ctx: DigitizerContext) {
  ctx.datasetRepository.createNewDataset()
  ctx.datasetRepository.lastDataset.addPoint(10, 20)
}

describe('confirmation dialogs go through options.confirm', () => {
  let confirmSpy: jest.SpyInstance

  beforeEach(() => {
    // INFO: jsdom's window.confirm throws "not implemented", so the default
    // path is only observable through a spy — which is also exactly how a
    // host's test double (and Cypress's `cy.on('window:confirm')`) replaces
    // it: by overwriting the property after this module was loaded. If
    // DEFAULT_CONFIRM captured the function instead of looking it up per
    // call, these tests would not see the spy.
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('DatasetManager: delete a dataset', () => {
    const setUp = (confirm?: ConfirmDialog) => {
      const ctx = createDigitizerContext()
      ctx.datasetRepository.activeDataset.addPoint(10, 20)
      addDatasetWithPoint(ctx)
      return { ctx, wrapper: mountPanel(DatasetManager, ctx, confirm) }
    }

    it('asks with window.confirm by default and deletes on yes', async () => {
      const { ctx, wrapper } = setUp()

      await vm(wrapper).handleOnClickRemoveDatasetButton(1)

      expect(confirmSpy).toHaveBeenCalledTimes(1)
      expect(confirmSpy.mock.calls[0][0]).toContain('Are you sure to delete')
      expect(ctx.datasetRepository.datasets.map((d) => d.id)).toEqual([2])
    })

    it("asks the host's dialog instead when it supplies one", async () => {
      const confirm = jest.fn(() => Promise.resolve(true))
      const { ctx, wrapper } = setUp(confirm)

      await vm(wrapper).handleOnClickRemoveDatasetButton(1)

      expect(confirmSpy).not.toHaveBeenCalled()
      expect(confirm).toHaveBeenCalledTimes(1)
      expect(ctx.datasetRepository.datasets.map((d) => d.id)).toEqual([2])
    })

    it('keeps the dataset when the answer is no', async () => {
      const confirm = jest.fn(() => Promise.resolve(false))
      const { ctx, wrapper } = setUp(confirm)

      await vm(wrapper).handleOnClickRemoveDatasetButton(1)

      expect(ctx.datasetRepository.datasets).toHaveLength(2)
    })

    it('never asks about an empty dataset', async () => {
      const ctx = createDigitizerContext()
      addDatasetWithPoint(ctx)
      const confirm = jest.fn(() => Promise.resolve(false))
      const wrapper = mountPanel(DatasetManager, ctx, confirm)

      await vm(wrapper).handleOnClickRemoveDatasetButton(1)

      expect(confirm).not.toHaveBeenCalled()
      expect(ctx.datasetRepository.datasets.map((d) => d.id)).toEqual([2])
    })

    it('does not delete a dataset that disappeared while the dialog was open', async () => {
      // INFO: the whole reason the call sites re-check after awaiting. With
      // window.confirm this race did not exist; with a host dialog the panel
      // stays live, and deleting "the active dataset" after the fact would
      // throw away a row the user was never asked about.
      const ctx = createDigitizerContext()
      ctx.datasetRepository.activeDataset.addPoint(10, 20)
      addDatasetWithPoint(ctx)

      const wrapper = mountPanel(DatasetManager, ctx, () =>
        Promise.resolve(true).then(() => {
          ctx.datasetRepository.removeDataset(1)
          return true
        }),
      )

      await vm(wrapper).handleOnClickRemoveDatasetButton(1)

      // The surviving dataset is untouched: nothing was deleted in its place.
      expect(ctx.datasetRepository.datasets.map((d) => d.id)).toEqual([2])
    })
  })

  describe('DatasetManager: delete every dataset', () => {
    const setUp = (confirm?: ConfirmDialog) => {
      const ctx = createDigitizerContext()
      ctx.datasetRepository.activeDataset.addPoint(10, 20)
      addDatasetWithPoint(ctx)
      return { ctx, wrapper: mountPanel(DatasetManager, ctx, confirm) }
    }

    it('asks with window.confirm by default and clears on yes', async () => {
      const { ctx, wrapper } = setUp()

      await vm(wrapper).handleOnClickRemoveAllDatasetsButton()

      expect(confirmSpy).toHaveBeenCalledTimes(1)
      expect(confirmSpy.mock.calls[0][0]).toContain('Are you sure to delete all')
      // INFO: the repository always keeps one empty dataset to draw into.
      expect(ctx.datasetRepository.datasets).toHaveLength(1)
      expect(ctx.datasetRepository.datasets[0].points).toHaveLength(0)
    })

    it('keeps every dataset when the answer is no', async () => {
      const confirm = jest.fn(() => Promise.resolve(false))
      const { ctx, wrapper } = setUp(confirm)

      await vm(wrapper).handleOnClickRemoveAllDatasetsButton()

      expect(confirm).toHaveBeenCalledTimes(1)
      expect(confirmSpy).not.toHaveBeenCalled()
      expect(ctx.datasetRepository.datasets).toHaveLength(2)
      expect(ctx.datasetRepository.datasets[0].points).toHaveLength(1)
    })
  })

  describe('DatasetManager: discard unconfirmed interpolated points', () => {
    const setUp = (confirm?: ConfirmDialog) => {
      const ctx = createDigitizerContext()
      ctx.datasetRepository.createNewDataset()
      // INFO: temp points are what the question is about — without them none
      // of these three actions asks anything at all.
      ctx.datasetRepository.datasets[0].addTempPoint(10, 20)
      return { ctx, wrapper: mountPanel(DatasetManager, ctx, confirm) }
    }

    it('switches datasets by default confirmation', async () => {
      const { ctx, wrapper } = setUp()

      await vm(wrapper).handleOnClickDataset(2)

      expect(confirmSpy).toHaveBeenCalledTimes(1)
      expect(confirmSpy.mock.calls[0][0]).toContain(
        'There are unconfirmed interpolated points',
      )
      expect(ctx.datasetRepository.activeDatasetId).toBe(2)
    })

    it('stays on the current dataset when the answer is no', async () => {
      const confirm = jest.fn(() => Promise.resolve(false))
      const { ctx, wrapper } = setUp(confirm)

      await vm(wrapper).handleOnClickDataset(2)

      expect(confirm).toHaveBeenCalledTimes(1)
      expect(ctx.datasetRepository.activeDatasetId).toBe(1)
    })

    it('does not enter View All when the answer is no', async () => {
      const confirm = jest.fn(() => Promise.resolve(false))
      const { ctx, wrapper } = setUp(confirm)

      await vm(wrapper).handleOnClickViewAll()

      expect(confirm).toHaveBeenCalledTimes(1)
      expect(ctx.datasetRepository.showAllDatasets).toBe(false)
    })

    it('does not add a dataset when the answer is no', async () => {
      const confirm = jest.fn(() => Promise.resolve(false))
      const { ctx, wrapper } = setUp(confirm)

      await vm(wrapper).handleOnClickAddDatasetButton()

      expect(confirm).toHaveBeenCalledTimes(1)
      expect(ctx.datasetRepository.datasets).toHaveLength(2)
    })

    it('asks nothing when there is nothing unconfirmed to lose', async () => {
      const ctx = createDigitizerContext()
      ctx.datasetRepository.createNewDataset()
      const confirm = jest.fn(() => Promise.resolve(false))
      const wrapper = mountPanel(DatasetManager, ctx, confirm)

      await vm(wrapper).handleOnClickDataset(2)

      expect(confirm).not.toHaveBeenCalled()
      expect(confirmSpy).not.toHaveBeenCalled()
      expect(ctx.datasetRepository.activeDatasetId).toBe(2)
    })
  })

  describe('AxisSetManager: remove an axis set', () => {
    const setUp = (confirm?: ConfirmDialog) => {
      const ctx = createDigitizerContext()
      ctx.axisSetRepository.createNewAxisSet()
      ctx.axisSetRepository.setActiveAxisSet(1)
      // INFO: only a calibrated axis set is worth asking about.
      ctx.axisSetRepository.activeAxisSet.addAxisCoord({ xPx: 1, yPx: 2 })
      return { ctx, wrapper: mountPanel(AxisSetManager, ctx, confirm) }
    }

    it('asks with window.confirm by default and removes on yes', async () => {
      const { ctx, wrapper } = setUp()

      await vm(wrapper).handleOnClickRemoveAxisSetButton()

      expect(confirmSpy).toHaveBeenCalledTimes(1)
      expect(confirmSpy.mock.calls[0][0]).toContain('Are you sure to remove')
      expect(ctx.axisSetRepository.axisSets.map((a) => a.id)).toEqual([2])
    })

    it('keeps the axis set when the answer is no', async () => {
      const confirm = jest.fn(() => Promise.resolve(false))
      const { ctx, wrapper } = setUp(confirm)

      await vm(wrapper).handleOnClickRemoveAxisSetButton()

      expect(confirm).toHaveBeenCalledTimes(1)
      expect(confirmSpy).not.toHaveBeenCalled()
      expect(ctx.axisSetRepository.axisSets).toHaveLength(2)
    })

    it('gives up when the active axis set changed while the dialog was open', async () => {
      const ctx = createDigitizerContext()
      ctx.axisSetRepository.createNewAxisSet()
      ctx.axisSetRepository.setActiveAxisSet(1)
      ctx.axisSetRepository.activeAxisSet.addAxisCoord({ xPx: 1, yPx: 2 })

      const wrapper = mountPanel(AxisSetManager, ctx, () =>
        Promise.resolve(true).then(() => {
          ctx.axisSetRepository.setActiveAxisSet(2)
          return true
        }),
      )

      await vm(wrapper).handleOnClickRemoveAxisSetButton()

      // Neither the axis set the user was asked about nor the one that became
      // active in the meantime is removed.
      expect(ctx.axisSetRepository.axisSets).toHaveLength(2)
    })

    it('moves the datasets of the removed axis set to the surviving one', async () => {
      const { ctx, wrapper } = setUp(() => Promise.resolve(true))
      ctx.datasetRepository.activeDataset.setAxisSetId(1)

      await vm(wrapper).handleOnClickRemoveAxisSetButton()

      expect(ctx.axisSetRepository.axisSets.map((a) => a.id)).toEqual([2])
      expect(ctx.datasetRepository.datasets[0].axisSetId).toBe(2)
    })
  })

  describe('ImageSettings: replace the image', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { replaceImage } = jest.requireMock(
      '@/application/utils/digitizerOperations',
    )
    const file = new File(['x'], 'plot.png', { type: 'image/png' })

    const setUp = (confirm?: ConfirmDialog) => {
      const ctx = createDigitizerContext()
      // INFO: nothing is asked unless there is work to lose.
      ctx.datasetRepository.activeDataset.addPoint(10, 20)
      return { ctx, wrapper: mountPanel(ImageSettings, ctx, confirm) }
    }

    beforeEach(() => {
      replaceImage.mockClear()
    })

    it('asks with window.confirm by default and replaces on yes', async () => {
      const { wrapper } = setUp()

      await vm(wrapper).updateImage(file)

      expect(confirmSpy).toHaveBeenCalledTimes(1)
      expect(confirmSpy.mock.calls[0][0]).toContain(
        'Loading a new image will reset all axis coordinates and datasets',
      )
      expect(replaceImage).toHaveBeenCalledTimes(1)
    })

    it('keeps the image and the work when the answer is no', async () => {
      const confirm = jest.fn(() => Promise.resolve(false))
      const { wrapper } = setUp(confirm)

      await vm(wrapper).updateImage(file)

      expect(confirm).toHaveBeenCalledTimes(1)
      expect(confirmSpy).not.toHaveBeenCalled()
      expect(replaceImage).not.toHaveBeenCalled()
    })
  })
})
