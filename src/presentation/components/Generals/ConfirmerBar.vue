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
    font-weight: bold;

    // INFO: the 0.8 multiplier is on the message, not on the bar. It used to
    // be `font-size: 0.8rem` on the bar itself, which was harmless while the
    // size was anchored to <html>; as `em` it would also become the reference
    // for the two SdButtons in this bar, and their own `0.75em` would compound
    // down to 8.4px instead of the 10.5px they render at today (measured).
    // The bar holds no text of its own, so moving the rule here is a no-op for
    // the look and keeps both sizes relative to the host's font.
    p {
      font-size: 0.8em;
    }
  }
}
</style>
