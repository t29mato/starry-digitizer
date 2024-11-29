<template>
  <div>
    <table>
      <tbody>
        <tr>
          <td class="pl-0 pr-1">X</td>
          <td class="pl-0 pr-1">
            <v-text-field
              :model-value="axisValuesDisplayed.x1"
              id="x1-value"
              type="number"
              hide-details
              label="x1"
              density="compact"
              @update:model-value="
                (val: string) => {
                  onInputAxisVal('x1', val)
                }
              "
            >
              <div
                class="c__AxisSetRepository-settings__log-adjuster"
                v-if="axisSetRepository.activeAxisSet.xIsLogScale"
              >
                <button
                  size="x-small"
                  @click="updateDisplayedValMultipliedByTen('x1')"
                  id="multiply-by-ten-x1"
                  icon
                >
                  x10
                </button>
                <button
                  id="divide-by-ten-x1"
                  size="x-small"
                  @click="updateDisplayedValDividedByTen('x1')"
                  icon
                >
                  /10
                </button>
              </div>
            </v-text-field>
          </td>
          <td class="pl-0 pr-1">
            <v-text-field
              :model-value="axisValuesDisplayed.x2"
              id="x2-value"
              type="number"
              hide-details
              label="x2"
              density="compact"
              @update:model-value="
                (val: string) => {
                  onInputAxisVal('x2', val)
                }
              "
            >
              <div
                class="c__AxisSetRepository-settings__log-adjuster"
                v-if="axisSetRepository.activeAxisSet.xIsLogScale"
              >
                <button
                  id="multiply-by-ten-x2"
                  size="x-small"
                  @click="updateDisplayedValMultipliedByTen('x2')"
                  icon
                >
                  x10
                </button>
                <button
                  id="divide-by-ten-x2"
                  size="x-small"
                  @click="updateDisplayedValDividedByTen('x2')"
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
              :model-value="axisSetRepository.activeAxisSet.xIsLogScale"
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
              :model-value="axisValuesDisplayed.y1"
              id="y1-value"
              type="number"
              hide-details
              label="y1"
              density="compact"
              @update:model-value="
                (val: string) => {
                  onInputAxisVal('y1', val)
                }
              "
            >
              <div
                class="c__AxisSetRepository-settings__log-adjuster"
                v-if="axisSetRepository.activeAxisSet.yIsLogScale"
              >
                <button
                  id="multiply-by-ten-y1"
                  size="x-small"
                  @click="updateDisplayedValMultipliedByTen('y1')"
                  icon
                >
                  x10
                </button>
                <button
                  id="divide-by-ten-y1"
                  size="x-small"
                  @click="updateDisplayedValDividedByTen('y1')"
                  icon
                >
                  /10
                </button>
              </div>
            </v-text-field>
          </td>
          <td class="pl-0 pr-1">
            <v-text-field
              v-model="axisValuesDisplayed.y2"
              id="y2-value"
              type="number"
              hide-details
              label="y2"
              density="compact"
              @update:model-value="
                (val: string) => {
                  onInputAxisVal('y2', val)
                }
              "
            >
              <div
                class="c__AxisSetRepository-settings__log-adjuster"
                v-if="axisSetRepository.activeAxisSet.yIsLogScale"
              >
                <button
                  id="multiply-by-ten-y2"
                  size="x-small"
                  @click="updateDisplayedValMultipliedByTen('y2')"
                  icon
                >
                  x10
                </button>
                <button
                  id="divide-by-ten-y2"
                  size="x-small"
                  @click="updateDisplayedValDividedByTen('y2')"
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
import { POINT_MODE } from '@/constants'
import { axisValInputHandler } from '@/instanceStore/applicationServiceInstances'
import { AxisKey } from '@/@types/types'

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
      axisValInputHandler,
      axisValuesDisplayed: {
        x1: '0',
        x2: '0',
        y1: '0',
        y2: '0',
      },
    }
  },
  created() {},
  methods: {
    onInputAxisVal(axisKey: AxisKey, val: string) {
      this.axisValInputHandler.setInputValue(
        this.axisSetRepository.activeAxisSetId,
        axisKey,
        val,
      )
    },
    updateDisplayedValMultipliedByTen(axisName: AxisKey): void {
      // this.axisValInputHandler.activeAxisSetInputValues[axisName] = this.getDisplayedValMultipliedByTen(
      //   parseFloat(this.axisValInputHandler.activeAxisSetInputValues[axisName]),
      // )
    },
    updateDisplayedValDividedByTen(axisName: AxisKey): void {
      // this.axisValInputHandler.activeAxisSetInputValues[axisName] = this.getDisplayedValDividedByTen(
      //   parseFloat(this.axisValInputHandler.activeAxisSetInputValues[axisName]),
      // )
    },
  },
  watch: {
    'axisSetRepository.activeAxisSetId'() {
      this.axisValuesDisplayed = this.axisValInputHandler.getAxisSetInputValues(
        this.axisSetRepository.activeAxisSetId,
      )
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
