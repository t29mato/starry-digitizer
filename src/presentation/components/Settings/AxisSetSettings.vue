<template>
  <div class="sd-panel">
    <!-- INFO: `sd-panel` is what makes this panel style itself, so a host
         composing the panels needs no `.starry-digitizer` wrapper around
         them; inside one it is a no-op. src/presentation/styles/base.scss. -->
    <table class="c__AxisSetRepository-settings__table">
      <tbody>
        <tr>
          <td class="pl-0 pr-1" style="width: 42%">
            <sd-text-field
              :model-value="displayVal.x1"
              @update:model-value="displayVal.x1 = String($event)"
              id="x1-value"
              data-cy="x1-value"
              prefix="x1:"
              :aria-invalid="expressionErrors.x1 ? 'true' : undefined"
              :class="{
                'c__AxisSetRepository-settings__invalid': expressionErrors.x1,
              }"
              :disabled="options.readonly"
              type="text"
              @click="selectAll"
            >
            </sd-text-field>
          </td>
          <td class="pl-0 pr-1" style="width: 42%">
            <sd-text-field
              :model-value="displayVal.x2"
              @update:model-value="displayVal.x2 = String($event)"
              id="x2-value"
              data-cy="x2-value"
              prefix="x2:"
              :aria-invalid="expressionErrors.x2 ? 'true' : undefined"
              :class="{
                'c__AxisSetRepository-settings__invalid': expressionErrors.x2,
              }"
              :disabled="options.readonly"
              type="text"
              @click="selectAll"
            >
            </sd-text-field>
          </td>
          <td>
            <span class="c__AxisSetRepository-settings__hint">Log</span>
          </td>
          <td>
            <sd-checkbox
              :model-value="axisSetRepository.activeAxisSet.xIsLogScale"
              @update:model-value="setXIsLogScale(Boolean($event))"
              id="x-is-log"
              data-cy="x-is-log"
              :disabled="options.readonly"
            ></sd-checkbox>
          </td>
        </tr>
        <tr>
          <td class="pl-0 pr-1">
            <sd-text-field
              :model-value="displayVal.y1"
              @update:model-value="displayVal.y1 = String($event)"
              id="y1-value"
              data-cy="y1-value"
              prefix="y1:"
              :aria-invalid="expressionErrors.y1 ? 'true' : undefined"
              :class="{
                'c__AxisSetRepository-settings__invalid': expressionErrors.y1,
              }"
              :disabled="options.readonly"
              type="text"
              @click="selectAll"
            >
            </sd-text-field>
          </td>
          <td class="pl-0 pr-1">
            <sd-text-field
              :model-value="displayVal.y2"
              @update:model-value="displayVal.y2 = String($event)"
              id="y2-value"
              data-cy="y2-value"
              prefix="y2:"
              :aria-invalid="expressionErrors.y2 ? 'true' : undefined"
              :class="{
                'c__AxisSetRepository-settings__invalid': expressionErrors.y2,
              }"
              :disabled="options.readonly"
              type="text"
              @click="selectAll"
            >
            </sd-text-field>
          </td>
          <td><span class="c__AxisSetRepository-settings__hint">Log</span></td>
          <td>
            <sd-checkbox
              :model-value="axisSetRepository.activeAxisSet.yIsLogScale"
              @update:model-value="setYIsLogScale(Boolean($event))"
              id="y-is-log"
              data-cy="y-is-log"
              :disabled="options.readonly"
            ></sd-checkbox>
          </td>
        </tr>
      </tbody>
    </table>
    <!-- INFO: the fields take expressions (10^-3, 2×10⁵, 1/300, pi…), see
         calibrationExpression.ts. What a non-plain entry evaluates to is
         shown so the person can check it; an invalid one is named here. -->
    <p
      v-if="expressionNotes"
      class="c__AxisSetRepository-settings__note mb-1"
      data-cy="axis-value-notes"
    >
      {{ expressionNotes }}
    </p>
    <p class="text-red mb-2" data-cy="axis-value-error">{{ errorMessage }}</p>
    <div class="mb-2">
      <h5 class="c__AxisSetRepository-settings__point-mode__label">
        Calibration mode:
      </h5>
      <!-- INFO: the radios are built from SdCheckbox (type="radio") rather
           than SdRadioGroup so each <input> can carry its own data-cy hook;
           SdRadioGroup takes its radios as data and has no per-option attr
           passthrough. The DOM is otherwise identical (label.sd-check). -->
      <div
        class="c__AxisSetRepository-settings__point-mode"
        data-cy="calibration-mode"
      >
        <sd-checkbox
          v-for="option in pointModeOptions"
          :key="option.value"
          type="radio"
          :name="calibrationModeName"
          :value="option.value"
          :label="option.label"
          :data-cy="option.dataCy"
          :data-value="option.value"
          :disabled="option.disabled"
          :model-value="axisSetRepository.activeAxisSet.pointMode"
          @update:model-value="setPointMode"
        ></sd-checkbox>
      </div>
      <sd-checkbox
        label="Show axes marker"
        data-cy="show-axes-marker"
        :model-value="axisSetRepository.activeAxisSet.isVisible"
        @update:model-value="
          axisSetRepository.activeAxisSet.isVisible = Boolean($event)
        "
      ></sd-checkbox>
      <div class="mt-2 d-flex align-center flex-wrap">
        <sd-button
          size="small"
          :disabled="
            options.readonly ||
            !axisSetRepository.activeAxisSet.hasAtLeastOneAxis
          "
          @click="editAxes"
        >
          Edit Axes
        </sd-button>
        <sd-button
          size="small"
          class="ml-2"
          :disabled="
            options.readonly ||
            !axisSetRepository.activeAxisSet.hasAtLeastOneAxis
          "
          @click="clearAxisSet"
        >
          Clear XY Axes
        </sd-button>
        <!-- INFO: features.axisOcr hides the whole OCR affordance, not just
             the button: the accuracy hint and the error line only ever say
             something about a run that can no longer be started. Hiding the
             button is also what keeps tesseract.js out of the bundle — it is
             dynamically imported from the click handler and nothing else
             reaches AxisOcrReader (see axisOcrReader.ts). -->
        <template v-if="options.features.axisOcr">
          <sd-button
            size="small"
            class="ml-2"
            :disabled="
              options.readonly ||
              !axisSetRepository.activeAxisSet.hasAtLeastOneAxis ||
              ocrIsRunning
            "
            @click="handleOnClickAutoDetectAxisValues"
            title="OCR the numbers near each axis marker and fill in its value"
          >
            {{
              ocrIsRunning
                ? 'Auto-fill values (OCR)…'
                : 'Auto-fill values (OCR)'
            }}
          </sd-button>
          <sd-tooltip :text="ocrWarningMessage" class="ml-1">
            <sd-icon
              class="c__AxisSetRepository-settings__ocr-warning"
              :path="mdiInformationOutline"
              :size="16"
              tabindex="0"
              :title="ocrWarningMessage"
            />
          </sd-tooltip>
        </template>
      </div>
      <p
        v-if="options.features.axisOcr && ocrErrorMessage"
        class="text-red mt-1"
      >
        {{ ocrErrorMessage }}
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { POINT_MODE, MANUAL_MODE } from '@/constants'
import { AxisOcrReader } from '@/application/services/axisOcr/axisOcrReader'
import {
  AXIS_NAMES,
  matchOcrWordsToAxisValues,
} from '@/application/utils/axisOcrMatcher'
// INFO: the axis-set use cases carry the undo snapshot, so "Clear Axes",
// "Auto-detect" and the log-scale / calibration-mode switches stay undoable
// whoever asks for them — a host replacing this panel included. The snapshot
// belongs where the mutation is, not where the click is; see
// axisSetOperations.ts.
import {
  clearAxisSetCoords,
  setAxisValues,
  setLogScale,
  setPointMode as setPointModeOperation,
} from '@/application/utils/axisSetOperations'
import {
  evaluateCalibrationExpression,
  isPlainNumber,
  parseCalibrationValue,
} from '@/application/utils/calibrationExpression'
import { mdiInformationOutline } from '@mdi/js'
import {
  SdButton,
  SdCheckbox,
  SdIcon,
  SdTextField,
  SdTooltip,
} from '@/presentation/ui'
import type { SdRadioOption } from '@/presentation/ui'

