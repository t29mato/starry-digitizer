<template>
  <div class="c__axis-set-settings">
    <div class="c__axis-set-settings__x">
      <p>X</p>
      <v-text-field
        v-model="axisValuesDisplayed.x1"
        id="x1-value"
        hide-details
        label="x1"
        density="compact"
        @update:model-value="
          (val: string) => {
            onInputAxisVal('x1', val)
          }
        "
        @focus="onFocusInput"
        @blur="onBlurInput('x1')"
      >
        <div
          class="c__axis-set-settings__log-adjuster"
          v-if="axisSetRepository.activeAxisSet.xIsLogScale"
        >
          <button
            v-if="canMultiplyAndDivideByTen('x1')"
            size="x-small"
            @click="updateDisplayedValMultipliedByTen('x1')"
            id="multiply-by-ten-x1"
            icon
          >
            x10
          </button>
          <button
            v-if="canMultiplyAndDivideByTen('x1')"
            id="divide-by-ten-x1"
            size="x-small"
            @click="updateDisplayedValDividedByTen('x1')"
            icon
          >
            /10
          </button>
        </div>
      </v-text-field>
      <v-text-field
        v-model="axisValuesDisplayed.x2"
        id="x2-value"
        hide-details
        label="x2"
        density="compact"
        @update:model-value="
          (val: string) => {
            onInputAxisVal('x2', val)
          }
        "
        @focus="onFocusInput"
        @blur="onBlurInput('x2')"
      >
        <div
          class="c__axis-set-settings__log-adjuster"
          v-if="axisSetRepository.activeAxisSet.xIsLogScale"
        >
          <button
            v-if="canMultiplyAndDivideByTen('x2')"
            id="multiply-by-ten-x2"
            size="x-small"
            @click="updateDisplayedValMultipliedByTen('x2')"
            icon
          >
            x10
          </button>
          <button
            v-if="canMultiplyAndDivideByTen('x2')"
            id="divide-by-ten-x2"
            size="x-small"
            @click="updateDisplayedValDividedByTen('x2')"
            icon
          >
            /10
          </button>
        </div>
      </v-text-field>
      <div>
        <v-checkbox
          color="primary"
          v-model="axisSetRepository.activeAxisSet.xIsLogScale"
          id="x-is-log"
          hide-details
          density="compact"
        ></v-checkbox>
        <span class="c__axis-set-settings__hint">Log</span>
      </div>
    </div>
    <div class="c__axis-set-settings__y">
      <p>Y</p>
      <v-text-field
        v-model="axisValuesDisplayed.y1"
        id="y1-value"
        hide-details
        label="y1"
        density="compact"
        @update:model-value="
          (val: string) => {
            onInputAxisVal('y1', val)
          }
        "
        @focus="onFocusInput"
        @blur="onBlurInput('y1')"
      >
        <div
          class="c__axis-set-settings__log-adjuster"
          v-if="axisSetRepository.activeAxisSet.yIsLogScale"
        >
          <button
            v-if="canMultiplyAndDivideByTen('y1')"
            id="multiply-by-ten-y1"
            size="x-small"
            @click="updateDisplayedValMultipliedByTen('y1')"
            icon
          >
            x10
          </button>
          <button
            v-if="canMultiplyAndDivideByTen('y1')"
            id="divide-by-ten-y1"
            size="x-small"
            @click="updateDisplayedValDividedByTen('y1')"
            icon
          >
            /10
          </button>
        </div>
      </v-text-field>
      <v-text-field
        v-model="axisValuesDisplayed.y2"
        id="y2-value"
        hide-details
        label="y2"
        density="compact"
        @update:model-value="
          (val: string) => {
            onInputAxisVal('y2', val)
          }
        "
        @focus="onFocusInput"
        @blur="onBlurInput('y2')"
      >
        <div
          class="c__axis-set-settings__log-adjuster"
          v-if="axisSetRepository.activeAxisSet.yIsLogScale"
        >
          <button
            v-if="canMultiplyAndDivideByTen('y2')"
            id="multiply-by-ten-y2"
            size="x-small"
            @click="updateDisplayedValMultipliedByTen('y2')"
            icon
          >
            x10
          </button>
          <button
            v-if="canMultiplyAndDivideByTen('y2')"
            id="divide-by-ten-y2"
            size="x-small"
            @click="updateDisplayedValDividedByTen('y2')"
            icon
          >
            /10
          </button>
        </div>
      </v-text-field>
      <td>
        <v-checkbox
          color="primary"
          v-model="axisSetRepository.activeAxisSet.yIsLogScale"
          id="y-is-log"
          density="compact"
          hide-details
        ></v-checkbox>
        <span class="c__axis-set-settings__hint">Log</span>
      </td>
    </div>

    <div v-if="shouldShowErrorMessage">
      <p v-for="errMsg in errorMessages" :key="errMsg" class="text-red mb-5">
        {{ errMsg }}
      </p>
    </div>

    <div class="mb-5">
      <h5 class="c__axis-set-settings__point-mode__label">
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
    axisValuesDisplayed() {
      return (
        this.axisValInputHandler.inputValues.get(
          this.axisSetRepository.activeAxisSetId,
        ) || {
          x1: '0',
          x2: '0',
          y1: '0',
          y2: '0',
        }
      )
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
      errorMessages: [] as string[],
      shouldShowErrorMessage: false,
    }
  },
  created() {},
  methods: {
    onInputAxisVal(axisKey: AxisKey, val: string) {
      this.errorMessages = []

      try {
        const activeAxisSetId = this.axisSetRepository.activeAxisSetId
        this.axisValInputHandler.setInputValue(activeAxisSetId, axisKey, val)

        this.axisValInputHandler.setConvertedAxisValToAxisSet(
          activeAxisSetId,
          axisKey,
        )
      } catch (error: unknown) {
        console.error(error)
      }
    },
    onFocusInput() {
      this.shouldShowErrorMessage = false
    },
    onBlurInput(axisKey: AxisKey) {
      //NOTE: only if input value is '', convert it to '0' and will not show an error message
      if (this.axisValuesDisplayed[axisKey] === '') {
        this.axisValuesDisplayed[axisKey] = '0'
        return
      }

      const activeAxisSetId = this.axisSetRepository.activeAxisSetId
      this.axisValInputHandler.validateInputValues(activeAxisSetId)

      //NOTE: To show error messages when a user blurred input tag for comfortability
      this.shouldShowErrorMessage = true
    },
    canMultiplyAndDivideByTen(axisKey: AxisKey) {
      const inputVal = this.axisValInputHandler.getAxisSetInputValues(
        this.axisSetRepository.activeAxisSetId,
      )[axisKey]

      const inputValFormat =
        this.axisValInputHandler.getInputValueFormat(inputVal)

      return (
        inputValFormat === 'decimal' || inputValFormat === 'scientificNotation'
      )
    },
    updateDisplayedValMultipliedByTen(axisKey: AxisKey): void {
      //TODO Refactor
      const activeAxisSetId = this.axisSetRepository.activeAxisSetId
      const inputVal =
        this.axisValInputHandler.getAxisSetInputValues(activeAxisSetId)[axisKey]

      const inputValFormat =
        this.axisValInputHandler.getInputValueFormat(inputVal)

      if (inputValFormat === 'scientificNotation') {
        return
      }

      if (inputValFormat === 'decimal') {
        console.log('aaa')
        const newVal = String(parseFloat(inputVal) * 10)
        this.axisValuesDisplayed[axisKey] = newVal

        this.axisValInputHandler.setInputValue(activeAxisSetId, axisKey, newVal)
        this.axisValInputHandler.setConvertedAxisValToAxisSet(
          activeAxisSetId,
          axisKey,
        )
        return
      }

      throw new Error(
        'input value must be decimal or schientificNotation to be multiplied by ten',
      )

      // this.axisValInputHandler.activeAxisSetInputValues[axisName] = this.getDisplayedValMultipliedByTen(
      //   parseFloat(this.axisValInputHandler.activeAxisSetInputValues[axisName]),
      // )
    },
    updateDisplayedValDividedByTen(axisKey: AxisKey): void {
      // this.axisValInputHandler.activeAxisSetInputValues[axisName] = this.getDisplayedValDividedByTen(
      //   parseFloat(this.axisValInputHandler.activeAxisSetInputValues[axisName]),
      // )
    },
  },
  watch: {
    'axisSetRepository.activeAxisSetId'() {
      const { x1, x2, y1, y2 } = this.axisValInputHandler.getAxisSetInputValues(
        this.axisSetRepository.activeAxisSetId,
      )

      this.axisValuesDisplayed.x1 = x1
      this.axisValuesDisplayed.x2 = x2
      this.axisValuesDisplayed.y1 = y1
      this.axisValuesDisplayed.y2 = y2

      // console.log(this.axisSetRepository.activeAxisSet)
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
  &__axis-set-settings {
    &__x,
    &__y {
      display: flex;
      align-items: center;
      gap: 4px;
    }
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
