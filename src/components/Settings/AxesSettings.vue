<template>
  <div class="mt-3">
    <h4>XY Axes</h4>
    <v-simple-table dense>
      <tbody>
        <tr>
          <th class="pa-1">X</th>
          <td class="pa-1">
            <v-text-field
              :value="axes.x1"
              @input="inputX1"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="x1"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-text-field
              :value="axes.x2"
              @input="inputX2"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="x2"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-checkbox
              :value="isLog.x"
              @change="changeIsLogX"
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
              :value="axes.y1"
              @input="inputY1"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="y1"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-text-field
              :value="axes.y2"
              @input="inputY2"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="y2"
            ></v-text-field>
          </td>
          <td class="pa-1">
            <v-checkbox
              :value="isLog.y"
              @change="changeIsLogY"
              hint="Log"
              persistent-hint
              dense
            ></v-checkbox>
          </td>
        </tr>
      </tbody>
    </v-simple-table>
    <p class="red--text">{{ error }}</p>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  computed: {},
  props: {
    axes: {
      type: Object,
      required: true,
    },
    isLog: {
      type: Object,
      required: true,
    },
    error: {
      type: String,
    },
  },
  methods: {
    inputX1(value: string) {
      this.$emit('input', Object.assign(this.$props.axes, { x1: value }))
    },
    inputX2(value: string) {
      this.$emit('input', Object.assign(this.$props.axes, { x2: value }))
    },
    inputY1(value: string) {
      this.$emit('input', Object.assign(this.$props.axes, { y1: value }))
    },
    inputY2(value: string) {
      this.$emit('input', Object.assign(this.$props.axes, { y2: value }))
    },
    changeIsLogX(isLog: boolean) {
      this.$emit('change', Object.assign(this.$props.isLog, { x: isLog }))
    },
    changeIsLogY(isLog: boolean) {
      this.$emit('change', Object.assign(this.$props.isLog, { y: isLog }))
    },
  },
})
</script>
