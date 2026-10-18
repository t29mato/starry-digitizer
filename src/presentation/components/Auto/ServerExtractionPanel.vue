<template>
  <!-- INFO: nothing at all unless the backend allows at least one method
       (board P5): to a user it does not allow, the panel does not exist. -->
  <div
    v-if="autoFeatures.canExtract"
    class="sd-panel"
    data-cy="server-extraction"
  >
    <div class="d-flex align-center mb-1">
      <h4 class="mb-0">Server Extraction</h4>
      <sd-button
        class="ml-3"
        size="small"
        color="primary"
        data-cy="server-extraction-run"
        :disabled="!canExtract"
        @click="extract"
        >{{ isExtracting ? 'Extract…' : 'Extract' }}</sd-button
      >
    </div>
    <sd-select
      class="mb-2"
      data-cy="server-extraction-method"
      prefix="Method:"
      :model-value="selectedMethod ?? ''"
      :items="methodItems"
      :disabled="isExtracting"
      @update:model-value="setMethod"
    ></sd-select>
    <div class="d-flex align-end flex-wrap mb-1" style="gap: 8px">
      <sd-text-field
        data-cy="server-extraction-threshold"
        prefix="Threshold:"
        type="number"
        min="0"
        max="1"
        step="0.05"
        :model-value="threshold"
        :disabled="isExtracting"
        @update:model-value="setThreshold"
      ></sd-text-field>
      <sd-text-field
        v-if="selectedMethod === 'lineformer'"
        data-cy="server-extraction-interval"
        prefix="Interval:"
        suffix="px"
        type="number"
        min="1"
        max="100"
        step="1"
        :model-value="intervalPx"
        :disabled="isExtracting"
        @update:model-value="setIntervalPx"
      ></sd-text-field>
      <sd-text-field
        v-if="selectedMethod === 'markernet'"
        data-cy="server-extraction-series-threshold"
        prefix="Series distance:"
        type="number"
        :min="SERIES_THRESHOLD_MIN"
        :max="SERIES_THRESHOLD_MAX"
        step="0.05"
        :model-value="seriesThreshold"
        :disabled="isExtracting"
        @update:model-value="setSeriesThreshold"
      ></sd-text-field>
    </div>
    <div class="d-flex align-center flex-wrap mb-1" style="gap: 12px">
      <sd-checkbox
        v-if="selectedMethod === 'markernet'"
        data-cy="server-extraction-legend"
        label="Name series from the legend"
        :model-value="useLegend"
        :disabled="isExtracting"
        @update:model-value="useLegend = Boolean($event)"
      ></sd-checkbox>
      <sd-checkbox
        v-if="selectedMethod === 'lineformer'"
        data-cy="server-extraction-loops"
        label="Follow loops (both branches)"
        :model-value="followLoops"
        :disabled="isExtracting"
        @update:model-value="followLoops = Boolean($event)"
      ></sd-checkbox>
    </div>
    <div class="text-caption c__muted">{{ areaCaption }}</div>
    <div v-if="cancelMessage" class="text-caption c__muted">
      {{ cancelMessage }}
    </div>
    <div v-else-if="errorMessage" class="text-caption c__error">
      {{ errorMessage }}
    </div>
    <div v-else-if="resultMessage" class="text-caption">
      {{ resultMessage }}
      <div v-if="hasScores" class="c__muted">
        Review Points: N (next) / ⇧N (previous) steps through low-score points.
      </div>
    </div>
    <div class="text-caption c__muted c__licence">{{ licenceNote }}</div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { SdButton, SdCheckbox, SdSelect, SdTextField } from '@/presentation/ui'
import {
  EXTRACTION_METHODS,
  ExtractionMethod,
} from '@/application/services/autoService/autoService'
import { runServerExtraction } from '@/application/utils/serverExtractionOperations'
import { isImageChangedError } from '@/application/utils/autoFeatureOperations'
import { DigitizerError, toErrorPayload } from '@/application/errors'

// INFO: the backend's own defaults (backend README, method table), so an
// untouched panel asks for exactly what a bare API call would
const DEFAULT_THRESHOLD: Record<ExtractionMethod, number> = {
  markernet: 0.4,
  lineformer: 0.3,
}
const DEFAULT_INTERVAL_PX = 10
// INFO: wpd-auto backend (MIT) MarkerNet `series_threshold` (the distance at
// which markers are grouped into one series; default 0.5, range 0.05–5) and
// `legend` (default 1 = name series from the legend), LineFormer `loops`
// (default 0; 1 = trace each line along the curve, both branches of a
// hysteresis loop). These three are sent ONLY when they differ from the
// backend default, so an untouched panel sends exactly what it sent before
// they were on screen.
const DEFAULT_SERIES_THRESHOLD = 0.5
const SERIES_THRESHOLD_MIN = 0.05
const SERIES_THRESHOLD_MAX = 5

const METHOD_TITLES: Record<ExtractionMethod, string> = {
  markernet: 'MarkerNet (markers)',
  lineformer: 'LineFormer (lines)',
}

// INFO: the backend README requires these lines wherever the methods are
// offered: the MarkerNet weights are non-commercial, LineFormer has no
// published licence at all.
const LICENCE_NOTES: Record<ExtractionMethod, string> = {
  markernet: 'MarkerNet weights: non-commercial use only.',
  lineformer:
    'LineFormer (Lal et al., ICDAR 2023). The code and weights have no published licence; used here internally at NIMS for non-commercial research only.',
}

