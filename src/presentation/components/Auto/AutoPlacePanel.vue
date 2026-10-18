<template>
  <!-- INFO: nothing at all unless the backend allows Auto-place (board P5):
       no placeholder, no disabled button, no "not available" text. -->
  <div v-if="autoFeatures.canAutoPlace" class="sd-panel" data-cy="auto-place">
    <div class="d-flex align-center mb-1">
      <h5 class="mb-0">Axis Auto-place</h5>
      <sd-button
        class="ml-3"
        size="small"
        color="primary"
        data-cy="auto-place-request"
        :disabled="!canRequest"
        @click="request"
        >{{ isRequesting ? 'Auto-place…' : 'Auto-place' }}</sd-button
      >
    </div>
    <div v-if="errorMessage" class="text-caption c__error">
      {{ errorMessage }}
    </div>
    <div v-if="proposal" class="text-caption" data-cy="auto-place-proposal">
      <div
        v-for="axis in axisSummaries"
        :key="axis.name"
        :data-cy="`auto-place-axis-${axis.name}`"
      >
        <b>{{ axis.name }}:</b>
        <template v-if="axis.ok">
          {{ axis.scale }}, {{ axis.ticksText }}
          <span v-if="axis.lowConfidence" class="c__warning"
            >⚠ low confidence — check the ticks</span
          >
        </template>
        <template v-else>
          <span class="c__muted">not calibrated ({{ axis.reason }})</span>
        </template>
      </div>
      <div v-if="activeAxisSet.hasAtLeastOneAxis" class="c__muted">
        Apply replaces the current axis points (Undo restores them).
      </div>
      <div class="d-flex mt-1" style="gap: 4px">
        <sd-button
          size="small"
          color="primary"
          data-cy="auto-place-apply"
          :disabled="options.readonly || usableAxisCount === 0"
          @click="apply"
          >Apply</sd-button
        >
        <sd-button
          size="small"
          variant="outlined"
          data-cy="auto-place-discard"
          @click="discard"
          >Discard</sd-button
        >
      </div>
    </div>
    <div v-else-if="appliedNote" class="text-caption c__muted">
      {{ appliedNote }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { SdButton } from '@/presentation/ui'
import {
  applyAutoCalibration,
  describeAxisFailure,
  discardAutoCalibration,
  requestAutoCalibration,
} from '@/application/utils/autoCalibrationOperations'
import {
  AutoAxisName,
  AutoAxisProposal,
  AutoCalibrationProposal,
} from '@/application/services/autoService/autoServiceWire'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { DigitizerError, toErrorPayload } from '@/application/errors'
import { isImageChangedError } from '@/application/utils/autoFeatureOperations'

// INFO: below this the backend's own README counts a noticeable share of
// misread axes (its confidence is an heuristic, not a probability)
const LOW_CONFIDENCE = 0.5

type AxisSummary = {
  name: AutoAxisName
  ok: boolean
  scale: string
  ticksText: string
  lowConfidence: boolean
  reason: string
}

function formatTicks(axis: AutoAxisProposal): string {
  const values = axis.ticks.map((t) => t.value).sort((a, b) => a - b)
  const shown =
    values.length <= 4
      ? values.join(', ')
      : `${values.slice(0, 3).join(', ')} … ${values[values.length - 1]}`
  return `${shown} (${values.length} ticks)`
}

// INFO: Axis Auto-place (board P1). The backend proposes, the user applies:
// the proposal is shown here (and its ticks on the canvas, see
// CanvasAutoAxisProposal.vue) and changes nothing until Apply, which is one
// undo step. docs/design/auto-service.md.
export default defineComponent({
  components: { SdButton },
  emits: ['error'],
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    const { autoFeatures, axisSetRepository, canvasHandler } = ctx
    return {
      ctx,
      options,
      autoFeatures,
      axisSetRepository,
      canvasHandler,
      // INFO: the running request's; not reactive state, only aborted
      controller: null as AbortController | null,
    }
  },
  data() {
    return {
      isRequesting: false,
      errorMessage: '',
      appliedNote: '',
    }
  },
  computed: {
    activeAxisSet(): AxisSetInterface {
      return this.axisSetRepository.activeAxisSet
    },
    canRequest(): boolean {
      return (
        !this.options.readonly &&
        !this.isRequesting &&
        Boolean(this.canvasHandler.uploadImageUrl)
      )
    },
    // INFO: a proposal belongs to the axis set it was asked for; switching
    // to another axis set hides it rather than offering to apply it there
    proposal(): AutoCalibrationProposal | null {
      const { proposal, proposalAxisSetId } = this.autoFeatures
      if (proposalAxisSetId !== this.axisSetRepository.activeAxisSetId) {
        return null
      }
      return proposal
    },
    axisSummaries(): AxisSummary[] {
      const proposal = this.proposal
      if (!proposal) return []
      return (['x', 'y'] as const).map((name) => {
        const axis = proposal[name]
        return {
          name,
          ok: axis.ok,
          scale: axis.scale ?? '',
          ticksText: formatTicks(axis),
          lowConfidence:
            axis.confidence !== null && axis.confidence < LOW_CONFIDENCE,
          reason: describeAxisFailure(axis.failureReason),
        }
      })
    },
    usableAxisCount(): number {
      return this.axisSummaries.filter((axis) => axis.ok).length
    },
  },
  created() {
    // INFO: a proposal is for the image it was asked for; a new image cancels
    // the running request (requestAutoCalibration also drops a late answer)
    this.$watch(
      () => this.canvasHandler.uploadImageUrl,
      () => this.controller?.abort(),
    )
  },
  beforeUnmount() {
    this.controller?.abort()
  },
  methods: {
    async request() {
      const controller = new AbortController()
      this.controller = controller
      this.isRequesting = true
      this.errorMessage = ''
      this.appliedNote = ''
      try {
        await requestAutoCalibration(this.ctx, controller.signal)
      } catch (e) {
        if (isImageChangedError(e)) {
          this.appliedNote = 'Cancelled: the image changed.'
          return
        }
        const payload = toErrorPayload(
          DigitizerError.from(e, 'AUTO_SERVICE_FAILED'),
        )
        this.errorMessage = payload.message
        this.$emit('error', payload)
      } finally {
        if (this.controller === controller) this.controller = null
        this.isRequesting = false
      }
    },
    apply() {
      const applied = applyAutoCalibration(this.ctx)
      if (applied.length > 0) {
        this.appliedNote = 'Applied — drag the axis markers to adjust.'
      }
    },
    discard() {
      discardAutoCalibration(this.ctx)
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__warning {
    color: #b26a00;
  }
  &__error {
    color: #c62828;
  }
  &__muted {
    color: #777;
  }
}
</style>
