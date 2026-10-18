<template>
  <!-- INFO: nothing at all unless the backend allows BOTH halves of the run,
       Auto-place and at least one extraction method (board P5): no
       placeholder, no disabled button. -->
  <div v-if="isAvailable" class="sd-panel" data-cy="auto-digitize">
    <div class="d-flex align-center flex-wrap" style="gap: 8px">
      <sd-button
        size="small"
        color="primary"
        data-cy="auto-digitize-run"
        :disabled="!canRun"
        title="Auto-place the axes, apply them, then make draft datasets with the chosen method. One Undo step."
        @click="run"
        >{{ isRunning ? 'Auto digitize…' : 'Auto digitize' }}</sd-button
      >
      <!-- INFO: the person chooses; there is no automatic fallback from one
           method to the other (MarkerNet does badly on line charts). -->
      <div
        class="c__toggle"
        role="group"
        aria-label="Extraction method"
        data-cy="auto-digitize-method"
      >
        <button
          v-for="choice in methodChoices"
          :key="choice.method"
          type="button"
          class="c__toggle-button"
          :class="{ 'c__toggle-button--on': choice.method === selectedMethod }"
          :aria-pressed="choice.method === selectedMethod ? 'true' : 'false'"
          :data-cy="`auto-digitize-method-${choice.method}`"
          :title="choice.title"
          :disabled="isRunning"
          @click="chosenMethod = choice.method"
        >
          {{ choice.label }}
        </button>
      </div>
      <sd-button
        v-if="isRunning"
        size="small"
        variant="outlined"
        data-cy="auto-digitize-cancel"
        @click="cancel"
        >Cancel</sd-button
      >
    </div>
    <div
      v-if="!isRunning && !outcome && activeAxisSet.hasAtLeastOneAxis"
      class="text-caption c__muted mt-1"
    >
      Replaces the current axis points (Undo restores them).
    </div>
    <div
      v-if="isRunning"
      class="text-caption mt-1"
      data-cy="auto-digitize-progress"
      aria-live="polite"
    >
      {{ progressText }}
    </div>
    <!-- INFO: the result panel: each step and how far the run got -->
    <div
      v-if="outcome && !isRunning"
      class="text-caption mt-1"
      data-cy="auto-digitize-result"
    >
      <div
        v-for="step in resultSteps"
        :key="step.name"
        :data-cy="`auto-digitize-step-${step.name}`"
        :data-state="step.state"
      >
        <span :class="`c__mark c__mark--${step.state}`" aria-hidden="true">{{
          STEP_MARKS[step.state]
        }}</span>
        <b>{{ step.title }}:</b> {{ step.text }}
      </div>
      <div
        v-if="outcome.reason"
        :class="outcome.status === 'failed' ? 'c__error' : 'c__muted'"
        data-cy="auto-digitize-reason"
      >
        {{ outcome.reason }}
      </div>
      <div v-if="undoNote" class="c__muted" data-cy="auto-digitize-undo">
        {{ undoNote }}
      </div>
      <div v-if="outcome.status === 'stopped'" class="c__muted">
        Check the proposal in Axis Auto-place, then use Server Extraction.
      </div>
      <div v-if="outcome.extraction?.hasScores" class="c__muted">
        Review Points: N (next) / ⇧N (previous) steps through low-score points.
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { SdButton } from '@/presentation/ui'
import { ExtractionMethod } from '@/application/services/autoService/autoService'
import {
  AutoDigitizeOutcome,
  AutoDigitizeStep,
  runAutoDigitize,
} from '@/application/utils/autoDigitizeOperations'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { toErrorPayload } from '@/application/errors'

const METHOD_CHOICES: Record<
  ExtractionMethod,
  { label: string; title: string; name: string }
> = {
  lineformer: {
    label: 'Lines',
    title: 'LineFormer: for line charts',
    name: 'LineFormer',
  },
  markernet: {
    label: 'Markers',
    title: 'MarkerNet: for scatter / marker charts',
    name: 'MarkerNet',
  },
}

// INFO: Lines first — most figures are line charts, and it is the choice
// wpd-auto settled on as the default (wpd-auto PR #34, behaviour only).
const METHOD_ORDER: ExtractionMethod[] = ['lineformer', 'markernet']

type StepState = 'done' | 'failed' | 'skipped'

const STEP_MARKS: Record<StepState, string> = {
  done: '✓',
  failed: '✗',
  skipped: '–',
}

// INFO: after this long the progress line says the service may be busy,
// so a slow GPU queue does not look like a hang
const SLOW_AFTER_S = 20

