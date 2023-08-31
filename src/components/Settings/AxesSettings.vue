<template>
  <div>
    <h4>XY Axes</h4>
    <v-simple-table dense class="mb-5">
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
                    x-small
                    @click="multiplyByTenX1"
                    id="multiply-by-ten-x1"
                    icon
                    >x10
                  </v-btn>
                  <v-btn
                    class="pa-0"
                    id="divide-by-ten-x1"
                    x-small
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
                    x-small
                    @click="multiplyByTenX2"
                    icon
                    >x10
                  </v-btn>
                  <v-btn
                    id="divide-by-ten-x2"
                    x-small
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
              dense
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
                    x-small
                    @click="multiplyByTenY1"
                    icon
                    >x10
                  </v-btn>
                  <v-btn
                    id="divide-by-ten-y1"
                    x-small
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
                    x-small
                    @click="multiplyByTenY2"
                    icon
                    >x10
                  </v-btn>
                  <v-btn
                    id="divide-by-ten-y2"
                    x-small
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
              dense
            ></v-checkbox>
          </td>
        </tr>
      </tbody>
    </v-simple-table>
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
        dense
      ></v-checkbox>
    </div>

    <p class="red--text">{{ errorMessage }}</p>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapGetters, mapActions } from 'vuex'

export default Vue.extend({
  computed: {
    ...mapGetters('axes', { axes: 'axes' }),
    errorMessage(): string {
      if (this.axes.xIsLog) {
        if (this.x1 === '0' || this.x2 === '0') {
          return 'x1 or x2 should not be 0'
        }
      } else {
        if (this.x1 === this.x2) {
          return 'x1 and x2 should not be same value'
        }
      }
      if (this.axes.yIsLog) {
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
      x1: '0',
      x2: '1',
      y1: '0',
      y2: '1',
      xIsLog: false,
      yIsLog: false,
    }
  },
  props: {},
  methods: {
    ...mapActions('axes', [
      'setX1Value',
      'setX2Value',
      'setY1Value',
      'setY2Value',
      'setXIsLog',
      'setYIsLog',
    ]),
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
    this.x1 = String(this.axes.x1.value)
    this.x2 = String(this.axes.x2.value)
    this.y1 = String(this.axes.y1.value)
    this.y2 = String(this.axes.y2.value)
    this.xIsLog = this.axes.xIsLog
    this.yIsLog = this.axes.yIsLog
  },
  watch: {
    xIsLog(value: boolean) {
      this.setXIsLog(value)
    },
    yIsLog(value: boolean) {
      this.setYIsLog(value)
    },
    x1(value: string) {
      this.setX1Value(parseFloat(value))
    },
    x2(value: string) {
      this.setX2Value(parseFloat(value))
    },
    y1(value: string) {
      this.setY1Value(parseFloat(value))
    },
    y2(value: string) {
      this.setY2Value(parseFloat(value))
    },
  },
})
</script>
