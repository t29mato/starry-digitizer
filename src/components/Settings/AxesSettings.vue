<template>
  <div class="mt-2">
    <h4>XY Axes</h4>
    <v-simple-table dense>
      <tbody>
        <tr>
          <th class="pa-1">X</th>
          <td class="pa-1">
            <v-text-field
              :value="x1"
              @input="setX1"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="x1"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-text-field
              :value="x2"
              @input="setX2"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="x2"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-checkbox
              :value="xIsLog"
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
              :value="y1"
              @input="setY1"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="y1"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-text-field
              :value="y2"
              @input="setY2"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="y2"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-checkbox
              :value="yIsLog"
              @change="setYIsLog"
              hint="Log"
              persistent-hint
              dense
            ></v-checkbox>
          </td>
        </tr>
      </tbody>
    </v-simple-table>
    <p class="red--text">{{ axes.error }}</p>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { Axes } from '@/domains/axes'
import { axesMapper } from '@/store/modules/axes'
const axes = Axes.instance

export default Vue.extend({
  computed: {
    ...axesMapper.mapGetters(['axes']),
    x1() {
      return axes.x1.value
    },
    x2() {
      return axes.x2.value
    },
    y1() {
      return axes.y1.value
    },
    y2() {
      return axes.y2.value
    },
    xIsLog() {
      return axes.xIsLog
    },
    yIsLog() {
      return axes.yIsLog
    },
  },
  data() {
    return {}
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
      this.setX1Value(parseInt(value))
    },
    setX2(value: string) {
      this.setX2Value(parseInt(value))
    },
    setY1(value: string) {
      this.setY1Value(parseInt(value))
    },
    setY2(value: string) {
      this.setY2Value(parseInt(value))
    },
    setXIsLog(value: boolean) {
      this.setXIsLog(value)
    },
    setYIsLog(value: boolean) {
      this.setYIsLog(value)
    },
  },
})
</script>
