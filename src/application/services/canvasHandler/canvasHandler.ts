//TODO: Separate into multiple apps based on feature (so far, multiple features related to canvas are gethered at this class but it is not ideal)
import {
  AttachedCanvasElements,
  CanvasHandlerInterface,
} from './canvasHandlerInterface'
import { extractColorSwatches } from '@/application/utils/colorPaletteUtils'

import { HTMLCanvas } from '@/application/canvas/HTMLCanvas'
import { MANUAL_MODE, MASK_MODE } from '@/constants'
import { Coord, ManualMode, MaskMode } from '@/@types/types'
import { PixelSource } from '@/application/ports/pixelSource'

// INFO: the smallest zoom scaleDown() will go to. Below it the image is too
// small to place a point on, and a scale of 0 or less would make every overlay
// coordinate meaningless.
const MIN_SCALE = 0.1

// INFO: every slot a component can lend an element to, in one place so that
// attach, detach and the full teardown cannot drift apart — a key missing
// from a hand-written list is an element that never gets given back.
const ATTACHABLE_KEYS = [
  'wrapper',
  'imageCanvas',
  'maskCanvas',
  'tempMaskCanvas',
  'magnifierMaskCanvas',
] as const satisfies readonly (keyof AttachedCanvasElements)[]

// INFO: callers outside this class must change mode / cursor state through the
// setters (setManualMode, setMaskMode, setIsCursorOnCanvas) instead of assigning
// the fields directly. The setters keep the mutually exclusive modes consistent
// and are the single hook point where change notification will be emitted once
// the engine stops relying on Vue's reactive() wrapper — see
// docs/design/engine-boundary.md §1.4.
export class CanvasHandler implements CanvasHandlerInterface, PixelSource {
  isDrawnMask = false
  imageElement: HTMLImageElement
  // INFO: how large the image is drawn relative to its intrinsic size — the
  // single number every overlay (CanvasPoints, CanvasAxisSet, CanvasCursor,
  // Interpolator) multiplies its image-pixel coordinates by.
  //
  // NEVER assign it from outside without resizing the canvases in the same
  // breath. It is only ever valid together with the canvas element sizes that
  // resize() writes; a bare assignment leaves the image at one factor and
  // everything drawn on top of it at another. Two bugs have already been
  // caused by exactly that (drawFitSizeImage adopting a scale whose resize()
  // had bailed out, and restoreProject assigning the saved DTO value). Change
  // it through drawFitSizeImage / drawOriginalSizeImage / scaleUp / scaleDown,
  // which all adopt the new factor only after resize() reports success.
  scale = 1
  cursor: Coord = { xPx: 0, yPx: 0 }
  isCursorOnCanvas = false
  rectangle = {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  }
  maskMode: MaskMode = MASK_MODE.UNSET
  manualMode: ManualMode = MANUAL_MODE.UNSET
  // INFO: the manual mode that was on when the current mask tool was switched
  // on, so exitMaskMode() can put it back. UNSET means "nothing to restore".
  private manualModeBeforeMask: ManualMode = MANUAL_MODE.UNSET
  penToolSizePx = 50
  eraserSizePx = 30
  uploadImageUrl = ''
  // INFO: a fit-to-frame that has been asked for but could not be applied yet
  // (the frame had no layout / the canvases were not all attached). Exposed
  // read-only through `hasPendingFitSize` so the presentation layer can retry
  // it, and only then — a manual zoom must never be overridden.
  private isFitSizePending = false

  // INFO: The presentation layer owns the actual elements and hands them over
  // in mounted() / takes them back in beforeUnmount(). Looking them up by id
  // would break as soon as two <StarryDigitizer> instances share a page.
  private attachedWrapper?: HTMLDivElement
  private attachedImageCanvas?: HTMLCanvas
  private attachedMaskCanvas?: HTMLCanvas
  private attachedTempMaskCanvas?: HTMLCanvas
  private attachedMagnifierMaskCanvas?: HTMLCanvas

  // INFO: the retry half of `isFitSizePending`, and it lives HERE rather than
  // in the component that used to own it. `attachCanvases()` must precede
  // `applyImage()` and the wrapper must already have layout when the image
  // arrives — and neither rule fails loudly: drawFitSizeImage() bails out,
  // the host still gets a resolved promise and the right originalWidth /
  // originalHeight, and the canvas stays blank. A core-only host had no way
  // to know it owed an observer, so the engine keeps its own. It costs no new
  // capability: this class already uses `document`, `Image` and 2D contexts
  // (docs/design/engine-boundary.md §2 — browser, not Node).
  private wrapperResizeObserver?: ResizeObserver
  private observedWrapper?: HTMLDivElement

