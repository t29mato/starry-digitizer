<template>
  <div class="mt-2">
    <h4>XY Axes</h4>
    <v-simple-table dense>
      <tbody>
        <tr>
          <th class="pa-1">X</th>
          <td class="pa-1">
            <v-text-field
              v-model="x1"
              @input="setX1"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="x1"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-text-field
              v-model="x2"
              @input="setX2"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="x2"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-checkbox
              :value="axes.xIsLog"
              @change="setXIsLog"
              dense
              hint="Log"
              persistent-hint
            ></v-checkbox>
          </td>
        </tr>
        <tr>
          <th class="pa-1">Y</th>
          <td class="pa-1">
            <v-text-field
              v-model="y1"
              @input="setY1"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="y1"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-text-field
              v-model="y2"
              @input="setY2"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="y2"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-checkbox
              :value="axes.yIsLog"
              @change="setYIsLog"
              hint="Log"
              persistent-hint
              dense
            ></v-checkbox>
          </td>
        </tr>
      </tbody>
    </v-simple-table>
    <v-checkbox
      label="X1 = Y1 coordinates"
      dense
      v-model="axes.x1IsSameAsY1"
    ></v-checkbox>
    <p class="red--text">{{ errorMessage }}</p>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { axesMapper } from '@/store/modules/axes'

export default Vue.extend({
  computed: {
    ...axesMapper.mapGetters(['axes']),
    errorMessage(): string {
      if (this.axes.xIsLog) {
        if (this.x1 === 0 || this.x2 === 0) {
          return 'x1 or x2 should not be 0'
        }
      } else {
        if (this.x1 === this.x2) {
          return 'x1 and x2 should not be same value'
        }
      }
      if (this.axes.yIsLog) {
        if (this.y1 === 0 || this.y2 === 0) {
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
      x1: 0,
      x2: 1,
      y1: 0,
      y2: 1,
    }
  },
  props: {},
  methods: {
    ...axesMapper.mapActions([
      'setX1Value',
      'setX2Value',
      'setY1Value',
      'setY2Value',
      'setXIsLog',
      'setYIsLog',
    ]),
    setX1(value: string) {
      this.setX1Value(parseFloat(value))
    },
    setX2(value: string) {
      this.setX2Value(parseFloat(value))
    },
    setY1(value: string) {
      this.setY1Value(parseFloat(value))
    },
    setY2(value: string) {
      this.setY2Value(parseFloat(value))
    },
  },
  mounted() {
    this.x1 = this.axes.x1.value
    this.x2 = this.axes.x2.value
    this.y1 = this.axes.y1.value
    this.y2 = this.axes.y2.value
  },
})
</script>
