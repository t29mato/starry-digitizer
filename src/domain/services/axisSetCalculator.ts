// INFO: Phase 1 (docs/design/plot-digitizer-architecture.md) — this class
// has been moved to packages/plot-digitizer-core. This file re-exports it
// (as the default export, to match every existing
// `@/domain/services/axisSetCalculator` import in this app) so nothing else
// needs to change. Do not add logic here — edit the core package instead.
import { AxisSetCalculator } from '@plot-digitizer/core'

export default AxisSetCalculator