  // INFO: whether the CURRENT scale came from a fit rather than from a zoom
  // the user picked. `isFitSizePending` only covers "a fit was asked for and
  // could not be applied yet"; this covers "a fit was applied and is still
  // what the view means", which is what makes a LATER frame change re-fit.
  // Without it, a frame that shrinks after a successful fit (a split view
  // opening, the window narrowing) leaves the figure drawn at the old scale
  // and silently clipped — no exception, no warning.
  private isFitSizeMode = false

  // INFO: the raw elements behind the wrapped canvases above, kept so that
  // attach and detach can tell WHICH element is in a slot. Without it,
  // detachCanvases() could only go by key name and one component's unmount
  // detached another's canvases — see detachCanvases().
  //
  // INFO: HTMLElement rather than the per-key element type, because these are
  // only ever compared by identity — narrowing each slot to its own type buys
  // nothing here and makes writing one through a `keyof` loop impossible.
  private attachedElements: Partial<
    Record<keyof AttachedCanvasElements, HTMLElement>
  > = {}

  // INFO: the mask as it was when the mask canvas was last given back, so a
  // component that remounts (a host toggling its canvas column with `v-if`)
  // gets the user's mask back instead of a blank one. See takeMaskSnapshot().
  private detachedMaskSnapshot?: HTMLCanvasElement

  constructor() {
    this.imageElement = new Image()
  }

  // INFO: partial on purpose — CanvasMain.vue owns the wrapper and the three
  // main canvases, MagnifierImage.vue owns the magnifier mask canvas, and the
  // two components mount independently.
  attachCanvases(elements: AttachedCanvasElements): void {
    ATTACHABLE_KEYS.forEach((key) => {
      const element = elements[key]
      if (element === undefined) return
      this.warnIfReplacingAttached(key, element)
      this.attachedElements[key] = element
    })

    if (elements.wrapper !== undefined) {
      this.attachedWrapper = elements.wrapper
      this.observeWrapper(elements.wrapper)
    }
    if (elements.imageCanvas !== undefined) {
      this.attachedImageCanvas = new HTMLCanvas(elements.imageCanvas)
    }
    if (elements.maskCanvas !== undefined) {
      this.attachedMaskCanvas = new HTMLCanvas(elements.maskCanvas)
    }
    if (elements.tempMaskCanvas !== undefined) {
      this.attachedTempMaskCanvas = new HTMLCanvas(elements.tempMaskCanvas)
    }
    if (elements.magnifierMaskCanvas !== undefined) {
      this.attachedMagnifierMaskCanvas = new HTMLCanvas(
        elements.magnifierMaskCanvas,
      )
    }

    this.redrawAtCurrentScale()
  }

  /**
   * Put the image (and the mask) back onto the canvases at the scale that is
   * already in effect. Called at the end of every attachCanvases().
   *
   * INFO: this is what makes REMOUNTING work, and it exists because the fit
   * retry was not enough. A host that hides its canvas column with `v-if`
   * destroys the elements and hands over fresh, empty ones when it comes
   * back — and the only redraw path used to be the wrapper observer's
   * "re-fit while a fit is owed or the view is in fit mode". Pick a zoom by
   * hand first and both flags are false, so nobody drew anything: the
   * digitizer came back as a white canvas, with no exception and no warning.
   * Measured by a host doing exactly that (friction report S3-4 follow-up:
   * three round trips at the fit scale pass, one at 1:1 does not).
   *
   * drawFitSizeImage() cannot be used here — it would silently replace the
   * zoom the user chose, which is the thing the fit-mode flag exists to
   * protect. resize() at the current scale redraws without touching it.
   */
  private redrawAtCurrentScale(): void {
    if (!this.hasCanvases || !this.hasImage) return

    // INFO: resize() carries the mask over from the ATTACHED mask canvas,
    // which on a remount is a brand-new empty element — the old pixels went
    // with the old one. So the snapshot taken at detach time is restored
    // first, and resize() then scales it like any other existing mask.
    this.restoreDetachedMask()

    this.resize(
      this.originalWidth * this.scale,
      this.originalHeight * this.scale,
    )
  }

  // INFO: the mask lives only in the canvas element's pixels, so a component
  // that unmounts takes it with it unless it is copied out first. Kept as a
  // detached <canvas> rather than ImageData because it is only ever drawn
  // back, and drawImage() rescales for free.
  private takeMaskSnapshot(): void {
    const mask = this.attachedMaskCanvas
    if (!mask || !this.isDrawnMask) return
    if (mask.element.width <= 0 || mask.element.height <= 0) return

    const snapshot = document.createElement('canvas')
    snapshot.width = mask.element.width
    snapshot.height = mask.element.height
    const context = snapshot.getContext('2d')
    if (!context) return

    context.drawImage(mask.element, 0, 0)
    this.detachedMaskSnapshot = snapshot
  }

