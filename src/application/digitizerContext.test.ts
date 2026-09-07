import { addDataset } from '@/application/utils/datasetOperations'
import { createDigitizerContext } from './digitizerContext'

// INFO: R7 — several <StarryDigitizer> may live on one page. Each mount gets
// its own DigitizerContext, so nothing about extraction may be shared between
// two of them. The extraction strategies used to be process-wide singletons
// (LineExtract.instance / SymbolExtractByArea.instance), which made the
// Δ X/Δ Y and min/max diameter settings of one instance overwrite the other's.
describe('createDigitizerContext', () => {
  test('two contexts own separate extractors and extraction strategies', () => {
    const a = createDigitizerContext()
    const b = createDigitizerContext()

    expect(a.extractor).not.toBe(b.extractor)
    expect(a.extractor.lineExtract).not.toBe(b.extractor.lineExtract)
    expect(a.extractor.symbolExtractByArea).not.toBe(
      b.extractor.symbolExtractByArea,
    )
  })

  test('changing one context extraction parameters leaves the other alone', () => {
    const a = createDigitizerContext()
    const b = createDigitizerContext()

    a.extractor.lineExtract.setDxPx(33)
    a.extractor.lineExtract.setDyPx(34)
    a.extractor.symbolExtractByArea.setMinDiameterPx(21)
    a.extractor.symbolExtractByArea.setMaxDiameterPx(22)
    a.extractor.setColorDistancePct(80)

    expect(b.extractor.lineExtract.dxPx).toBe(10)
    expect(b.extractor.lineExtract.dyPx).toBe(10)
    expect(b.extractor.symbolExtractByArea.minDiameterPx).toBe(5)
    expect(b.extractor.symbolExtractByArea.maxDiameterPx).toBe(100)
    expect(b.extractor.colorDistancePct).toBe(1)
  })

  // INFO: effectiveDigits used to live on Magnifier. It is per-instance state
  // like the extraction settings above, so two mounts must not share it.
  test('two contexts own separate value formats', () => {
    const a = createDigitizerContext()
    const b = createDigitizerContext()

    expect(a.valueFormat).not.toBe(b.valueFormat)
    expect(a.valueFormat.effectiveDigits).toBe(4)
    expect(b.valueFormat.effectiveDigits).toBe(4)

    a.valueFormat.setEffectiveDigits(7)

    expect(a.valueFormat.effectiveDigits).toBe(7)
    expect(b.valueFormat.effectiveDigits).toBe(4)
  })

  test('switching the strategy of one context leaves the other on its own', () => {
    const a = createDigitizerContext()
    const b = createDigitizerContext()

    a.extractor.setStrategyByName('Symbol Extract')

    expect(a.extractor.strategy.name).toBe('Symbol Extract')
    expect(b.extractor.strategy.name).toBe('Line Extract')
  })

  test('the strategy a context runs is the one its settings UI writes to', () => {
    const ctx = createDigitizerContext()

    ctx.extractor.setStrategyByName('Symbol Extract')
    ctx.extractor.symbolExtractByArea.setMinDiameterPx(7)

    // INFO: reading through the reactive() proxy must reach the very object
    // execute() delegates to, otherwise the settings panel would edit a copy.
    expect(ctx.extractor.strategy).toBe(ctx.extractor.symbolExtractByArea)
    expect(
      (ctx.extractor.strategy as { minDiameterPx: number }).minDiameterPx,
    ).toBe(7)
  })
})

// INFO: `historyManager.capture()` is called from the application use cases
// (datasetOperations) and from CanvasMain.vue alike, and the context hands out
// a reactive() PROXY of the manager rather than the instance itself. A host
// that subscribes through `ctx.historyManager` therefore has to hear captures
// made by either — which is why the notification lives in the manager and not
// at the call sites.
describe('history notifications through the context', () => {
  test('a listener hears a capture made by an application use case', () => {
    const ctx = createDigitizerContext()
    const listener = jest.fn()
    ctx.historyManager.subscribe(listener)

    addDataset(ctx)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({
      type: 'capture',
      canUndo: true,
      canRedo: false,
    })
  })

  test('undo through the context is reported as undo, not as a new capture', () => {
    // INFO: the loop this prevents — a host that pushed an entry for the undo
    // it just performed would never be able to leave the digitizer's history.
    const ctx = createDigitizerContext()
    addDataset(ctx)
    const listener = jest.fn()
    ctx.historyManager.subscribe(listener)

    ctx.historyManager.undo()

    expect(listener).toHaveBeenCalledWith({
      type: 'undo',
      canUndo: false,
      canRedo: true,
    })
  })

  test('two contexts own separate history listeners', () => {
    const a = createDigitizerContext()
    const b = createDigitizerContext()
    const listener = jest.fn()
    a.historyManager.subscribe(listener)

    b.historyManager.capture()

    expect(listener).not.toHaveBeenCalled()
  })
})