// INFO: radio inputs with the same `name` form ONE group per document, not per
// component, so two <StarryDigitizer> instances on a page would fight over the
// calibration mode: picking "4 Points" in one clears the other's selection.
// The engine has no DOM-id lookups left for exactly this reason (spec R7), and
// this attribute was the last thing tying the panels to a document-wide name.
// Vue 3.5's useId() would do this, but the supported peer range starts at 3.3.
let calibrationModeGroupSeq = 0

const AXIS_VALUE_NAMES = ['x1', 'x2', 'y1', 'y2'] as const
type AxisValueName = (typeof AXIS_VALUE_NAMES)[number]

export default defineComponent({
  components: {
    SdButton,
    SdCheckbox,
    SdIcon,
    SdTextField,
    SdTooltip,
  },
  setup() {
    const ctx = useDigitizerContext()
    const { axisSetRepository, datasetRepository, canvasHandler } = ctx
    const options = useDigitizerOptions()
    return { ctx, axisSetRepository, datasetRepository, canvasHandler, options }
  },
  computed: {
    expressionErrors(): Record<AxisValueName, string> {
      const errors = { x1: '', x2: '', y1: '', y2: '' }
      for (const name of AXIS_VALUE_NAMES) {
        const text = this.displayVal[name]
        // INFO: an empty field is "not entered yet", not a mistake.
        if (text.trim() === '') continue
        const result = evaluateCalibrationExpression(text)
        if (!result.ok) errors[name] = result.error
      }
      return errors
    },
    expressionNotes(): string {
      return AXIS_VALUE_NAMES.filter((name) => {
        const text = this.displayVal[name]
        return (
          text.trim() !== '' &&
          !isPlainNumber(text) &&
          !this.expressionErrors[name]
        )
      })
        .map(
          (name) => `${name} = ${parseCalibrationValue(this.displayVal[name])}`,
        )
        .join(', ')
    },
    errorMessage(): string {
      const invalid = AXIS_VALUE_NAMES.find(
        (name) => this.expressionErrors[name],
      )
      if (invalid) {
        return `${invalid}: ${this.expressionErrors[invalid]}`
      }
      if (this.axisSetRepository.activeAxisSet.xIsLogScale) {
        if (this.x1Axis.value === 0 || this.x2Axis.value === 0) {
          return 'x1 or x2 should not be 0'
        }
      } else {
        if (this.x1Axis.value === this.x2Axis.value) {
          return 'x1 and x2 should not be same value'
        }
      }
      if (this.axisSetRepository.activeAxisSet.yIsLogScale) {
        if (this.y1Axis.value === 0 || this.y2Axis.value === 0) {
          return 'y1 or y2 should not be 0'
        }
      } else {
        if (this.y1Axis.value === this.y2Axis.value) {
          return 'y1 and y2 should not be same value'
        }
      }
      return ''
    },
    x1Axis() {
      return this.axisSetRepository.activeAxisSet.x1
    },
    x2Axis() {
      return this.axisSetRepository.activeAxisSet.x2
    },
    y1Axis() {
      return this.axisSetRepository.activeAxisSet.y1
    },
    y2Axis() {
      return this.axisSetRepository.activeAxisSet.y2
    },
    twoPointsRadioIsDisabled() {
      const activeAxisSet = this.axisSetRepository.activeAxisSet
      return (
        activeAxisSet.pointMode === POINT_MODE.FOUR_POINTS &&
        activeAxisSet.hasAtLeastOneAxis
      )
    },
    fourPointsRadioIsDisabled() {
      const activeAxisSet = this.axisSetRepository.activeAxisSet
      return (
        activeAxisSet.pointMode === POINT_MODE.TWO_POINTS &&
        activeAxisSet.hasAtLeastOneAxis
      )
    },
    // INFO: SdRadioGroup takes its radios as data instead of child elements,
    // so the per-option disabling lives here.
    pointModeOptions(): (SdRadioOption & { dataCy: string })[] {
      return [
        {
          label: '2 Points',
          value: POINT_MODE.TWO_POINTS,
          dataCy: 'calibration-mode-2',
          disabled: this.options.readonly || this.twoPointsRadioIsDisabled,
        },
        {
          label: '4 Points',
          value: POINT_MODE.FOUR_POINTS,
          dataCy: 'calibration-mode-4',
          disabled: this.options.readonly || this.fourPointsRadioIsDisabled,
        },
      ]
    },
  },
  data() {
    return {
      calibrationModeName: `calibration-mode-${(calibrationModeGroupSeq += 1)}`,
      mdiInformationOutline,
      //NOTE: initialize axis values as string because it sometimes is displayed like '1e+10'
      displayVal: {
        x1: '',
        x2: '',
        y1: '',
        y2: '',
      },
      // INFO: the text typed into a field when it was an expression rather
      // than a plain number, per axis set, so switching axis sets and back
      // shows `10^-3` again instead of `0.001`. Keyed `${axisSetId}:${name}`.
      typedExpressions: {} as Record<string, string>,
      ocrIsRunning: false,
      ocrErrorMessage: '',
      // INFO: OCR accuracy check (real-chart-bench, 41 verified figures,
      // 2026-08-30) found ~78% per-axis accuracy but a recurring failure
      // mode: decimal points getting dropped (e.g. "0.4" read as "4").
      // Shown as a standing hint icon next to the button (always visible,
      // not just after a run) rather than silently trusting the numbers.
      ocrWarningMessage:
        'Auto-filled values may be inaccurate — decimal points are sometimes misread (e.g. "0.4" detected as "4"). Please double-check each value before proceeding.',
    }
  },
  created() {
    this.displayVal.x1 = String(this.x1Axis.value)
    this.displayVal.x2 = String(this.x2Axis.value)
    this.displayVal.y1 = String(this.y1Axis.value)
    this.displayVal.y2 = String(this.y2Axis.value)
  },
  methods: {
    setPointMode(value: string | number | boolean) {
      setPointModeOperation(
        this.ctx,
        Number(value) === POINT_MODE.FOUR_POINTS
          ? POINT_MODE.FOUR_POINTS
          : POINT_MODE.TWO_POINTS,
      )
    },
    setXIsLogScale(value: boolean) {
      setLogScale(this.ctx, 'x', value)
    },
    setYIsLogScale(value: boolean) {
      setLogScale(this.ctx, 'y', value)
    },
    selectAll(event: Event) {
      ;(event.target as HTMLInputElement).select()
    },
    typedExpressionKey(axisSetId: number, axisName: AxisValueName): string {
      return `${axisSetId}:${axisName}`
    },
    applyDisplayValue(axisName: AxisValueName, text: string): void {
      const key = this.typedExpressionKey(
        this.axisSetRepository.activeAxisSetId,
        axisName,
      )
      if (text.trim() !== '' && !isPlainNumber(text)) {
        this.typedExpressions[key] = text
      } else {
        delete this.typedExpressions[key]
      }
      // INFO: an invalid expression sets NaN (as an empty field always has),
      // so no point is computed from a value the field does not show. The
      // error itself is shown by `errorMessage`.
      const value = parseCalibrationValue(text)
      const axisSet = this.axisSetRepository.activeAxisSet
      if (axisName === 'x1') axisSet.setX1Value(value)
      else if (axisName === 'x2') axisSet.setX2Value(value)
      else if (axisName === 'y1') axisSet.setY1Value(value)
      else axisSet.setY2Value(value)
    },
    displayTextFor(
      axisSetId: number,
      axisName: AxisValueName,
      value: number,
    ): string {
      const typed =
        this.typedExpressions[this.typedExpressionKey(axisSetId, axisName)]
      return typed !== undefined && parseCalibrationValue(typed) === value
        ? typed
        : String(value)
    },
    showAxisValue(axisName: AxisValueName, value: number): void {
      // INFO: the value changed from outside the field (undo, OCR, a host
      // call, switching axis sets). Keep what the person typed when it
      // still means this value — otherwise typing `1/3` would be replaced
      // by `0.3333333333333333` on the spot and `1/30` could never be typed.
      // On an axis-set switch this watcher can run before the one on
      // `activeAxisSet`, so it looks up that set's typed expression itself.
      if (isNaN(value)) return
      if (parseCalibrationValue(this.displayVal[axisName]) === value) return
      this.displayVal[axisName] = this.displayTextFor(
        this.axisSetRepository.activeAxisSetId,
        axisName,
        value,
      )
    },
    setAxisSetValuesToDisplayValues(axisSet: AxisSetInterface): void {
      for (const axisName of AXIS_VALUE_NAMES) {
        this.displayVal[axisName] = this.displayTextFor(
          axisSet.id,
          axisName,
          axisSet[axisName].value,
        )
      }
    },
    exitViewAllModeIfNeeded() {
      if (this.datasetRepository.isViewAllMode) {
        // Exit View All Mode and activate the first dataset
        const firstDataset = this.datasetRepository.datasets[0]
        if (firstDataset) {
          this.datasetRepository.setActiveDataset(firstDataset.id)
        }
      }
    },
    editAxes() {
      this.exitViewAllModeIfNeeded()
      this.canvasHandler.setManualMode(MANUAL_MODE.UNSET)
    },
    async handleOnClickAutoDetectAxisValues() {
      this.ocrErrorMessage = ''

      if (!this.canvasHandler.imageElement) {
        this.ocrErrorMessage = 'No image is loaded.'
        return
      }

      this.ocrIsRunning = true
      try {
        const activeAxisSet = this.axisSetRepository.activeAxisSet
        const axisCoords = Object.fromEntries(
          AXIS_NAMES.map((axisName) => [
            axisName,
            activeAxisSet[axisName].coordIsFilled
              ? activeAxisSet[axisName].coord
              : undefined,
          ]),
        )

        // INFO: docs/design/auto-axis-detection-design.md — readWords() is
        // stateless per call (it creates and terminates its own worker), so
        // the reader is built here rather than kept around. Building it on
        // click also means options.assetBaseUrl is read at the moment the
        // host's value is final.
        const axisOcrReader = new AxisOcrReader(this.options.assetBaseUrl)
        const words = await axisOcrReader.readWords(
          this.canvasHandler.imageElement,
        )
        const matches = matchOcrWordsToAxisValues(words, axisCoords)

        if (Object.keys(matches).length === 0) {
          this.ocrErrorMessage =
            'No axis labels were recognized near the axis markers. Please enter the values manually.'
          return
        }

        // INFO: one capture for the whole batch — the user pressed one
        // button, so ⌘Z has to put all of the values back at once. The
        // detection has already run at this point, so a failed or empty read
        // leaves nothing on the undo stack (same order rule as extraction).
        setAxisValues(this.ctx, matches)
      } catch (e) {
        console.error('failed to auto-detect axis values', { cause: e })
        this.ocrErrorMessage =
          'Auto-detection failed. Please enter the values manually.'
      } finally {
        this.ocrIsRunning = false
      }
    },
    clearAxisSet() {
      this.exitViewAllModeIfNeeded()
      // INFO: the coordinates were placed by clicking the figure and cannot be
      // re-derived, so this goes through the use case that captures them.
      clearAxisSetCoords(this.ctx)
      this.canvasHandler.setManualMode(MANUAL_MODE.UNSET)
    },
  },
  watch: {
    'displayVal.x1'(value: string) {
      this.applyDisplayValue('x1', value)
    },
    'displayVal.x2'(value: string) {
      this.applyDisplayValue('x2', value)
    },
    'displayVal.y1'(value: string) {
      this.applyDisplayValue('y1', value)
    },
    'displayVal.y2'(value: string) {
      this.applyDisplayValue('y2', value)
    },
    'axisSetRepository.activeAxisSet'(axisSet: AxisSetInterface) {
      this.setAxisSetValuesToDisplayValues(axisSet)
    },
    'axisSetRepository.activeAxisSet.pointMode'(newPointMode: number) {
      if (newPointMode === POINT_MODE.TWO_POINTS) {
        this.axisSetRepository.activeAxisSet.considerGraphTilt = false
      }
    },
    // Watch for individual axis value changes to update displayVal
    'axisSetRepository.activeAxisSet.x1.value'(newValue: number) {
      this.showAxisValue('x1', newValue)
    },
    'axisSetRepository.activeAxisSet.x2.value'(newValue: number) {
      this.showAxisValue('x2', newValue)
    },
    'axisSetRepository.activeAxisSet.y1.value'(newValue: number) {
      this.showAxisValue('y1', newValue)
    },
    'axisSetRepository.activeAxisSet.y2.value'(newValue: number) {
      this.showAxisValue('y2', newValue)
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__AxisSetRepository-settings {
    &__table {
      width: 100%;
      border-spacing: 0;
      td {
        padding: 2px 0;
        vertical-align: middle;
      }
      // INFO: the class lands on SdTextField's <input> (attrs pass through),
      // which carries no scope id of this component, hence :deep.
      :deep(.c__AxisSetRepository-settings__invalid) {
        outline: 1px solid var(--sd-error, #e53935);
      }
    }

    &__hint {
      display: block;
      padding: 0 2px 0 6px;
      font-size: 0.75em;
      font-weight: 500;
      white-space: nowrap;
    }

    &__note {
      font-size: 0.75em;
      color: var(--sd-text-medium, rgba(0, 0, 0, 0.6));
      overflow-wrap: anywhere;
    }

    &__ocr-warning {
      color: var(--sd-warning, #fb8c00);
      cursor: help;
    }

    &__point-mode {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;

      &__label {
        margin: 6px 0 2px;
        font-size: 0.75em;
        font-weight: 500;
      }
    }
  }
}
</style>
