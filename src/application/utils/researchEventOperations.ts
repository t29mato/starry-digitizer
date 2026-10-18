import { DigitizerContext } from '@/application/digitizerContext'
import { ResearchEventListener } from '@/application/services/researchEvents/researchEvents'

/**
 * Hand the research events of `ctx` to `listener` (or, with null /
 * undefined, stop). Off by default: the digitizer never sends these anywhere
 * itself, and without a listener it does not even build them.
 * docs/design/auto-service.md §9.
 *
 * Listeners run synchronously right after the operation. Do not change
 * digitizer state from one — record the event and return (send it from your
 * own task). An exception thrown by the listener is logged and swallowed.
 */
export function configureResearchEvents(
  ctx: DigitizerContext,
  listener: ResearchEventListener | null | undefined,
): void {
  ctx.researchEvents.setListener(listener)
}
