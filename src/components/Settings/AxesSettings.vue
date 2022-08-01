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
    <!-- TODO: エラーメッセージを表示する -->
    <!-- <p class="red--text">{{ error }}</p> -->
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { AxesManager as AM } from '@/domains/AxesManager'
const am = AM.instance

export default Vue.extend({
  computed: {
    x1() {
      return am.axes.x1.value
    },
    x2() {
      return am.axes.x2.value
    },
    y1() {
      return am.axes.y1.value
    },
    y2() {
      return am.axes.y2.value
    },
    xIsLog() {
      return am.xIsLog
    },
    yIsLog() {
      return am.yIsLog
    },
  },
  data() {
    return {}
  },
  props: {},
  methods: {
    setX1(value: string) {
      am.axes.x1.value = parseInt(value)
    },
    setX2(value: string) {
      am.axes.x2.value = parseInt(value)
    },
    setY1(value: string) {
      am.axes.y1.value = parseInt(value)
    },
    setY2(value: string) {
      am.axes.y2.value = parseInt(value)
    },
    setXIsLog(value: boolean) {
      am.xIsLog = value
    },
    setYIsLog(value: boolean) {
      am.yIsLog = value
    },
  },
})
</script>
