<template>
  <div>
    <v-textarea
      readonly
      :value="text"
      outlined
      hide-details="true"
    ></v-textarea>
    <v-btn @click="copy" text :disabled="text.length === 0"
      >Copy to Clipboard</v-btn
    >
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import colors from 'vuetify/lib/util/colors'
export default Vue.extend({
  data() {
    return {
      activeColor: colors.green.lighten5,
    }
  },
  props: {
    text: {
      type: String,
      required: true,
    },
  },
  methods: {
    copy(): void {
      navigator.clipboard.writeText(this.text)
    },
  },
})
</script>
