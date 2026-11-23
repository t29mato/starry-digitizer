<template>
  <!-- INFO: nothing at all unless the backend allows Auto-place (board P5):
       no placeholder, no disabled button, no "not available" text. -->
  <div v-if="isAvailable" class="sd-panel" data-cy="auto-place">
    <div class="d-flex align-center flex-wrap mb-1" style="gap: 4px 0">
      <h5 class="mb-0">Axis Auto-place</h5>
      <!-- INFO: only when the service offers both: X-Y and Bar plots -->
      <div
        v-if="plotChoices.length > 1"
        class="c__toggle ml-3"
        role="group"
        aria-label="Plot type"
        data-cy="auto-place-plot"
      >
        <button
          v-for="choice in plotChoices"
          :key="choice.plot"
          type="button"
          class="c__toggle-button"
          :class="{ 'c__toggle-button--on': choice.plot === selectedPlot }"
          :aria-pressed="choice.plot === selectedPlot ? 'true' : 'false'"
          :data-cy="`auto-place-plot-${choice.plot}`"
          :title="choice.title"
          :disabled="isRequesting"
          @click="chosenPlot = choice.plot"
        >
          {{ choice.label }}
        </button>
      </div>
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
        <template v-if="axis.barIndexText">
          <span :class="{ c__muted: !barCentres.length }">{{
            axis.barIndexText
          }}</span>
        </template>
        <template v-else-if="axis.ok">
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
          :disabled="options.readonly || !canApply"
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
  applyBarAutoCalibration,
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
import { CalibrationPlot } from '@/application/services/autoService/autoService'
import {
  AutoAxesKind,
  barAxesKind,
} from '@/application/utils/autoDigitizeOperations'
import { DigitizerError, toErrorPayload } from '@/application/errors'
import {
  isImageChangedError,
  outsideHoursNote,
} from '@/application/utils/autoFeatureOperations'

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
  /** a bar plot's x as the bar index: what Apply does with it */
  barIndexText: string
}

const PLOT_CHOICES: { plot: CalibrationPlot; label: string; title: string }[] =
  [
    { plot: 'xy', label: 'X-Y', title: 'Read both axes (X-Y plot)' },
    {
      plot: 'bar',
      label: 'Bar',
      title:
        'Read the value axis of a vertical bar chart; x becomes the bar index (0, 1, 2, …) of the active dataset’s points',
    },
  ]

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
    const {
      autoFeatures,
      axisSetRepository,
      canvasHandler,
      datasetRepository,
    } = ctx
    return {
      ctx,
      options,
      autoFeatures,
      axisSetRepository,
      canvasHandler,
      datasetRepository,
      // INFO: the running request's; not reactive state, only aborted
      controller: null as AbortController | null,
    }
  },
  data() {
    return {
      // INFO: null = the first plot the service allows
      chosenPlot: null as CalibrationPlot | null,
      isRequesting: false,
      errorMessage: '',
      appliedNote: '',
    }
  },
  computed: {
    isAvailable(): boolean {
      return this.plotChoices.length > 0
    },
    plotChoices(): typeof PLOT_CHOICES {
      return PLOT_CHOICES.filter(({ plot }) =>
        plot === 'bar'
          ? this.autoFeatures.canAutoPlaceBar
          : this.autoFeatures.canAutoPlace,
      )
    },
    selectedPlot(): CalibrationPlot {
      const allowed = this.plotChoices.map((choice) => choice.plot)
      const chosen = this.chosenPlot
      if (chosen && allowed.includes(chosen)) return chosen
      return allowed[0] ?? 'xy'
    },
    // INFO: a bar plot's proposal: X-Y when x was read as numbers (as Auto
    // digitize decides), else x = the bar index; null = not a bar proposal
    // or its value axis is unusable
    barKind(): AutoAxesKind | null {
      const proposal = this.proposal
      if (!proposal || proposal.plot !== 'bar') return null
      return barAxesKind(proposal).kind
    },
    // INFO: the bars are the active dataset's points (a BarNet draft, or
    // points clicked on the bars) when it is on this axis set
    barCentres(): number[] {
      const { datasetRepository } = this
      if (datasetRepository.isViewAllMode) return []
      const dataset = datasetRepository.activeDataset
      if (dataset.axisSetId !== this.axisSetRepository.activeAxisSetId) {
        return []
      }
      return dataset.points.map((point) => point.xPx)
    },
    canApply(): boolean {
      if (this.proposal?.plot === 'bar') return this.barKind !== null
      return this.usableAxisCount > 0
    },
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
          barIndexText: name === 'x' ? this.barIndexText : '',
        }
      })
    },
    barIndexText(): string {
      if (this.barKind !== 'bar') return ''
      const count = this.barCentres.length
      if (count === 0) {
        return 'bar index — no bars yet: extract them (BarNet) or click them in a dataset, then Apply again; x is left as it is'
      }
      const name = this.datasetRepository.activeDataset.name
      return `bar index 0 … ${
        count - 1
      } (Bar0, Bar1, …) from the ${count} point${
        count === 1 ? '' : 's'
      } of “${name}”`
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
        await requestAutoCalibration(
          this.ctx,
          controller.signal,
          this.selectedPlot,
        )
      } catch (e) {
        if (isImageChangedError(e)) {
          this.appliedNote = 'Cancelled: the image changed.'
          return
        }
        const payload = toErrorPayload(
          DigitizerError.from(e, 'AUTO_SERVICE_FAILED'),
        )
        this.errorMessage = [payload.message, outsideHoursNote(this.ctx)]
          .filter(Boolean)
          .join(' ')
        this.$emit('error', payload)
      } finally {
        if (this.controller === controller) this.controller = null
        this.isRequesting = false
      }
    },
    apply() {
      const applied =
        this.barKind === 'bar'
          ? applyBarAutoCalibration(this.ctx, this.barCentres)
          : applyAutoCalibration(this.ctx)
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
  &__toggle {
    display: inline-flex;
    border: 1px solid var(--sd-border, rgba(0, 0, 0, 0.24));
    border-radius: var(--sd-radius, 4px);
    overflow: hidden;
  }
  &__toggle-button {
    padding: 0 8px;
    border: 0;
    background: var(--sd-surface, #fff);
    color: var(--sd-text, rgba(0, 0, 0, 0.87));
    font: inherit;
    font-size: 0.75em;
    cursor: pointer;
    & + & {
      border-left: 1px solid var(--sd-border, rgba(0, 0, 0, 0.24));
    }
    &--on {
      background: var(--sd-primary, #1e88e5);
      color: var(--sd-primary-contrast, #fff);
    }
    &:disabled {
      cursor: default;
      opacity: 0.6;
    }
    &:focus-visible {
      outline: 2px solid var(--sd-primary, #1e88e5);
      outline-offset: -2px;
    }
  }
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
