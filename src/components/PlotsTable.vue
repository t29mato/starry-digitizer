<template>
  <v-simple-table>
    <template #default>
      <thead>
        <tr>
          <th>X</th>
          <th>Y</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="plot in plots" :key="plot.id">
          <td>
            {{ plot.xV }}
          </td>
          <td>
            {{ plot.yV }}
          </td>
        </tr>
      </tbody>
    </template>
  </v-simple-table>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
export default Vue.extend({
  props: {
    plots: {
      type: Array as PropType<
        {
          id: number
          xV: number
          yV: number
        }[]
      >,
      required: true,
    },
  },
})
</script>
