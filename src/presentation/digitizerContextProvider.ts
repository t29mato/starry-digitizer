import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'
import type { DigitizerContext } from '@/application/digitizerContext'

// INFO: provide/inject is the only part of the context wiring that needs Vue's
// renderer (both functions require an active component instance), so it lives
// in presentation rather than next to createDigitizerContext(). That keeps
// `starry-digitizer/core` free of the renderer; this module ships in the
// `starry-digitizer/vue` entry instead. See docs/design/engine-boundary.md §3.

export const DIGITIZER_CONTEXT_KEY: InjectionKey<DigitizerContext> = Symbol(
  'starry-digitizer-context',
)

export function provideDigitizerContext(context: DigitizerContext): void {
  provide(DIGITIZER_CONTEXT_KEY, context)
}

export function useDigitizerContext(): DigitizerContext {
  const context = inject(DIGITIZER_CONTEXT_KEY)
  if (!context) {
    throw new Error(
      'DigitizerContext is not provided. Components must be rendered inside <StarryDigitizer>.',
    )
  }
  return context
}
