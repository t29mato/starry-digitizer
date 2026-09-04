<template>
  <div>
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
              @update:model-value="
                axisSetRepository.activeAxisSet.xIsLogScale = Boolean($event)
              "
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
              @update:model-value="
                axisSetRepository.activeAxisSet.yIsLogScale = Boolean($event)
              "
              id="y-is-log"
              data-cy="y-is-log"
              :disabled="options.readonly"
            ></sd-checkbox>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="text-red mb-2">{{ errorMessage }}</p>
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

export default defineComponent({
  components: {
    SdButton,
    SdCheckbox,
    SdIcon,
    SdTextField,
    SdTooltip,
  },
  setup() {
    const { axisSetRepository, datasetRepository, canvasHandler } =
      useDigitizerContext()
    const options = useDigitizerOptions()
    return { axisSetRepository, datasetRepository, canvasHandler, options }
  },
  computed: {
    errorMessage(): string {
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
      axesToDisplayValAsExponential: [] as {
        axisSetId: number
        axisName: 'x1' | 'x2' | 'y1' | 'y2'
      }[],
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
      this.axisSetRepository.activeAxisSet.pointMode =
        Number(value) === POINT_MODE.FOUR_POINTS
          ? POINT_MODE.FOUR_POINTS
          : POINT_MODE.TWO_POINTS
    },
    selectAll(event: Event) {
      ;(event.target as HTMLInputElement).select()
    },
    parseExponentialValue(value: string): string {
      // Handle '^' notation as actual exponentiation (e.g., 2^3 = 8)
      if (value.includes('^')) {
        const parts = value.split('^')
        if (parts.length === 2) {
          const base = parseFloat(parts[0])
          const exponent = parseFloat(parts[1])
          if (!isNaN(base) && !isNaN(exponent)) {
            return String(Math.pow(base, exponent))
          }
        }
      }
      return value
    },
    isExponentialFormat(value: string): boolean {
      return (
        (value.includes('e+') || value.includes('^')) &&
        typeof parseFloat(this.parseExponentialValue(value)) === 'number'
      )
    },
    updateAxesToDisplayValAsExponential(
      axisName: 'x1' | 'x2' | 'y1' | 'y2',
      value: string,
    ): void {
      if (this.isExponentialFormat(value)) {
        this.axesToDisplayValAsExponential.push({
          axisSetId: this.axisSetRepository.activeAxisSetId,
          axisName,
        })
      } else {
        this.axesToDisplayValAsExponential =
          this.axesToDisplayValAsExponential.filter(
            (axis) =>
              !(
                axis.axisSetId === this.axisSetRepository.activeAxisSetId &&
                axis.axisName === axisName
              ),
          )
      }
    },
    setAxisSetValuesToDisplayValues(axisSet: AxisSetInterface): void {
      const axisNames = ['x1', 'x2', 'y1', 'y2'] as const

      axisNames.forEach((axisName) => {
        const displayKey = axisName as keyof typeof this.displayVal
        const axisValue = axisSet[axisName].value

        // Exponential表示の条件に基づき、表示値を設定
        this.displayVal[displayKey] = this.axesToDisplayValAsExponential.find(
          (axis) => axis.axisSetId === axisSet.id && axis.axisName === axisName,
        )
          ? axisValue.toPrecision(1)
          : String(axisValue)
      })
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
    setAxisValue(axisName: 'x1' | 'x2' | 'y1' | 'y2', value: number) {
      const activeAxisSet = this.axisSetRepository.activeAxisSet
      switch (axisName) {
        case 'x1':
          activeAxisSet.setX1Value(value)
          return
        case 'x2':
          activeAxisSet.setX2Value(value)
          return
        case 'y1':
          activeAxisSet.setY1Value(value)
          return
        case 'y2':
          activeAxisSet.setY2Value(value)
          return
      }
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

        AXIS_NAMES.forEach((axisName) => {
          const value = matches[axisName]
          if (value !== undefined) {
            this.setAxisValue(axisName, value)
          }
        })
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
      this.axisSetRepository.activeAxisSet.clearAxisCoords()
      this.canvasHandler.setManualMode(MANUAL_MODE.UNSET)
    },
  },
  watch: {
    'displayVal.x1'(value: string) {
      this.updateAxesToDisplayValAsExponential('x1', value)
      this.axisSetRepository.activeAxisSet.setX1Value(
        parseFloat(this.parseExponentialValue(value)),
      )
    },
    'displayVal.x2'(value: string) {
      this.updateAxesToDisplayValAsExponential('x2', value)
      this.axisSetRepository.activeAxisSet.setX2Value(
        parseFloat(this.parseExponentialValue(value)),
      )
    },
    'displayVal.y1'(value: string) {
      this.updateAxesToDisplayValAsExponential('y1', value)
      this.axisSetRepository.activeAxisSet.setY1Value(
        parseFloat(this.parseExponentialValue(value)),
      )
    },
    'displayVal.y2'(value: string) {
      this.updateAxesToDisplayValAsExponential('y2', value)
      this.axisSetRepository.activeAxisSet.setY2Value(
        parseFloat(this.parseExponentialValue(value)),
      )
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
      if (!isNaN(newValue)) {
        this.displayVal.x1 = String(newValue)
      }
    },
    'axisSetRepository.activeAxisSet.x2.value'(newValue: number) {
      if (!isNaN(newValue)) {
        this.displayVal.x2 = String(newValue)
      }
    },
    'axisSetRepository.activeAxisSet.y1.value'(newValue: number) {
      if (!isNaN(newValue)) {
        this.displayVal.y1 = String(newValue)
      }
    },
    'axisSetRepository.activeAxisSet.y2.value'(newValue: number) {
      if (!isNaN(newValue)) {
        this.displayVal.y2 = String(newValue)
      }
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
    }

    &__hint {
      display: block;
      padding: 0 2px 0 6px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
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
        font-size: 0.75rem;
        font-weight: 500;
      }
    }
  }
}
</style>
