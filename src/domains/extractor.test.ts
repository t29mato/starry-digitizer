import { Extractor } from './extractor'
import LineExtract from './extractStrategies/lineExtract'

const extract = new LineExtract()

test('DO write extractor test', () => {
  new Extractor(extract)
})
