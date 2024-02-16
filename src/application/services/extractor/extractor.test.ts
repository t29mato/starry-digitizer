import { Extractor } from './extractor'
import SymbolExtractByArea from '../../strategies/extractStrategies/symbolExtractByArea'
import LineExtract from '../../strategies/extractStrategies/lineExtract'

test('DO write extractor test', () => {
  const extractor = new Extractor(LineExtract.instance)
  extractor.setStrategy(new SymbolExtractByArea())
})