  private restoreDetachedMask(): void {
    const snapshot = this.detachedMaskSnapshot
    if (!snapshot) return
    // INFO: one-shot. Cleared even if the draw below is a no-op, so a stale
    // mask cannot reappear on a later, unrelated attach.
    this.detachedMaskSnapshot = undefined

    const mask = this.attachedMaskCanvas
    if (!mask) return

    mask.element.width = snapshot.width
    mask.element.height = snapshot.height
    mask.context.drawImage(snapshot, 0, 0)
  }

  /**
   * Give the elements back.
   *
   * PASS THE ELEMENTS, not the keys, from a component that is unmounting:
   * `detachCanvases({ wrapper, imageCanvas, ... })` gives back only the
   * elements that are still the attached ones, so a second CanvasMain that
   * has since taken the slot keeps it. The key form detaches unconditionally
   * and is for a full teardown; omitting the argument drops everything.
   *
   * INFO: this is the "one CanvasMain per context" rule made safe rather than
   * merely documented. Two of them is still not a supported arrangement — the
   * second one's attach wins and the first stops drawing, which is why
   * attachCanvases() warns about it — but the failure used to outlive the
   * mistake: the second component's `beforeUnmount` detached by key and took
   * the FIRST one's canvases with it, leaving a mounted, visible digitizer
   * attached to nothing and drawing nowhere. A host that hides its canvas
   * column with `v-if` hits exactly that.
   */
  detachCanvases(
    target?: (keyof AttachedCanvasElements)[] | AttachedCanvasElements,
  ): void {
    if (target !== undefined && !Array.isArray(target)) {
      const owned = ATTACHABLE_KEYS.filter(
        (key) =>
          target[key] !== undefined &&
          this.attachedElements[key] === target[key],
      )
      this.detachKeys(owned)
      return
    }
    this.detachKeys(target ?? ATTACHABLE_KEYS)
  }

  private detachKeys(keys: readonly (keyof AttachedCanvasElements)[]): void {
    if (keys.includes('maskCanvas')) {
      this.takeMaskSnapshot()
    }
    keys.forEach((key) => {
      this.attachedElements[key] = undefined
      switch (key) {
        case 'wrapper':
          this.attachedWrapper = undefined
          this.disconnectWrapperResizeObserver()
          break
        case 'imageCanvas':
          this.attachedImageCanvas = undefined
          break
        case 'maskCanvas':
          this.attachedMaskCanvas = undefined
          break
        case 'tempMaskCanvas':
          this.attachedTempMaskCanvas = undefined
          break
        case 'magnifierMaskCanvas':
          this.attachedMagnifierMaskCanvas = undefined
          break
      }
    })
  }

  // INFO: re-attaching the SAME element is the normal case (a component
  // remounts, or MagnifierImage attaches its one canvas next to CanvasMain's
  // four) and says nothing. A DIFFERENT element in a slot that is already
  // taken is the multiplicity mistake: one context, two CanvasMains. The
  // first one goes on rendering while drawing nowhere, with no exception and
  // nothing in the DOM to see — so this is the only notice a host gets.
  private warnIfReplacingAttached(
    key: keyof AttachedCanvasElements,
    element: HTMLElement,
  ): void {
    const attached = this.attachedElements[key]
    if (attached === undefined || attached === element) return

    console.warn(
      `[starry-digitizer] attachCanvases() replaced the "${key}" element that ` +
        'was already attached. One DigitizerContext drives one set of ' +
        'canvases: if two <CanvasMain> are mounted against the same context, ' +
        'the first stops drawing. Give the second one its own context, or ' +
        'hide the first with v-show rather than v-if.',
    )
  }

  // INFO: the magnifier mask canvas is deliberately NOT required here. It is
  // owned by MagnifierImage.vue, which sits inside <magnifier-main> behind
  // `v-if="options.features.magnifier"` (StarryDigitizer.vue), so a host that
  // passes `features: { magnifier: false }` never attaches it. Requiring it
  // made hasCanvases permanently false for those hosts, which made resize()
  // always bail and left the image undrawn — the digitizer looked empty.
  // Everything that mirrors onto that canvas already guards for its absence
  // (see copyMaskToMagnifier and clearImage).
  get hasCanvases(): boolean {
    return Boolean(
      this.attachedWrapper &&
        this.attachedImageCanvas &&
        this.attachedMaskCanvas &&
        this.attachedTempMaskCanvas,
    )
  }

