import { createDigitizerContext } from '@/application/digitizerContext'

// INFO: The standalone app (App.vue) owns one DigitizerContext so that its
// menu bar (File/Edit/View) and <StarryDigitizer :context> share the same
// state. Library consumers never import this; <StarryDigitizer> creates its
// own context when none is passed.
export const appContext = createDigitizerContext()
