import { Extractor } from './extractor'
import SymbolExtractByArea from '../strategies/extractStrategies/symbolExtractByArea'

test('DO write extractor test', () => {
  const extractor = Extractor.getInstance()
  extractor.setStrategy(new SymbolExtractByArea())
})