  // INFO: idempotent on purpose — attachCanvases() is called again whenever a
  // component remounts, and MagnifierImage.vue calls it without a wrapper at
  // all. Re-attaching the SAME element keeps the one observer; a different
  // element replaces it. Stacking observers would re-fit once per stacked
  // callback, which is wasted work at best.
  //
  // ResizeObserver is guarded because jsdom has none; a host without it simply
  // gets no retry, exactly as before this moved into the engine.
  private observeWrapper(wrapper: HTMLDivElement): void {
    if (typeof ResizeObserver === 'undefined') return
    if (this.observedWrapper === wrapper && this.wrapperResizeObserver) return

    this.disconnectWrapperResizeObserver()
    this.wrapperResizeObserver = new ResizeObserver(() => {
      // INFO: re-fit while a fit is still owed (the frame had no size yet) AND
      // while the view is still IN fit mode (a fit landed and the user has not
      // picked a zoom since). The second half is what makes "the frame alone
      // changed" work — a split view opening, the window narrowing. A zoom the
      // user chose with + / - / 0 leaves fit mode, so a later layout change
      // never throws it away.
      if (!this.isFitSizePending && !this.isFitSizeMode) return
      this.drawFitSizeImage()
    })
    this.wrapperResizeObserver.observe(wrapper)
    this.observedWrapper = wrapper
  }

  private disconnectWrapperResizeObserver(): void {
    this.wrapperResizeObserver?.disconnect()
    this.wrapperResizeObserver = undefined
    this.observedWrapper = undefined
  }

  async initializeImageElement(imagePath: string) {
    return new Promise((resolve, reject) => {
      this.imageElement.onload = resolve
      this.imageElement.onerror = (error) => {
        reject(error)
      }
      this.imageElement.src = imagePath
    })
  }

  get scaledCursor(): Coord {
    return {
      xPx: this.cursor.xPx * this.scale,
      yPx: this.cursor.yPx * this.scale,
    }
  }

  get scaledPenToolSizePx(): number {
    return this.penToolSizePx * this.scale
  }

  get isDrawingMask(): boolean {
    switch (this.maskMode) {
      case MASK_MODE.PEN:
      case MASK_MODE.BOX:
      case MASK_MODE.ERASER:
        return true
      default:
        return false
    }
  }

  mouseDown(xPx: number, yPx: number) {
    this.rectangle.startX = xPx
    this.rectangle.startY = yPx
  }

  mouseDragInManualMode() {
    if (this.manualMode === MANUAL_MODE.EDIT) {
      //INFO: only in EDIT mode
      this.drawDraggedArea()
    }
  }

  mouseDragInMaskMode(xPx: number, yPx: number) {
    switch (this.maskMode) {
      case MASK_MODE.PEN:
        this.drawPenMask(xPx, yPx, this.penToolSizePx)
        break
      case MASK_MODE.BOX: // INFO: マウスドラッグ中は選択範囲を仮描画
        this.drawDraggedArea()
        break
      case MASK_MODE.ERASER:
        this.drawEraserMask(xPx, yPx, this.eraserSizePx)
        break
      default:
        break
    }
  }

  mouseDrag(xPx: number, yPx: number) {
    this.rectangle.endX = xPx
    this.rectangle.endY = yPx

    //INFO: 現在のモードがmanual modeかmask modeかで処理を分岐
    if (this.manualMode !== MANUAL_MODE.UNSET) {
      this.mouseDragInManualMode()
      return
    }

    if (this.maskMode !== MASK_MODE.UNSET) {
      this.mouseDragInMaskMode(xPx, yPx)
      return
    }
  }

  mouseUp() {
    this.clearTempMask()

    if (this.maskMode === MASK_MODE.BOX) {
      this.drawBoxMask()
    }
  }

  drawDraggedArea() {
    this.tempMaskCanvas.context.strokeStyle = '#000000ff' // INFO: black
    this.tempMaskCanvas.context.clearRect(
      0,
      0,
      this.maskCanvas.element.width,
      this.maskCanvas.element.height,
    )
    this.tempMaskCanvas.context.strokeRect(
      this.rectangle.startX,
      this.rectangle.startY,
      this.rectangle.endX - this.rectangle.startX,
      this.rectangle.endY - this.rectangle.startY,
    )
  }

