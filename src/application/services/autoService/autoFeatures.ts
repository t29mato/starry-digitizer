import { markRaw } from '@vue/reactivity'
import { AutoFeature, AutoService } from './autoService'
import { AutoCalibrationProposal } from './autoServiceWire'

// INFO: Per-instance state of the server-side automatic features. Lives on
// the DigitizerContext (reactive), so panels re-render when the capabilities
// answer arrives or a proposal is made.
//
// `features` starts EMPTY and stays empty unless a service is configured and
// says otherwise — "hidden" is the default, not something a failure has to
// reach. docs/design/auto-service.md.
export class AutoFeatures {
  service: AutoService | null = null
  features: AutoFeature[] = []
  /** true once the current service's capabilities have been asked (any outcome) */
  checked = false
  /**
   * The Auto-place answer waiting for the user to apply or discard it, and
   * what it was computed for. View state: not in undo history or projects.
   */
  proposal: AutoCalibrationProposal | null = null
  proposalAxisSetId: number | null = null

  has(feature: AutoFeature): boolean {
    return this.features.includes(feature)
  }

  get canAutoPlace(): boolean {
    return this.has('auto_axis')
  }

  get canExtract(): boolean {
    return this.has('markernet') || this.has('lineformer')
  }

  setService(service: AutoService | null): void {
    // INFO: markRaw — the service is a bag of closures over fetch; proxying
    // it buys nothing and would hand the transport reactive arguments.
    this.service = service ? markRaw(service) : null
    this.features = []
    this.checked = false
    this.clearProposal()
  }

  setFeatures(features: AutoFeature[]): void {
    this.features = features
    this.checked = true
  }

  setProposal(proposal: AutoCalibrationProposal, axisSetId: number): void {
    this.proposal = proposal
    this.proposalAxisSetId = axisSetId
  }

  clearProposal(): void {
    this.proposal = null
    this.proposalAxisSetId = null
  }
}
