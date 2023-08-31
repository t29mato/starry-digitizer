<template>
  <div class="pa-2" :style="{ border: '1px solid grey' }">
    <v-simple-table height="240" fixed-header dense>
      <thead>
        <tr>
          <th v-if="isDev">#{{ calculatedPlots.length || 0 }}</th>
          <th>X Pixel</th>
          <th>Y Pixel</th>
          <th>X Value</th>
          <th>Y Value</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="plot in calculatedPlotsCeil"
          :key="plot.id"
          @click="activatePlot(plot.id)"
          :style="{
            background: activePlotIds.includes(plot.id) ? activeColor : '',
          }"
        >
          <td v-if="isDev">{{ plot.id }}</td>
          <td>{{ plot.xPx }}</td>
          <td>{{ plot.yPx }}</td>
          <td>{{ plot.xV }}</td>
          <td>{{ plot.yV }}</td>
        </tr>
      </tbody>
    </v-simple-table>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import colors from 'vuetify/lib/util/colors'
export default Vue.extend({
  data() {
    return {
      activeColor: colors.green.lighten5,
      isDev: process.env.NODE_ENV === 'development',
    }
  },
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
    activePlotIds: {
      type: Array as PropType<number[]>,
    },
  },
  computed: {
    // INFO: 小数点ありのピクセル表示するとユーザーを混乱させるので表示上は切り上げ
    calculatedPlotsCeil(): {
      id: number
      xV: number
      yV: number
      xPx: number
      yPx: number
    }[] {
      return this.calculatedPlots.map((plot) => {
        return {
          xPx: Math.ceil(plot.xPx),
          yPx: Math.ceil(plot.yPx),
          id: plot.id,
          xV: plot.xV,
          yV: plot.yV,
        }
      })
    },
  },
})
</script>