// INFO: Server Extraction (board P2). The backend returns pixels only; each
// series becomes a draft dataset whose values come from this digitizer's
// own axis calibration. One Extract is one undo step (board P3).
// docs/design/auto-service.md.
export default defineComponent({
  components: { SdButton, SdCheckbox, SdSelect, SdTextField },
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
      SERIES_THRESHOLD_MIN,
      SERIES_THRESHOLD_MAX,
      // INFO: the running Extract's; not reactive state, only aborted
      controller: null as AbortController | null,
    }
  },
  data() {
    return {
      // INFO: null = "the first allowed method"; the allowed list can change
      // when the capabilities answer arrives after mount
      chosenMethod: null as ExtractionMethod | null,
      thresholds: { ...DEFAULT_THRESHOLD },
      intervalPx: DEFAULT_INTERVAL_PX,
      seriesThreshold: DEFAULT_SERIES_THRESHOLD,
      useLegend: true,
      followLoops: false,
      isExtracting: false,
      errorMessage: '',
      cancelMessage: '',
      resultMessage: '',
      hasScores: false,
    }
  },
  computed: {
    allowedMethods(): ExtractionMethod[] {
      return EXTRACTION_METHODS.filter((method) =>
        this.autoFeatures.has(method),
      )
    },
    methodItems(): { title: string; value: string }[] {
      return this.allowedMethods.map((method) => ({
        title: METHOD_TITLES[method],
        value: method,
      }))
    },
    selectedMethod(): ExtractionMethod | null {
      const chosen = this.chosenMethod
      if (chosen && this.allowedMethods.includes(chosen)) return chosen
      return this.allowedMethods[0] ?? null
    },
    threshold(): number {
      return this.selectedMethod ? this.thresholds[this.selectedMethod] : 0
    },
    canExtract(): boolean {
      return (
        this.selectedMethod !== null &&
        !this.options.readonly &&
        !this.datasetRepository.isViewAllMode &&
        !this.isExtracting &&
        Boolean(this.canvasHandler.uploadImageUrl)
      )
    },
    areaCaption(): string {
      return this.axisSetRepository.activeAxisSet.plotArea
        ? 'Area: plot area'
        : 'Area: whole image'
    },
    licenceNote(): string {
      return this.selectedMethod ? LICENCE_NOTES[this.selectedMethod] : ''
    },
  },
  created() {
    // INFO: an answer is for the image it was asked for; a new image (upload,
    // import, reset) cancels the running Extract — the operation also drops
    // a late answer on its own, this just stops the request early
    this.$watch(
      () => this.canvasHandler.uploadImageUrl,
      () => this.controller?.abort(),
    )
  },
  beforeUnmount() {
    this.controller?.abort()
  },
  methods: {
    setMethod(value: string | number) {
      const method = EXTRACTION_METHODS.find((m) => m === String(value))
      if (method) this.chosenMethod = method
    },
    setThreshold(value: string | number) {
      const parsed = parseFloat(String(value))
      if (!this.selectedMethod || isNaN(parsed)) return
      this.thresholds[this.selectedMethod] = Math.min(Math.max(parsed, 0), 1)
    },
    setIntervalPx(value: string | number) {
      const parsed = parseFloat(String(value))
      if (isNaN(parsed)) return
      this.intervalPx = Math.min(Math.max(Math.round(parsed), 1), 100)
    },
    setSeriesThreshold(value: string | number) {
      const parsed = parseFloat(String(value))
      if (isNaN(parsed)) return
      this.seriesThreshold = Math.min(
        Math.max(parsed, SERIES_THRESHOLD_MIN),
        SERIES_THRESHOLD_MAX,
      )
    },
    params(method: ExtractionMethod): Record<string, number> {
      const params: Record<string, number> = {
        threshold: this.thresholds[method],
      }
      if (method === 'markernet') {
        if (this.seriesThreshold !== DEFAULT_SERIES_THRESHOLD) {
          params.series_threshold = this.seriesThreshold
        }
        if (!this.useLegend) params.legend = 0
      }
      if (method === 'lineformer') {
        params.interval = this.intervalPx
        if (this.followLoops) params.loops = 1
      }
      return params
    },
    async extract() {
      const method = this.selectedMethod
      if (!method) return
      const controller = new AbortController()
      this.controller = controller
      this.isExtracting = true
      this.errorMessage = ''
      this.cancelMessage = ''
      this.resultMessage = ''
      this.hasScores = false
      try {
        const { result, replacedDraftCount } = await runServerExtraction(
          this.ctx,
          {
            method,
            params: this.params(method),
            signal: controller.signal,
          },
        )
        const points = result.series.reduce(
          (sum, series) => sum + series.points.length,
          0,
        )
        const count = result.series.length
        this.resultMessage =
          count === 0
            ? 'No points found.'
            : `${count} series, ${points} points → draft datasets` +
              (replacedDraftCount > 0
                ? ` (replaced ${replacedDraftCount} untouched draft${
                    replacedDraftCount === 1 ? '' : 's'
                  })`
                : '')
        this.hasScores = result.series.some((series) =>
          series.points.some((point) => point.score !== undefined),
        )
      } catch (e) {
        if (isImageChangedError(e)) {
          // INFO: not a failure — nothing to report to the host
          this.cancelMessage = 'Cancelled: the image changed.'
          return
        }
        const payload = toErrorPayload(
          DigitizerError.from(e, 'AUTO_SERVICE_FAILED'),
        )
        this.errorMessage = payload.message
        this.$emit('error', payload)
      } finally {
        if (this.controller === controller) this.controller = null
        this.isExtracting = false
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__error {
    color: #c62828;
  }
  &__muted {
    color: #777;
  }
  &__licence {
    margin-top: 4px;
    font-size: 0.75em;
  }
}
</style>