  drawPenMask(xPx: number, yPx: number, penSize: number) {
    const ctx = this.maskCanvas.context
    ctx.strokeStyle = '#ffff00ff' // INFO: yellow
    ctx.beginPath()
    if (this.cursor.xPx === 0) {
      ctx.moveTo(xPx, yPx)
    } else {
      // HACK: Firefox v107.0, Google Chrome v108.0.5359.124では問題ないが、
      // HACK: Safari v15.3でなんらか数値計算をしない限り線が描画されないため対応
      ctx.moveTo(this.scaledCursor.xPx + 0.0001, this.scaledCursor.yPx + 0.0001)
    }
    ctx.lineTo(xPx, yPx)
    ctx.lineCap = 'round'
    ctx.lineWidth = penSize
    ctx.stroke()
    this.isDrawnMask = true
    this.copyMaskToMagnifier()
  }

  drawEraserMask(xPx: number, yPx: number, penSize: number) {
    const ctx = this.maskCanvas.context
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = '#000000' // INFO: black
    ctx.beginPath()
    if (this.scaledCursor.xPx === 0) {
      ctx.moveTo(xPx, yPx)
    } else {
      // HACK: Firefox v107.0, Google Chrome v108.0.5359.124では問題ないが、
      // HACK: Safari v15.3でなんらか数値計算をしない限り線が描画されないため対応
      // HACK: Edgeでも116.0.1938.69でも同様に描画されなかった
      ctx.moveTo(this.scaledCursor.xPx + 0.0001, this.scaledCursor.yPx + 0.0001)
    }
    ctx.lineTo(xPx, yPx)
    ctx.lineCap = 'round'
    ctx.lineWidth = penSize
    ctx.stroke()
    this.isDrawnMask = true
    ctx.globalCompositeOperation = 'source-over'
    this.copyMaskToMagnifier({ clearFirst: true })
  }

  drawBoxMask() {
    this.maskCanvas.context.fillStyle = '#ffff00ff' // INFO: yellow
    this.maskCanvas.context.fillRect(
      this.rectangle.startX,
      this.rectangle.startY,
      this.rectangle.endX - this.rectangle.startX,
      this.rectangle.endY - this.rectangle.startY,
    )
    this.isDrawnMask = true
    this.copyMaskToMagnifier()
    this.clearRectangle()
  }

  // INFO: MagnifierImage.vue owns the magnifier mask canvas and mounts
  // independently of CanvasMain.vue, so it can be absent while a mask is being
  // drawn. Mirroring the mask onto it is a preview, never a state change —
  // skipping it must not stop the mask itself from being recorded.
  private copyMaskToMagnifier({ clearFirst = false } = {}): void {
    const magnifier = this.attachedMagnifierMaskCanvas
    if (!magnifier) return

    if (clearFirst) {
      magnifier.context.clearRect(
        0,
        0,
        this.maskCanvas.element.width,
        this.maskCanvas.element.height,
      )
    }
    magnifier.context.drawImage(this.maskCanvas.element, 0, 0)
  }

  clearRectangle() {
    this.rectangle = {
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
    }
  }

  get originalImageCanvasColors() {
    const newCanvas = document.createElement('canvas')
    newCanvas.setAttribute('width', String(this.originalWidth))
    newCanvas.setAttribute('height', String(this.originalHeight))
    const ctx = newCanvas.getContext('2d') as CanvasRenderingContext2D
    ctx.drawImage(
      this.imageElement,
      0,
      0,
      this.originalWidth,
      this.originalHeight,
    )
    return ctx.getImageData(0, 0, this.originalWidth, this.originalHeight).data
  }

  get originalSizeMaskCanvasColors() {
    const newCanvas = document.createElement('canvas')
    newCanvas.setAttribute('width', String(this.originalWidth))
    newCanvas.setAttribute('height', String(this.originalHeight))
    const ctx = newCanvas.getContext('2d') as CanvasRenderingContext2D
    ctx.drawImage(
      this.maskCanvas.element,
      0,
      0,
      this.originalWidth,
      this.originalHeight,
    )
    return ctx.getImageData(0, 0, this.originalWidth, this.originalHeight).data
  }

  // INFO: PixelSource implementation. These are thin aliases over the existing
  // canvas-flavoured members so that `Extractor.execute()` can take the port
  // instead of the whole canvas handler.
  get width(): number {
    return this.originalWidth
  }

  get height(): number {
    return this.originalHeight
  }

  get hasMask(): boolean {
    return this.isDrawnMask
  }

  getImagePixels(): Uint8ClampedArray {
    return this.originalImageCanvasColors
  }

  getMaskPixels(): Uint8ClampedArray {
    return this.originalSizeMaskCanvasColors
  }

