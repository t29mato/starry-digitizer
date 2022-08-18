<template>
  <div class="mt-2">
    <h4>XY Axes</h4>
    <v-simple-table dense>
      <tbody>
        <tr>
          <th class="pa-1">X</th>
          <td class="pa-1">
            <v-text-field
              :value="axes.x1.value"
              @input="setX1"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="x1"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-text-field
              :value="axes.x2.value"
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
              :value="axes.y1.value"
              @input="setY1"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="y1"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-text-field
              :value="axes.y2.value"
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
    <p class="red--text">{{ axes.error }}</p>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { axesMapper } from '@/store/modules/axes'

export default Vue.extend({
  computed: {
    ...axesMapper.mapGetters(['axes']),
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
    setXIsLog(value: boolean) {
      this.setXIsLog(value)
    },
    setYIsLog(value: boolean) {
      this.setYIsLog(value)
    },
  },
})
</script>
