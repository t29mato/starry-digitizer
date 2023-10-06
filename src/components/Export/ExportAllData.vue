<template>
  <div>
    <v-btn class="mt-1" @click="getAllDataJson" size="small"
      >Export all data (仮)</v-btn
    >
  </div>
</template>

<script lang="ts">
import { useDatasetsStore } from '@/store/datasets'
import { useAxesStore } from '@/store/axes'

import { mapState } from 'pinia'
import { defineComponent } from 'vue'

import { AllDataToExportInterface } from '@/domains/export/allDataToExportInterface'
import { AllDataToExport } from '@/domains/export/allDataToExport'

export default defineComponent({
  computed: {
    ...mapState(useDatasetsStore, ['datasets']),
    ...mapState(useAxesStore, ['axes']),
  },
  methods: {
    getAllDataJson() {
      console.log(JSON.stringify(this.getAllDataToExport().dataObject))
    },
    getAllDataToExport(): AllDataToExportInterface {
      return new AllDataToExport(this.axes, this.datasets.datasets)
    },
  },
})
</script>
