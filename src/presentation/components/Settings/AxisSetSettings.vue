<template>
  <div>
    <table class="c__AxisSetRepository-settings__table">
      <tbody>
        <tr>
          <td class="pl-0 pr-1">X</td>
          <td class="pl-0 pr-1">
            <v-text-field
              v-model.number="x1Axis.value"
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
                  @click="multiplyByTenX1"
                  id="multiply-by-ten-x1"
                  icon
                >
                  x10
                </button>
                <button
                  id="divide-by-ten-x1"
                  size="x-small"
                  @click="divideByTenX1"
                  icon
                >
                  /10
                </button>
              </div>
            </v-text-field>
          </td>
          <td class="pl-0 pr-1">
            <v-text-field
              v-model.number="x2Axis.value"
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
                  @click="multiplyByTenX2"
                  icon
                >
                  x10
                </button>
                <button
                  id="divide-by-ten-x2"
                  size="x-small"
                  @click="divideByTenX2"
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
              v-model.number="y1Axis.value"
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
                  @click="multiplyByTenY1"
                  icon
                >
                  x10
                </button>
                <button
                  id="divide-by-ten-y1"
                  size="x-small"
                  @click="divideByTenY1"
                  icon
                >
                  /10
                </button>
              </div>
            </v-text-field>
          </td>
          <td class="pl-0 pr-1">
            <v-text-field
              v-model.number="y2Axis.value"
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
                  @click="multiplyByTenY2"
                  icon
                >
                  x10
                </button>
                <button
                  id="divide-by-ten-y2"
                  size="x-small"
                  @click="divideByTenY2"
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
        <v-radio label="2 Points" :value="0"></v-radio>
        <v-radio label="4 Points" :value="1"></v-radio>
      </v-radio-group>
      <v-checkbox
        v-if="axisSetRepository.activeAxisSet.pointMode === 1"
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

    <p class="text-red">{{ errorMessage }}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { axisSetRepository } from '@/instanceStore/repositoryInatances'

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
  },
  data() {
    return {
      axisSetRepository,
    }
  },

  methods: {
    multiplyByTenX1() {
      this.x1Axis.value = this.multiplyByTen(this.x1Axis.value)
    },
    divideByTenX1() {
      this.x1Axis.value = this.divideByTen(this.x1Axis.value)
    },
    multiplyByTenX2() {
      this.x2Axis.value = this.multiplyByTen(this.x2Axis.value)
    },
    divideByTenX2() {
      this.x2Axis.value = this.divideByTen(this.x2Axis.value)
    },
    multiplyByTenY1() {
      this.y1Axis.value = this.multiplyByTen(this.y1Axis.value)
    },
    divideByTenY1() {
      this.y1Axis.value = this.divideByTen(this.y1Axis.value)
    },
    multiplyByTenY2() {
      this.y2Axis.value = this.multiplyByTen(this.y2Axis.value)
    },
    divideByTenY2() {
      this.y2Axis.value = this.divideByTen(this.y2Axis.value)
    },
    multiplyByTen(value: number) {
      if (value === 0) {
        return 1
      }
      return value * 10
    },
    divideByTen(value: number) {
      if (value === 0) {
        return 0.1
      }
      return value * 0.1
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__AxisSetRepository-settings {
    &__table {
      margin-bottom: 20px;
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
