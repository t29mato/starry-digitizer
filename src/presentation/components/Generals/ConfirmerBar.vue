<template>
  <div
    v-if="confirmer.isActive"
    class="c__state-confirmer d-flex justify-space-between align-center"
  >
    <p>{{ confirmer.message }}</p>
    <div class="d-flex">
      <v-btn
        class="mr-2"
        size="small"
        color="white"
        @click="handleOnClickCancel"
        >Cancel</v-btn
      >
      <v-btn size="small" color="primary" @click="handleOnClickConfirm"
        >Confirm</v-btn
      >
    </div>
  </div>
</template>

<script lang="ts">
import { Confirmer } from '@/application/services/confirmer'
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      confirmer: Confirmer.getInstance(),
    }
  },
  methods: {
    handleOnClickConfirm() {
      this.confirmer.handleOnConfirm()
      this.confirmer.inactivate()
    },
    handleOnClickCancel() {
      this.confirmer.handleOnCancel()
      this.confirmer.inactivate()
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__state-confirmer {
    margin: 8px 0;
    padding: 8px;
    background-color: rgb(255, 255, 195);
    font-size: 0.8rem;
    font-weight: bold;
  }
}
</style>
@/application/services/confirmer
