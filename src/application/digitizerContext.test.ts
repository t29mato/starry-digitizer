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
