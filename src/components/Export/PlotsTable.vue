<template>
  <v-simple-table height="300" fixed-header dense>
    <thead>
      <tr>
        <th>X Pixel</th>
        <th>Y Pixel</th>
        <th>X Value</th>
        <th>Y Value</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="plot in calculatedPlots"
        :key="plot.id"
        @click="activatePlot(plot.id)"
      >
        <td>{{ plot.xPx }}</td>
        <td>{{ plot.yPx }}</td>
        <td>{{ plot.xV }}</td>
        <td>{{ plot.yV }}</td>
      </tr>
    </tbody>
  </v-simple-table>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
export default Vue.extend({
  props: {
    calculatedPlots: {
      type: Array as PropType<
        {
          id: number
          xV: number
          yV: number
          xPx: number
          yPx: number
        }[]
      >,
      required: true,
    },
    activatePlot: {
      type: Function,
      required: true,
    },
  },
})
</script>