// INFO: Auto digitize — Auto-place → apply → Server Extraction, in one go
// and one Undo step (autoDigitizeOperations.ts). The proposal of a run that
// stopped at the axes is left to Axis Auto-place, which already shows it.
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
      STEP_MARKS,
      // INFO: not reactive state, only aborted / cleared
      controller: null as AbortController | null,
      timer: null as ReturnType<typeof setInterval> | null,
    }
  },
  data() {
    return {
      chosenMethod: null as ExtractionMethod | null,
      isRunning: false,
      step: null as AutoDigitizeStep | null,
      elapsedS: 0,
      outcome: null as AutoDigitizeOutcome | null,
    }
  },
  computed: {
    allowedMethods(): ExtractionMethod[] {
      return METHOD_ORDER.filter((method) => this.autoFeatures.has(method))
    },
    isAvailable(): boolean {
      return this.autoFeatures.canAutoPlace && this.allowedMethods.length > 0
    },
    methodChoices(): {
      method: ExtractionMethod
      label: string
      title: string
    }[] {
      return this.allowedMethods.map((method) => ({
        method,
        label: METHOD_CHOICES[method].label,
        title: METHOD_CHOICES[method].title,
      }))
    },
    selectedMethod(): ExtractionMethod | null {
      const chosen = this.chosenMethod
      if (chosen && this.allowedMethods.includes(chosen)) return chosen
      return this.allowedMethods[0] ?? null
    },
    activeAxisSet(): AxisSetInterface {
      return this.axisSetRepository.activeAxisSet
    },
    canRun(): boolean {
      return (
        this.selectedMethod !== null &&
        !this.options.readonly &&
        !this.isRunning &&
        !this.datasetRepository.isViewAllMode &&
        Boolean(this.canvasHandler.uploadImageUrl)
      )
    },
    progressText(): string {
      const method = this.selectedMethod
      const what =
        this.step === 'extract' && method
          ? `2/2 Extracting with ${METHOD_CHOICES[method].name}…`
          : '1/2 Reading the axes…'
      const slow =
        this.elapsedS >= SLOW_AFTER_S ? ' The service may be busy.' : ''
      return `${what} ${this.elapsedS} s.${slow}`
    },
    resultSteps(): {
      name: AutoDigitizeStep
      title: string
      state: StepState
      text: string
    }[] {
      const outcome = this.outcome
      if (!outcome) return []
      const axesDone = outcome.appliedAxes.length > 0
      // INFO: a cancel is not a failure of the step it interrupted
      const stopped: StepState =
        outcome.status === 'cancelled' ? 'skipped' : 'failed'
      const extraction = outcome.extraction
      const extractDone = outcome.status === 'done'
      return [
        {
          name: 'axes',
          title: 'Axes',
          state: axesDone
            ? 'done'
            : outcome.stoppedAt === 'axes'
            ? stopped
            : 'skipped',
          text: axesDone
            ? 'applied (drag the axis markers to adjust)'
            : 'not applied',
        },
        {
          name: 'extract',
          title: `Drafts (${METHOD_CHOICES[outcome.method].name})`,
          state: extractDone
            ? 'done'
            : outcome.stoppedAt === 'extract'
            ? stopped
            : 'skipped',
          text:
            extractDone && extraction
              ? `${extraction.seriesCount} series, ${extraction.pointCount} points`
              : outcome.stoppedAt === 'extract'
              ? 'not made'
              : 'not run',
        },
      ]
    },
    undoNote(): string {
      const steps = this.outcome?.undoSteps ?? 0
      if (steps === 1) return 'Undo once goes back to before Auto digitize.'
      if (steps === 2) {
        return 'You edited during the run, so the drafts are their own Undo step: Undo twice (plus your edits) goes back to before Auto digitize.'
      }
      return ''
    },
  },
  created() {
    // INFO: a run is for the image it was started on; a new image cancels it
    // (the operations also drop a late answer on their own)
    this.$watch(
      () => this.canvasHandler.uploadImageUrl,
      () => this.controller?.abort(),
    )
  },
  beforeUnmount() {
    this.controller?.abort()
    this.stopTimer()
  },
  methods: {
    stopTimer() {
      if (this.timer !== null) clearInterval(this.timer)
      this.timer = null
    },
    cancel() {
      this.controller?.abort()
    },
    async run() {
      const method = this.selectedMethod
      if (!method || !this.canRun) return
      const controller = new AbortController()
      this.controller = controller
      this.isRunning = true
      this.outcome = null
      this.step = null
      this.elapsedS = 0
      this.stopTimer()
      this.timer = setInterval(() => {
        this.elapsedS += 1
      }, 1000)
      try {
        const outcome = await runAutoDigitize(this.ctx, {
          method,
          signal: controller.signal,
          onStep: (step) => {
            this.step = step
          },
        })
        this.outcome = outcome
        if (outcome.status === 'failed' && outcome.error) {
          this.$emit('error', toErrorPayload(outcome.error))
        }
      } finally {
        if (this.controller === controller) this.controller = null
        this.stopTimer()
        this.isRunning = false
      }
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
    padding: 2px 10px;
    border: 0;
    background: var(--sd-surface, #fff);
    color: var(--sd-text, rgba(0, 0, 0, 0.87));
    font: inherit;
    font-size: 0.8em;
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
  &__mark {
    display: inline-block;
    width: 1.2em;
    &--done {
      color: #2e7d32;
    }
    &--failed {
      color: #c62828;
    }
    &--skipped {
      color: #777;
    }
  }
  &__error {
    color: #c62828;
  }
  &__muted {
    color: #777;
  }
}
</style>
