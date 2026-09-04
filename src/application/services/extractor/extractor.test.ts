import { Extractor } from './extractor'
import SymbolExtractByArea from '../../strategies/extractStrategies/symbolExtractByArea'
import LineExtract from '../../strategies/extractStrategies/lineExtract'

test('a new extractor starts on its own Line Extract strategy', () => {
  const extractor = new Extractor()

  expect(extractor.strategy).toBe(extractor.lineExtract)
  expect(extractor.lineExtract).toBeInstanceOf(LineExtract)
  expect(extractor.symbolExtractByArea).toBeInstanceOf(SymbolExtractByArea)
})

test('setStrategyByName switches between the extractor-owned strategies', () => {
  const extractor = new Extractor()

  extractor.setStrategyByName('Symbol Extract')
  expect(extractor.strategy).toBe(extractor.symbolExtractByArea)

  extractor.setStrategyByName('Line Extract')
  expect(extractor.strategy).toBe(extractor.lineExtract)
})

test('setStrategyByName ignores an unknown name', () => {
  const extractor = new Extractor()

  extractor.setStrategyByName('No Such Extract')

  expect(extractor.strategy).toBe(extractor.lineExtract)
})

test('setStrategy still accepts a caller-supplied strategy', () => {
  const strategy = new SymbolExtractByArea()
  const extractor = new Extractor(new LineExtract())

  extractor.setStrategy(strategy)

  expect(extractor.strategy).toBe(strategy)
})

// INFO: the regression this guards. The strategies used to be process-wide
// singletons (LineExtract.instance / SymbolExtractByArea.instance), so two
// extractors shared one set of extraction parameters.
test('two extractors do not share extraction parameters', () => {
  const a = new Extractor()
  const b = new Extractor()

  expect(a.lineExtract).not.toBe(b.lineExtract)
  expect(a.symbolExtractByArea).not.toBe(b.symbolExtractByArea)

  a.lineExtract.setDxPx(42)
  a.lineExtract.setDyPx(43)
  a.symbolExtractByArea.setMinDiameterPx(11)
  a.symbolExtractByArea.setMaxDiameterPx(12)
  a.setStrategyByName('Symbol Extract')

  expect(b.lineExtract.dxPx).toBe(10)
  expect(b.lineExtract.dyPx).toBe(10)
  expect(b.symbolExtractByArea.minDiameterPx).toBe(5)
  expect(b.symbolExtractByArea.maxDiameterPx).toBe(100)
  expect(b.strategy.name).toBe('Line Extract')
})
