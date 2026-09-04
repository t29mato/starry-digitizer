<template>
  <div
    v-if="confirmer.isActive"
    class="c__state-confirmer d-flex justify-space-between align-center"
  >
    <p>{{ confirmer.message }}</p>
    <div class="d-flex">
      <sd-button
        class="mr-2"
        size="small"
        color="white"
        @click="handleOnClickCancel"
        >Cancel</sd-button
      >
      <sd-button size="small" color="primary" @click="handleOnClickConfirm"
        >Confirm</sd-button
      >
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { SdButton } from '@/presentation/ui'

export default defineComponent({
  components: { SdButton },
  setup() {
    const { confirmer } = useDigitizerContext()
    return { confirmer }
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
