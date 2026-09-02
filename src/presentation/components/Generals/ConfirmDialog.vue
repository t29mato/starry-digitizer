<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="handleDialogUpdate"
    max-width="480"
  >
    <v-card>
      <v-card-title class="text-h6">{{ title }}</v-card-title>
      <v-card-text>{{ message }}</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="handleCancel">{{ cancelText }}</v-btn>
        <v-btn :color="confirmColor" variant="flat" @click="handleConfirm">{{
          confirmText
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

// INFO: Reusable Vuetify dialog replacing native window.confirm() (#270) —
// unstylable and known to hang automation/extensions. Parents own the
// modelValue (open/closed) and listen for 'confirm'/'cancel' to run their
// pending action, instead of blocking on a synchronous return value.
export default defineComponent({
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    title: {
      type: String,
      default: 'Confirm',
    },
    message: {
      type: String,
      required: true,
    },
    confirmText: {
      type: String,
      default: 'OK',
    },
    cancelText: {
      type: String,
      default: 'Cancel',
    },
    // INFO: pass 'error' for destructive/irreversible actions
    confirmColor: {
      type: String,
      default: 'primary',
    },
  },
  emits: ['update:modelValue', 'confirm', 'cancel'],
  methods: {
    handleDialogUpdate(value: boolean) {
      this.$emit('update:modelValue', value)
      // INFO: closed via Escape key or backdrop click — treat as cancel
      if (!value) {
        this.$emit('cancel')
      }
    },
    handleConfirm() {
      this.$emit('update:modelValue', false)
      this.$emit('confirm')
    },
    handleCancel() {
      this.$emit('update:modelValue', false)
      this.$emit('cancel')
    },
  },
})
</script>
