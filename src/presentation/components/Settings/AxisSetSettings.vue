<template>
  <div>
    <table>
      <tbody>
        <tr>
          <td class="pl-0 pr-1">X</td>
          <td class="pl-0 pr-1">
            <v-text-field
              v-model="displayVal.x1"
              id="x1-value"
              type="number"
              hide-details
              label="x1"
              density="compact"
            >
              <div
                class="c__AxisSetRepository-settings__log-adjuster"
                v-if="axisSetRepository.activeAxisSet.xIsLogScale"
              >
                <button
                  size="x-small"
                  @click="updateDisplayValMultipliedByTen('x1')"
                  id="multiply-by-ten-x1"
                  icon
                >
                  x10
                </button>
                <button
                  id="divide-by-ten-x1"
                  size="x-small"
                  @click="updateDisplayValDividedByTen('x1')"
                  icon
                >
                  /10
                </button>
              </div>
            </v-text-field>
          </td>
          <td class="pl-0 pr-1">
            <v-text-field
              v-model="displayVal.x2"
              id="x2-value"
              type="number"
              hide-details
              label="x2"
              density="compact"
            >
              <div
                class="c__AxisSetRepository-settings__log-adjuster"
                v-if="axisSetRepository.activeAxisSet.xIsLogScale"
              >
                <button
                  id="multiply-by-ten-x2"
                  size="x-small"
                  @click="updateDisplayValMultipliedByTen('x2')"
                  icon
                >
                  x10
                </button>
                <button
                  id="divide-by-ten-x2"
                  size="x-small"
                  @click="updateDisplayValDividedByTen('x2')"
                  icon
                >
                  /10
                </button>
              </div>
            </v-text-field>
          </td>
          <td>
            <v-checkbox
              color="primary"
              v-model="axisSetRepository.activeAxisSet.xIsLogScale"
              id="x-is-log"
              hide-details
              density="compact"
            ></v-checkbox>
            <span class="c__AxisSetRepository-settings__hint">Log</span>
          </td>
        </tr>
        <tr>
          <td class="pl-0 pr-1">Y</td>
          <td class="pl-0 pr-1">
            <v-text-field
              v-model="displayVal.y1"
              id="y1-value"
              type="number"
              hide-details
              label="y1"
              density="compact"
            >
              <div
                class="c__AxisSetRepository-settings__log-adjuster"
                v-if="axisSetRepository.activeAxisSet.yIsLogScale"
              >
                <button
                  id="multiply-by-ten-y1"
                  size="x-small"
                  @click="updateDisplayValMultipliedByTen('y1')"
                  icon
                >
                  x10
                </button>
                <button
                  id="divide-by-ten-y1"
                  size="x-small"
                  @click="updateDisplayValDividedByTen('y1')"
                  icon
                >
                  /10
                </button>
              </div>
            </v-text-field>
          </td>
          <td class="pl-0 pr-1">
            <v-text-field
              v-model="displayVal.y2"
              id="y2-value"
              type="number"
              hide-details
              label="y2"
              density="compact"
            >
              <div
                class="c__AxisSetRepository-settings__log-adjuster"
                v-if="axisSetRepository.activeAxisSet.yIsLogScale"
              >
                <button
                  id="multiply-by-ten-y2"
                  size="x-small"
                  @click="updateDisplayValMultipliedByTen('y2')"
                  icon
                >
                  x10
                </button>
                <button
                  id="divide-by-ten-y2"
                  size="x-small"
                  @click="updateDisplayValDividedByTen('y2')"
                  icon
                >
                  /10
                </button>
              </div>
            </v-text-field>
          </td>
          <td>
            <v-checkbox
              color="primary"
              v-model="axisSetRepository.activeAxisSet.yIsLogScale"
              id="y-is-log"
              density="compact"
              hide-details
            ></v-checkbox>
            <span class="c__AxisSetRepository-settings__hint">Log</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="text-red mb-5">{{ errorMessage }}</p>
    <div class="mb-5">
      <h5 class="c__AxisSetRepository-settings__point-mode__label">
        Define the axes by the coordinates of:
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
        v-if="pointModeIsFourPoints"
        v-model="axisSetRepository.activeAxisSet.considerGraphTilt"
        label="Consider graph tilt"
        density="compact"
        color="primary"
      ></v-checkbox>
      <v-checkbox
        label="Show axes marker"
        density="compact"
        color="primary"
        v-model="axisSetRepository.activeAxisSet.isVisible"
      ></v-checkbox>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { POINT_MODE } from '@/constants'

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
    pointModeIsFourPoints() {
      return (
        this.axisSetRepository.activeAxisSet.pointMode ===
        POINT_MODE.FOUR_POINTS
      )
    },
  },
  data() {
    return {
      axisSetRepository,
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
    }
  },
  created() {
    this.displayVal.x1 = String(this.x1Axis.value)
    this.displayVal.x2 = String(this.x2Axis.value)
    this.displayVal.y1 = String(this.y1Axis.value)
    this.displayVal.y2 = String(this.y2Axis.value)
  },
  methods: {
    updateDisplayValMultipliedByTen(axisName: 'x1' | 'x2' | 'y1' | 'y2'): void {
      this.displayVal[axisName] = this.getDisplayValMultipliedByTen(
        parseFloat(this.displayVal[axisName]),
      )
    },
    updateDisplayValDividedByTen(axisName: 'x1' | 'x2' | 'y1' | 'y2'): void {
      this.displayVal[axisName] = this.getDisplayValDividedByTen(
        parseFloat(this.displayVal[axisName]),
      )
    },
    getDisplayValMultipliedByTen(value: number): string {
      if (value === 0) {
        return '1'
      }
      return (value * 10).toPrecision(1)
    },
    getDisplayValDividedByTen(value: number): string {
      if (value === 0) {
        return '0.1'
      }
      return (value * 0.1).toPrecision(1)
    },
    isExponentialFormat(value: string): boolean {
      return value.includes('e+') && typeof parseFloat(value) === 'number'
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
  },
  watch: {
    'displayVal.x1'(value: string) {
      this.updateAxesToDisplayValAsExponential('x1', value)
      this.axisSetRepository.activeAxisSet.setX1Value(parseFloat(value))
    },
    'displayVal.x2'(value: string) {
      this.updateAxesToDisplayValAsExponential('x2', value)
      this.axisSetRepository.activeAxisSet.setX2Value(parseFloat(value))
    },
    'displayVal.y1'(value: string) {
      this.updateAxesToDisplayValAsExponential('y1', value)
      this.axisSetRepository.activeAxisSet.setY1Value(parseFloat(value))
    },
    'displayVal.y2'(value: string) {
      this.updateAxesToDisplayValAsExponential('y2', value)
      this.axisSetRepository.activeAxisSet.setY2Value(parseFloat(value))
    },
    'axisSetRepository.activeAxisSet'(axisSet: AxisSetInterface) {
      this.setAxisSetValuesToDisplayValues(axisSet)
    },
    'axisSetRepository.activeAxisSet.pointMode'(newPointMode: number) {
      if (newPointMode === POINT_MODE.TWO_POINTS) {
        this.axisSetRepository.activeAxisSet.considerGraphTilt = false
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
    }

    &__log-adjuster {
      position: absolute;
      right: 2px;
      top: 4px;
      display: flex;
      gap: 4px;
      & > button {
        display: block;
        font-size: 0.5rem;
        padding: 0 4px;
        background-color: #444444;
        color: white;
        border-radius: 2px;
        box-shadow: 2px;
      }
    }

    &__point-mode {
      &__label {
        font-size: 0.75rem;
      }
    }
  }
}
</style>
