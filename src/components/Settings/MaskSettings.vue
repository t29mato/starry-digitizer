<template>
  <div>
    <h5>
      Mask
      <v-btn-toggle :value="maskMode" @change="setMaskMode" dense class="pl-2">
        <v-btn small> Pen </v-btn>
      </v-btn-toggle>
      <v-btn small class="ml-1" :disabled="!isDrawnMask" @click="clearMask">
        Clear
      </v-btn>
    </h5>
    <v-text-field
      v-if="maskMode === 0"
      :value="penToolSize"
      @change="setPenToolSize"
      type="number"
      hide-details
      label="Pen Size"
    ></v-text-field>
    <br />
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  computed: {},
  props: {
    maskMode: {
      type: Number,
      required: true,
    },
    isDrawnMask: {
      type: Boolean,
      required: true,
    },
    clearMask: {
      type: Function,
      required: true,
    },
    setMaskMode: {
      type: Function,
      required: true,
    },
    penToolSize: {
      type: Number,
      required: true,
    },
    setPenToolSize: {
      type: Function,
      required: true,
    },
  },
  methods: {},
})
</script>
