<template>
  <div>
    <table>
      <tbody>
        <tr>
          <td class="pl-0 pr-1" style="width: 42%">
            <v-text-field
              v-model="displayVal.x1"
              id="x1-value"
              type="text"
              prefix="x1: "
              hide-details
              density="compact"
              @click="$event.target.select()"
            >
            </v-text-field>
          </td>
          <td class="pl-0 pr-1" style="width: 42%">
            <v-text-field
              v-model="displayVal.x2"
              id="x2-value"
              type="text"
              prefix="x2: "
              hide-details
              density="compact"
              @click="$event.target.select()"
            >
            </v-text-field>
          </td>
          <td>
            <span class="c__AxisSetRepository-settings__hint">Log</span>
          </td>
          <td>
            <v-checkbox
              color="primary"
              v-model="axisSetRepository.activeAxisSet.xIsLogScale"
              id="x-is-log"
              hide-details
              density="compact"
            ></v-checkbox>
          </td>
        </tr>
        <tr>
          <td class="pl-0 pr-1">
            <v-text-field
              v-model="displayVal.y1"
              id="y1-value"
              prefix="y1: "
              type="text"
              hide-details
              density="compact"
              @click="$event.target.select()"
            >
            </v-text-field>
          </td>
          <td class="pl-0 pr-1">
            <v-text-field
              v-model="displayVal.y2"
              id="y2-value"
              prefix="y2: "
              type="text"
              hide-details
              density="compact"
              @click="$event.target.select()"
            >
            </v-text-field>
          </td>
          <td><span class="c__AxisSetRepository-settings__hint">Log</span></td>
          <td>
            <v-checkbox
              color="primary"
              v-model="axisSetRepository.activeAxisSet.yIsLogScale"
              id="y-is-log"
              density="compact"
              hide-details
            ></v-checkbox>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="text-red mb-2">{{ errorMessage }}</p>
    <div class="mb-2">
      <h5 class="c__AxisSetRepository-settings__point-mode__label">
        Calibration mode:
      </h5>
      <v-radio-group
        row
        v-model.number="axisSetRepository.activeAxisSet.pointMode"
        inline
        color="primary"
        hide-details
      >
        <v-radio
          label="2 Points"
          :value="0"
          :disabled="twoPointsRadioIsDisabled"
        ></v-radio>
        <v-radio
          label="4 Points"
          :value="1"
          :disabled="fourPointsRadioIsDisabled"
        ></v-radio>
      </v-radio-group>
      <v-checkbox
        label="Show axes marker"
        density="compact"
        hide-details
        color="primary"
        v-model="axisSetRepository.activeAxisSet.isVisible"
      ></v-checkbox>
      <div class="mt-2">
        <v-btn
          size="small"
          :disabled="!axisSetRepository.activeAxisSet.hasAtLeastOneAxis"
          @click="editAxes"
        >
          Edit Axes
        </v-btn>
        <v-btn
          size="small"
          class="ml-2"
          :disabled="!axisSetRepository.activeAxisSet.hasAtLeastOneAxis"
          @click="clearAxisSet"
        >
          Clear XY Axes
        </v-btn>
        <v-btn
          size="small"
          class="ml-2"
          :disabled="!axisSetRepository.activeAxisSet.hasAtLeastOneAxis"
          :loading="ocrIsRunning"
          @click="handleOnClickAutoDetectAxisValues"
          title="OCR the numbers near each axis marker and fill in its value"
        >
          Auto-fill values (OCR)
        </v-btn>
        <v-tooltip location="top">
          <template v-slot:activator="{ props }">
            <v-icon v-bind="props" color="warning" size="small" class="ml-1">
              mdi-information-outline
            </v-icon>
          </template>
          {{ ocrWarningMessage }}
        </v-tooltip>
      </div>
      <p v-if="ocrErrorMessage" class="text-red mt-1">
        {{ ocrErrorMessage }}
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import {
  axisSetRepository,
  datasetRepository,
} from '@/instanceStore/repositoryInatances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { POINT_MODE, MANUAL_MODE } from '@/constants'
import { AxisOcrReader } from '@/application/services/axisOcr/axisOcrReader'
import {
  AXIS_NAMES,
  matchOcrWordsToAxisValues,
} from '@/application/utils/axisOcrMatcher'

// INFO: docs/design/auto-axis-detection-design.md — a single reader
// instance is reused across clicks (readWords() is stateless per-call, no
// need to route this through instanceStore/applicationServiceInstances.ts
// for a component-local, dependency-free wrapper).
const axisOcrReader = new AxisOcrReader()

export default defineComponent({
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
  },
  data() {
    return {
      axisSetRepository,
      datasetRepository,
      canvasHandler,
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
    &__hint {
      display: block;
      font-size: 0.75rem;
      transform: translateY(-8px);
      padding-top: 13px;
      vertical-align: middle;
    }

    &__point-mode {
      &__label {
        font-size: 0.75rem;
      }
    }
  }
}
</style>
