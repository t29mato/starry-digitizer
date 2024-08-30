<template>
  <div>
    <h4>XY AxisSet</h4>
    <table class="c__AxisSetRepository-settings__table">
      <tbody>
        <tr>
          <td class="pl-0 pr-1">X</td>
          <td class="pl-0 pr-1">
            <v-text-field
              v-model="x1"
              id="x1-value"
              type="number"
              hide-details
              label="x1"
              density="compact"
            >
              <div
                class="c__AxisSetRepository-settings__log-adjuster"
                v-if="xIsLog"
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
              v-model="x2"
              id="x2-value"
              type="number"
              hide-details
              label="x2"
              density="compact"
            >
              <div
                class="c__AxisSetRepository-settings__log-adjuster"
                v-if="xIsLog"
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
              v-model="xIsLog"
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
              v-model="y1"
              id="y1-value"
              type="number"
              hide-details
              label="y1"
              density="compact"
            >
              <div
                class="c__AxisSetRepository-settings__log-adjuster"
                v-if="yIsLog"
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
              v-model="y2"
              id="y2-value"
              type="number"
              hide-details
              label="y2"
              density="compact"
            >
              <div
                class="c__AxisSetRepository-settings__log-adjuster"
                v-if="yIsLog"
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
              v-model="yIsLog"
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
        Define the axisSet by the coordinates of:
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
        label="Show axisSet marker"
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

import { AxisSetRepository } from '@/instanceStore/repositoryInatances'

export default defineComponent({
  computed: {
    errorMessage(): string {
      if (this.axisSetRepository.activeAxisSet.xIsLog) {
        if (this.x1 === '0' || this.x2 === '0') {
          return 'x1 or x2 should not be 0'
        }
      } else {
        if (this.x1 === this.x2) {
          return 'x1 and x2 should not be same value'
        }
      }
      if (this.axisSetRepository.activeAxisSet.yIsLog) {
        if (this.y1 === '0' || this.y2 === '0') {
          return 'y1 or y2 should not be 0'
        }
      } else {
        if (this.y1 === this.y2) {
          return 'y1 and y2 should not be same value'
        }
      }
      return ''
    },
  },
  data() {
    return {
      axisSetRepository: AxisSetRepository,
      x1: '0',
      x2: '1',
      y1: '0',
      y2: '1',
      xIsLog: false,
      yIsLog: false,
    }
  },

  methods: {
    multiplyByTenX1() {
      this.x1 = String(this.multiplyByTen(parseFloat(this.x1)))
    },
    divideByTenX1() {
      this.x1 = String(this.divideByTen(parseFloat(this.x1)))
    },
    multiplyByTenX2() {
      this.x2 = String(this.multiplyByTen(parseFloat(this.x2)))
    },
    divideByTenX2() {
      this.x2 = String(this.divideByTen(parseFloat(this.x2)))
    },
    multiplyByTenY1() {
      this.y1 = String(this.multiplyByTen(parseFloat(this.y1)))
    },
    divideByTenY1() {
      this.y1 = String(this.divideByTen(parseFloat(this.y1)))
    },
    multiplyByTenY2() {
      this.y2 = String(this.multiplyByTen(parseFloat(this.y2)))
    },
    divideByTenY2() {
      this.y2 = String(this.divideByTen(parseFloat(this.y2)))
    },
    multiplyByTen(value: number) {
      if (value === 0) {
        return 1
      }
      return (value * 10).toPrecision(1)
    },
    divideByTen(value: number) {
      if (value === 0) {
        return 0.1
      }
      return (value * 0.1).toPrecision(1)
    },
  },
  mounted() {
    this.x1 = String(this.axisSetRepository.activeAxisSet.x1.value)
    this.x2 = String(this.axisSetRepository.activeAxisSet.x2.value)
    this.y1 = String(this.axisSetRepository.activeAxisSet.y1.value)
    this.y2 = String(this.axisSetRepository.activeAxisSet.y2.value)
    this.xIsLog = this.axisSetRepository.activeAxisSet.xIsLog
    this.yIsLog = this.axisSetRepository.activeAxisSet.yIsLog
  },
  watch: {
    xIsLog(value: boolean) {
      this.axisSetRepository.activeAxisSet.setXIsLog(value)
    },
    yIsLog(value: boolean) {
      this.axisSetRepository.activeAxisSet.setYIsLog(value)
    },
    x1(value: string) {
      this.axisSetRepository.activeAxisSet.setX1Value(parseFloat(value))
    },
    x2(value: string) {
      this.axisSetRepository.activeAxisSet.setX2Value(parseFloat(value))
    },
    y1(value: string) {
      this.axisSetRepository.activeAxisSet.setY1Value(parseFloat(value))
    },
    y2(value: string) {
      this.axisSetRepository.activeAxisSet.setY2Value(parseFloat(value))
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
