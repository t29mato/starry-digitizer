<template>
  <span class="auth-status" data-cy="auth-status">
    <template v-if="userName">
      Signed in as {{ userName }} ·
      <button
        type="button"
        class="auth-status__action"
        data-cy="auth-sign-out"
        :disabled="busy"
        @click="$emit('sign-out')"
      >
        Sign out
      </button>
    </template>
    <template v-else>
      Guest ·
      <button
        type="button"
        class="auth-status__action"
        data-cy="auth-sign-in"
        @click="$emit('sign-in')"
      >
        Sign in
      </button>
    </template>
  </span>
</template>

<script setup lang="ts">
// INFO: the footer line of the password login (auth.ts). Shown only when
// the server uses passwords.
defineProps<{ userName: string | null; busy?: boolean }>()
defineEmits<{ 'sign-out': []; 'sign-in': [] }>()
</script>

<style scoped lang="scss">
.auth-status {
  font-size: 0.8em;
  &__action {
    padding: 0 2px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
}
</style>
