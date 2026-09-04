import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import { MANUAL_MODE, MASK_MODE } from '@/constants'

describe('CanvasHandler mode switching', () => {
  let canvasHandler: CanvasHandler

  beforeEach(() => {
    canvasHandler = new CanvasHandler()
  })

  describe('mutual exclusion', () => {
    it('turns the mask tool off when a manual mode is switched on', () => {
      canvasHandler.setMaskMode(MASK_MODE.PEN)
      canvasHandler.setManualMode(MANUAL_MODE.ADD)

      expect(canvasHandler.manualMode).toBe(MANUAL_MODE.ADD)
      expect(canvasHandler.maskMode).toBe(MASK_MODE.UNSET)
    })

    it('turns the manual mode off when a mask tool is switched on', () => {
      canvasHandler.setManualMode(MANUAL_MODE.ADD)
      canvasHandler.setMaskMode(MASK_MODE.PEN)

      expect(canvasHandler.maskMode).toBe(MASK_MODE.PEN)
      expect(canvasHandler.manualMode).toBe(MANUAL_MODE.UNSET)
    })
  })

  describe('exitMaskMode', () => {
    it('restores the manual mode that was on before the mask tool', () => {
      canvasHandler.setManualMode(MANUAL_MODE.ADD)
      canvasHandler.setMaskMode(MASK_MODE.PEN)

      canvasHandler.exitMaskMode()

      expect(canvasHandler.maskMode).toBe(MASK_MODE.UNSET)
      expect(canvasHandler.manualMode).toBe(MANUAL_MODE.ADD)
    })

    it('keeps the restore target while walking from one mask tool to another', () => {
      canvasHandler.setManualMode(MANUAL_MODE.ADD)
      canvasHandler.setMaskMode(MASK_MODE.PEN)
      canvasHandler.setMaskMode(MASK_MODE.BOX)
      canvasHandler.setMaskMode(MASK_MODE.ERASER)

      canvasHandler.exitMaskMode()

      expect(canvasHandler.maskMode).toBe(MASK_MODE.UNSET)
      expect(canvasHandler.manualMode).toBe(MANUAL_MODE.ADD)
    })

    it('restores nothing when no manual mode was on', () => {
      canvasHandler.setMaskMode(MASK_MODE.PEN)

      canvasHandler.exitMaskMode()

      expect(canvasHandler.maskMode).toBe(MASK_MODE.UNSET)
      expect(canvasHandler.manualMode).toBe(MANUAL_MODE.UNSET)
    })

    it('restores only once, so a second exit leaves the modes alone', () => {
      canvasHandler.setManualMode(MANUAL_MODE.ADD)
      canvasHandler.setMaskMode(MASK_MODE.PEN)
      canvasHandler.exitMaskMode()
      canvasHandler.setManualMode(MANUAL_MODE.UNSET)

      canvasHandler.exitMaskMode()

      expect(canvasHandler.manualMode).toBe(MANUAL_MODE.UNSET)
    })

    it('restores the mode set most recently, not a stale one', () => {
      canvasHandler.setManualMode(MANUAL_MODE.ADD)
      canvasHandler.setMaskMode(MASK_MODE.PEN)
      // INFO: e.g. the "E" keyboard shortcut pressed while the pen is on.
      canvasHandler.setManualMode(MANUAL_MODE.EDIT)
      canvasHandler.setMaskMode(MASK_MODE.PEN)

      canvasHandler.exitMaskMode()

      expect(canvasHandler.manualMode).toBe(MANUAL_MODE.EDIT)
    })
  })

  describe('setMaskMode(UNSET)', () => {
    it('does not restore the manual mode (internal clean-up, e.g. dataset switch)', () => {
      canvasHandler.setManualMode(MANUAL_MODE.ADD)
      canvasHandler.setMaskMode(MASK_MODE.PEN)

      canvasHandler.setMaskMode(MASK_MODE.UNSET)

      expect(canvasHandler.maskMode).toBe(MASK_MODE.UNSET)
      expect(canvasHandler.manualMode).toBe(MANUAL_MODE.UNSET)
    })

    it('drops the restore target, so a later exit cannot resurrect it', () => {
      canvasHandler.setManualMode(MANUAL_MODE.ADD)
      canvasHandler.setMaskMode(MASK_MODE.PEN)
      canvasHandler.setMaskMode(MASK_MODE.UNSET)

      canvasHandler.exitMaskMode()

      expect(canvasHandler.manualMode).toBe(MANUAL_MODE.UNSET)
    })

    it('keeps an already active manual mode untouched', () => {
      canvasHandler.setManualMode(MANUAL_MODE.DELETE)

      canvasHandler.setMaskMode(MASK_MODE.UNSET)

      expect(canvasHandler.manualMode).toBe(MANUAL_MODE.DELETE)
    })
  })
})
