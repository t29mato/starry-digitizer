<template>
  <div>
    <v-simple-table dense>
      <thead>
        <tr>
          <th></th>
          <th>Value 1</th>
          <th>Value 2</th>
          <th>Log</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>X</th>
          <td>
            <v-text-field
              :value="axes.x1"
              @input="inputX1"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="x1"
            ></v-text-field>
          </td>
          <td>
            <v-text-field
              :value="axes.x2"
              @input="inputX2"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="x2"
            ></v-text-field>
          </td>
          <td>
            <v-checkbox :value="isLog.x" @change="changeIsLogX"></v-checkbox>
          </td>
        </tr>
        <tr>
          <th>Y</th>
          <td>
            <v-text-field
              :value="axes.y1"
              @input="inputY1"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="y1"
            ></v-text-field>
          </td>
          <td>
            <v-text-field
              :value="axes.y2"
              @input="inputY2"
              type="number"
              class="ma-0 pa-0"
              hide-details
              label="y2"
            ></v-text-field>
          </td>
          <td>
            <v-checkbox :value="isLog.y" @change="changeIsLogY"></v-checkbox>
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
