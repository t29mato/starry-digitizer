<template>
  <div>
    <h4>XY Axes</h4>
    <v-table class="mb-5">
      <tbody>
        <tr>
          <th class="pa-0">X</th>
          <td class="pa-1 pl-2">
            <v-text-field
              v-model="x1"
              id="x1-value"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="x1"
            >
              <template v-slot:append v-if="xIsLog">
                <div class="d-flex flex-column">
                  <v-btn
                    class="pa-0"
                    size="x-small"
                    @click="multiplyByTenX1"
                    id="multiply-by-ten-x1"
                    icon
                    >x10
                  </v-btn>
                  <v-btn
                    class="pa-0"
                    id="divide-by-ten-x1"
                    size="x-small"
                    @click="divideByTenX1"
                    icon
                  >
                    /10
                  </v-btn>
                </div>
              </template>
            </v-text-field>
          </td>
          <td class="pa-1 pl-0">
            <v-text-field
              v-model="x2"
              id="x2-value"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="x2"
            >
              <template v-slot:append v-if="xIsLog">
                <div class="d-flex flex-column">
                  <v-btn
                    id="multiply-by-ten-x2"
                    size="x-small"
                    @click="multiplyByTenX2"
                    icon
                    >x10
                  </v-btn>
                  <v-btn
                    id="divide-by-ten-x2"
                    size="x-small"
                    @click="divideByTenX2"
                    icon
                  >
                    /10
                  </v-btn>
                </div>
              </template>
            </v-text-field>
          </td>
          <td class="pa-0">
            <v-checkbox
              v-model="xIsLog"
              id="x-is-log"
              hint="Log"
              persistent-hint
            ></v-checkbox>
          </td>
        </tr>
        <tr>
          <th class="pa-0">Y</th>
          <td class="pa-1 pl-2">
            <v-text-field
              v-model="y1"
              id="y1-value"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="y1"
            >
              <template v-slot:append v-if="yIsLog">
                <div class="d-flex flex-column">
                  <v-btn
                    id="multiply-by-ten-y1"
                    size="x-small"
                    @click="multiplyByTenY1"
                    icon
                    >x10
                  </v-btn>
                  <v-btn
                    id="divide-by-ten-y1"
                    size="x-small"
                    @click="divideByTenY1"
                    icon
                  >
                    /10
                  </v-btn>
                </div>
              </template>
            </v-text-field>
          </td>
          <td class="pa-1 pl-0">
            <v-text-field
              v-model="y2"
              id="y2-value"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="y2"
            >
              <template v-slot:append v-if="yIsLog">
                <div class="d-flex flex-column">
                  <v-btn
                    id="multiply-by-ten-y2"
                    size="x-small"
                    @click="multiplyByTenY2"
                    icon
                    >x10
                  </v-btn>
                  <v-btn
                    id="divide-by-ten-y2"
                    size="x-small"
                    @click="divideByTenY2"
                    icon
                  >
                    /10
                  </v-btn>
                </div>
              </template>
            </v-text-field>
          </td>
          <td class="pa-0">
            <v-checkbox
              v-model="yIsLog"
              id="y-is-log"
              hint="Log"
              persistent-hint
            ></v-checkbox>
          </td>
        </tr>
      </tbody>
    </v-table>
    <div class="mb-5">
      <h5>Define the axes by the coordinates of:</h5>
      <v-radio-group row v-model.number="axes.pointMode" hide-details>
        <v-radio label="2 Points" :value="0"></v-radio>
        <v-radio label="4 Points" :value="1"></v-radio>
      </v-radio-group>
      <v-checkbox
        v-if="axes.pointMode === 1"
        v-model="axes.considerGraphTilt"
        label="Consider graph tilt"
      ></v-checkbox>
    </div>

    <p class="text-red">{{ errorMessage }}</p>
  </div>
</template>

<script lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAxesStore } from '@/store/modules/axes'

export default {
  setup() {
    const x1 = ref('0')
    const x2 = ref('1')
    const y1 = ref('0')
    const y2 = ref('1')
    const xIsLog = ref(false)
    const yIsLog = ref(false)

    const {
      axes,
      setX1Value,
      setX2Value,
      setY1Value,
      setY2Value,
      setXIsLog,
      setYIsLog,
    } = useAxesStore()

    const multiplyByTen = (value: number): string => {
      if (value === 0) {
        return String(1)
      }
      return (value * 10).toPrecision(1)
    }

    const divideByTen = (value: number): string => {
      if (value === 0) {
        return String(0.1)
      }
      return (value * 0.1).toPrecision(1)
    }

    const errorMessage = computed(() => {
      if (axes.value.xIsLog) {
        if (x1.value === '0' || x2.value === '0') {
          return 'x1 or x2 should not be 0'
        }
      } else {
        if (x1.value === x2.value) {
          return 'x1 and x2 should not be the same value'
        }
      }
      if (axes.value.yIsLog) {
        if (y1.value === '0' || y2.value === '0') {
          return 'y1 or y2 should not be 0'
        }
      } else {
        if (y1.value === y2.value) {
          return 'y1 and y2 should not be the same value'
        }
      }
      return ''
    })

    const multiplyByTenX1 = () => {
      x1.value = String(multiplyByTen(parseFloat(x1.value)))
    }
    const divideByTenX1 = () => {
      x1.value = String(divideByTen(parseFloat(x1.value)))
    }
    const multiplyByTenX2 = () => {
      x2.value = String(multiplyByTen(parseFloat(x2.value)))
    }
    const divideByTenX2 = () => {
      x2.value = String(divideByTen(parseFloat(x2.value)))
    }
    const multiplyByTenY1 = () => {
      y1.value = String(multiplyByTen(parseFloat(y1.value)))
    }
    const divideByTenY1 = () => {
      y1.value = String(divideByTen(parseFloat(y1.value)))
    }
    const multiplyByTenY2 = () => {
      y2.value = String(multiplyByTen(parseFloat(y2.value)))
    }
    const divideByTenY2 = () => {
      y2.value = String(divideByTen(parseFloat(y2.value)))
    }
    // Watchers
    watch(xIsLog, (newValue) => {
      setXIsLog(newValue)
    })

    watch(yIsLog, (newValue) => {
      setYIsLog(newValue)
    })

    watch(x1, (newValue) => {
      setX1Value(parseFloat(newValue))
    })

    watch(x2, (newValue) => {
      setX2Value(parseFloat(newValue))
    })

    watch(y1, (newValue) => {
      setY1Value(parseFloat(newValue))
    })

    watch(y2, (newValue) => {
      setY2Value(parseFloat(newValue))
    })

    // Mounted Hook
    onMounted(() => {
      x1.value = String(axes.value.x1.value)
      x2.value = String(axes.value.x2.value)
      y1.value = String(axes.value.y1.value)
      y2.value = String(axes.value.y2.value)
      xIsLog.value = axes.value.xIsLog
      yIsLog.value = axes.value.yIsLog
    })

    return {
      axes,
      x1,
      x2,
      y1,
      y2,
      xIsLog,
      yIsLog,
      errorMessage,
      multiplyByTenX1,
      divideByTenX1,
      multiplyByTenX2,
      divideByTenX2,
      multiplyByTenY1,
      divideByTenY1,
      multiplyByTenY2,
      divideByTenY2,
      // (他の関数もここに追加)
    }
  },
}
</script>