  get colorSwatches() {
    if (!this.imageElement) {
      throw new Error('imageElement is undefined.')
    }
    // 画像全体のピクセルデータを取得
    const canvas = document.createElement('canvas')
    canvas.width = this.imageElement.width
    canvas.height = this.imageElement.height
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.drawImage(this.imageElement, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    // ユーティリティ関数で代表色抽出
    return extractColorSwatches({
      imageData: data,
      maxSwatches: 10,
      colorDiffThreshold: 90,
    })
  }

  changeImage(imageElement: HTMLImageElement) {
    this.imageElement = imageElement
    this.drawFitSizeImage()
  }

  get hasImage(): boolean {
    return this.uploadImageUrl !== ''
  }

  // INFO: drop the image entirely (used by reset() / unmount). A fresh Image
  // has width/height 0 so any later draw is a no-op until a new image loads.
  clearImage() {
    this.imageElement = new Image()
    this.uploadImageUrl = ''
    this.scale = 1
    this.isDrawnMask = false
    // INFO: no image, nothing to fit — a leftover request would otherwise make
    // the next layout change re-fit an image that is gone.
    this.isFitSizePending = false
    this.isFitSizeMode = false
    // INFO: the mask belonged to the image that just went away; carrying it
    // onto the next one would draw someone else's mask over a new figure.
    this.detachedMaskSnapshot = undefined
    // INFO: only the canvases that are currently attached — clearImage() is
    // also reachable before mount (reset() on a fresh context).
    ;[
      this.attachedImageCanvas,
      this.attachedMaskCanvas,
      this.attachedTempMaskCanvas,
      this.attachedMagnifierMaskCanvas,
    ].forEach((canvas) => {
      if (!canvas) return
      canvas.element.width = 0
      canvas.element.height = 0
    })
  }

  clearTempMask() {
    this.tempMaskCanvas.context.clearRect(
      0,
      0,
      this.maskCanvas.element.width,
      this.maskCanvas.element.height,
    )
  }

  clearMask() {
    this.maskCanvas.context.clearRect(
      0,
      0,
      this.maskCanvas.element.width,
      this.maskCanvas.element.height,
    )
    this.attachedMagnifierMaskCanvas?.context.clearRect(
      0,
      0,
      this.maskCanvas.element.width,
      this.maskCanvas.element.height,
    )
    this.isDrawnMask = false
  }

  get originalWidth(): number {
    return this.imageElement.width
  }

  get originalHeight(): number {
    return this.imageElement.height
  }

  get canvasWrapper(): HTMLDivElement {
    if (!this.attachedWrapper) {
      throw new Error(CanvasHandler.notAttachedMessage('wrapper'))
    }
    return this.attachedWrapper
  }

  get imageCanvas(): HTMLCanvas {
    if (!this.attachedImageCanvas) {
      throw new Error(CanvasHandler.notAttachedMessage('imageCanvas'))
    }
    return this.attachedImageCanvas
  }

  get maskCanvas(): HTMLCanvas {
    if (!this.attachedMaskCanvas) {
      throw new Error(CanvasHandler.notAttachedMessage('maskCanvas'))
    }
    return this.attachedMaskCanvas
  }

  get tempMaskCanvas(): HTMLCanvas {
    if (!this.attachedTempMaskCanvas) {
      throw new Error(CanvasHandler.notAttachedMessage('tempMaskCanvas'))
    }
    return this.attachedTempMaskCanvas
  }

  get magnifierMaskCanvas(): HTMLCanvas {
    if (!this.attachedMagnifierMaskCanvas) {
      throw new Error(CanvasHandler.notAttachedMessage('magnifierMaskCanvas'))
    }
    return this.attachedMagnifierMaskCanvas
  }

  private static notAttachedMessage(name: keyof AttachedCanvasElements) {
    return `CanvasHandler: "${name}" is not attached. Call attachCanvases({ ${name} }) from the component that owns the element.`
  }

  // INFO: whether a fit-to-frame was asked for but could not be applied yet
  // (see drawFitSizeImage). The engine retries it itself when the attached
  // wrapper gets a size (see observeWrapper); this stays public because a host
  // that renders its own overlay needs to know the scale is not final yet.
  // INFO: whether the current scale is a fit rather than a zoom the user
  // picked — i.e. whether a frame change will re-fit. A host that shows the
  // zoom level reads this to render "Fit" instead of a percentage.
  get isFittedToFrame(): boolean {
    return this.isFitSizeMode
  }

  get hasPendingFitSize(): boolean {
    return this.isFitSizePending
  }

  drawFitSizeImage() {
    // INFO: asking for a fit is what puts the view INTO fit mode, whether or
    // not this call can land one. Set before the early returns so a fit that
    // is postponed for want of a frame still counts.
    this.isFitSizeMode = true

    // INFO: no image yet — there is nothing to fit and nothing to remember
    // either: loading one calls back in through changeImage() / applyImage().
    // Distinguishing this from "the frame has no size yet" (below) matters,
    // because only the latter is worth retrying on a layout change.
    if (this.originalWidth <= 0 || this.originalHeight <= 0) {
      return
    }

    // INFO: the canvases are not lent to the engine yet (before mount / after
    // unmount), so there is no frame to measure and reading `canvasWrapper`
    // would throw. Same outcome as a frame with no layout: remember the fit is
    // owed; attachCanvases() re-runs it once a wrapper is lent in and sized.
    // Reachable now that
    // loadProject() re-fits after a restore, which a host can trigger without
    // going through the mounted component.
    if (!this.hasCanvases) {
      this.isFitSizePending = true
      return
    }

    const wrapperWidthPx = this.canvasWrapper.offsetWidth
    const wrapperHeightPx = this.canvasWrapper.offsetHeight
    // INFO: the frame is not laid out yet. A host that lets flex size the
    // canvas (--sd-canvas-height: 0 / --sd-canvas-min-height: 0) can hand the
    // image over inside that window, and fitting to 0x0 would burn
    // scale = Math.min(0, 0) - 0.01 = -0.01 into the handler while resize()
    // rejects the negative size and leaves the canvases alone — the image and
    // the points overlaid on it (CanvasPoints uses `scale`) would then be
    // drawn at different scales. Keep the current scale and remember that a
    // fit is owed instead.
    if (wrapperWidthPx <= 0 || wrapperHeightPx <= 0) {
      this.isFitSizePending = true
      return
    }

    const widthScale = wrapperWidthPx / this.originalWidth
    const heightScale = wrapperHeightPx / this.originalHeight
    const scale = Math.min(widthScale, heightScale) - 0.01 // INFO: 0.01を引くことで、画像がはみ出さないようにする
    const fitWidth = this.originalWidth * scale
    const fitHeight = this.originalHeight * scale
    // INFO: `scale` is only adopted when the canvases really took the new
    // size (canvases may not all be attached yet).
    if (!this.resize(fitWidth, fitHeight)) {
      this.isFitSizePending = true
      return
    }
    this.scale = scale
    this.isFitSizePending = false
  }

  get canScaleDown(): boolean {
    return this.scale > MIN_SCALE
  }

  scaleDown() {
    // INFO: a no-op at the lower bound, not a throw. Zoom UI is drawn by the
    // host, which binds a button straight to this method; a button that is
    // visible and enabled must never throw at the caller. Hosts that want the
    // button greyed out read `canScaleDown` instead of guessing the bound.
    if (!this.canScaleDown) {
      return
    }
    // INFO: clamped, because the current scale is not necessarily a multiple
    // of the step — a fit-to-frame scale is whatever the frame asked for — and
    // one step down from 0.15 would otherwise land at 0.05, below the bound
    // `canScaleDown` promises we stay on.
    const scale = Math.max(MIN_SCALE, this.scale - 0.1)
    const scaledWidth = this.originalWidth * scale
    const scaledHeight = this.originalHeight * scale
    if (!this.resize(scaledWidth, scaledHeight)) {
      return
    }
    this.scale = scale
    this.clearPendingFitSize()
  }

  scaleUp() {
    const scale = this.scale + 0.1
    const scaledWidth = this.originalWidth * scale
    const scaledHeight = this.originalHeight * scale
    if (!this.resize(scaledWidth, scaledHeight)) {
      return
    }
    this.scale = scale
    this.clearPendingFitSize()
  }

  drawOriginalSizeImage() {
    if (!this.resize(this.originalWidth, this.originalHeight)) {
      return
    }
    this.scale = 1
    this.clearPendingFitSize()
  }

  // INFO: the user picked a zoom by hand, so an owed fit is stale AND the view
  // has left fit mode — a later layout change must not silently override what
  // they chose.
  private clearPendingFitSize() {
    this.isFitSizePending = false
    this.isFitSizeMode = false
  }

  // INFO: returns whether the canvases were actually resized. Callers that
  // keep a scale of their own (drawFitSizeImage / scaleUp / scaleDown /
  // drawOriginalSizeImage) must not update `scale` when this is false, or the
  // image and the points overlaid on it are drawn at different scales.
  resize(width: number, height: number): boolean {
    // INFO: nothing to resize before an image is loaded, and drawing from a
    // 0x0 canvas throws InvalidStateError. Reachable because the keyboard
    // zoom shortcuts are handled on `document` and therefore reach every
    // mounted digitizer, including one that is still waiting for its image.
    const hasImagePixels = this.originalWidth > 0 && this.originalHeight > 0
    if (
      !this.hasCanvases ||
      !hasImagePixels ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      return false
    }

    const tempMaskCanvas = document.createElement('canvas')
    const tempMaskCanvasCtx = tempMaskCanvas.getContext(
      '2d',
    ) as CanvasRenderingContext2D
    tempMaskCanvas.width = this.maskCanvas.element.width
    tempMaskCanvas.height = this.maskCanvas.element.height
    // INFO: clearImage() zeroes the canvases, so the previous mask may have
    // no pixels to carry over.
    const hasPreviousMask =
      tempMaskCanvas.width > 0 && tempMaskCanvas.height > 0
    if (hasPreviousMask) {
      tempMaskCanvasCtx.drawImage(this.maskCanvas.element, 0, 0)
    }
    this.maskCanvas.element.width = width
    this.maskCanvas.element.height = height
    if (hasPreviousMask) {
      this.maskCanvas.context.drawImage(tempMaskCanvas, 0, 0, width, height)
    }
    this.tempMaskCanvas.element.width = width
    this.tempMaskCanvas.element.height = height
    this.imageCanvas.element.width = width
    this.imageCanvas.element.height = height
    this.imageCanvas.context.drawImage(this.imageElement, 0, 0, width, height)
    // INFO: absent when the host hides the magnifier; mirroring onto it is a
    // preview, so its absence must not stop the resize.
    const magnifier = this.attachedMagnifierMaskCanvas
    if (magnifier) {
      magnifier.element.width = width
      magnifier.element.height = height
      magnifier.context.drawImage(this.maskCanvas.element, 0, 0, width, height)
    }
    return true
  }

  setUploadImageUrl(url: string) {
    this.uploadImageUrl = url
  }

  setCursor(coord: Coord) {
    this.cursor = coord
  }

  setIsCursorOnCanvas(value: boolean) {
    this.isCursorOnCanvas = value
  }

  // INFO: the two modes are mutually exclusive, so activating one clears the
  // other. Clearing a mode (UNSET) must NOT clear the counterpart: switching
  // datasets turns the mask tool off while the plot-add mode has to stay on.
  setManualMode(mode: ManualMode) {
    this.manualMode = mode
    if (mode !== MANUAL_MODE.UNSET) {
      this.maskMode = MASK_MODE.UNSET
    }
    // INFO: whoever sets the manual mode explicitly (keyboard shortcut, axis
    // completion, project restore, host API) becomes the new truth, so a memo
    // taken before the mask tool could only restore a stale mode afterwards.
    this.manualModeBeforeMask = MANUAL_MODE.UNSET
  }

  // INFO: two ways to leave the mask mode on purpose, because "the user
  // deselected the tool" and "something internal cleared it" want different
  // outcomes. A dedicated exitMaskMode() was chosen over an options bag on
  // setMaskMode (setMaskMode(UNSET, { restoreManualMode: true })) so that the
  // intent is visible at the call site and the plain setter keeps one meaning:
  //   - setMaskMode(UNSET): just turn the mask tool off — used by internal
  //     clean-up such as switching datasets, where reviving the plot mode the
  //     user had before would be its own surprise.
  //   - exitMaskMode(): the user deselected the active mask tool, so put the
  //     manual mode that was on before it back.
  setMaskMode(mode: MaskMode) {
    // INFO: remember the manual mode only when a mask tool is switched on from
    // a non-mask state. Walking Pen -> Box -> Eraser must not overwrite the
    // memo (manualMode is already UNSET by then).
    if (mode !== MASK_MODE.UNSET && this.maskMode === MASK_MODE.UNSET) {
      this.manualModeBeforeMask = this.manualMode
    }
    // INFO: dropping the memo here keeps it from outliving the mask session it
    // belongs to — a project restore, a reset or a dataset switch must not be
    // followed later by an unexpected restore.
    if (mode === MASK_MODE.UNSET) {
      this.manualModeBeforeMask = MANUAL_MODE.UNSET
    }
    this.maskMode = mode
    if (mode !== MASK_MODE.UNSET) {
      this.manualMode = MANUAL_MODE.UNSET
    }
  }

  exitMaskMode() {
    const manualModeToRestore = this.manualModeBeforeMask
    // INFO: clears the memo as well, so a second exitMaskMode() restores
    // nothing.
    this.setMaskMode(MASK_MODE.UNSET)
    if (manualModeToRestore !== MANUAL_MODE.UNSET) {
      this.setManualMode(manualModeToRestore)
    }
  }

  setPenToolSizePx(size: number) {
    this.penToolSizePx = size
  }

  setEraserSizePx(size: number) {
    this.eraserSizePx = size
  }
}
