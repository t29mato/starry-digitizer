<template>
  <v-row class="ma-0">
    <v-col class="pa-0">
      <v-text-field
        :value="symbolExtractByArea.minDiameterPx"
        @input="inputMin"
        label="Min. Diameter (px)"
        type="number"
        class="ma-0 pl-4"
      ></v-text-field>
    </v-col>
    <v-col class="pa-0">
      <v-text-field
        :value="symbolExtractByArea.maxDiameterPx"
        @input="inputMax"
        label="Max. Diameter (px)"
        type="number"
        class="ma-0 pl-4"
      ></v-text-field>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapGetters, mapActions } from 'vuex'

export default defineComponent({
  computed: {
    ...mapGetters('symbolExtractByArea', {
      symbolExtractByArea: 'symbolExtractByArea',
    }),
  },
  props: {},
  methods: {
    ...mapActions('symbolExtractByArea', [
      'setMinDiameterPx',
      'setMaxDiameterPx',
    ]),
    inputMin(value: string) {
      this.setMinDiameterPx(parseInt(value))
    },
    inputMax(value: string) {
      this.setMaxDiameterPx(parseInt(value))
    },
  },
})
</script>
