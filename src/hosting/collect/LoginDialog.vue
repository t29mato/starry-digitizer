<template>
  <!-- INFO: closable (Esc, a click outside) only when the person opened it
       from the footer; when the page needs a sign-in, records wait for it -->
  <sd-dialog
    :model-value="modelValue"
    title="Sign in"
    :max-width="420"
    @update:model-value="onClose"
  >
    <form
      class="login-dialog"
      data-cy="login-dialog"
      novalidate
      @submit.prevent="submit"
      @keydown.enter="onEnter"
    >
      <p v-if="reasonText" class="mb-2" data-cy="login-reason">
        {{ reasonText }}
      </p>
      <p class="mb-3 text-caption">{{ COLLECT_NOTICE }}</p>
      <div class="login-dialog__field">
        <label :for="ids.name">Name</label>
        <select
          v-if="users.length > 0"
          :id="ids.name"
          ref="nameRef"
          v-model="name"
          data-cy="login-name"
          autocomplete="username"
          :disabled="busy"
        >
          <option value="" disabled>Choose a name</option>
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
        </select>
        <input
          v-else
          :id="ids.name"
          ref="nameRef"
          v-model="name"
          data-cy="login-name"
          type="text"
          autocomplete="username"
          autocapitalize="off"
          spellcheck="false"
          :disabled="busy"
        />
      </div>
      <div class="login-dialog__field">
        <label :for="ids.password">Password</label>
        <input
          :id="ids.password"
          ref="passwordRef"
          v-model="password"
          data-cy="login-password"
          type="password"
          autocomplete="current-password"
          :disabled="busy"
          :aria-describedby="error ? ids.error : undefined"
        />
      </div>
      <p
        v-if="error"
        :id="ids.error"
        class="login-dialog__error"
        role="alert"
        data-cy="login-error"
      >
        {{ error }}
      </p>
      <div class="login-dialog__actions">
        <sd-button
          v-if="guestAllowed"
          variant="text"
          data-cy="login-guest"
          :disabled="busy"
          @click="$emit('guest')"
        >
          Continue as Guest
        </sd-button>
        <sd-button
          color="primary"
          data-cy="login-submit"
          :disabled="busy"
          @click="submit"
        >
          Sign in
        </sd-button>
      </div>
    </form>
  </sd-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { SdButton, SdDialog } from '@/presentation/ui'
import type { LoginResult, SignOutReason } from './auth'
import type { CollectUser } from './collectClient'
import { COLLECT_NOTICE } from './collectNoticeText'

// INFO: the password login of the starryai build (auth.ts, docs/design/
// starryai-auto.md §11). The password lives only in this field: it is
// handed to signIn() once and the field is emptied right after, whatever
// the answer.
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    users: CollectUser[]
    guestAllowed: boolean
    signIn: (user: string, password: string) => Promise<LoginResult>
    reason?: SignOutReason | null
    lastUser?: string | null
    closable?: boolean
  }>(),
  { reason: null, lastUser: null, closable: false },
)
const emit = defineEmits<{
  guest: []
  'signed-in': []
  close: []
}>()

// INFO: ids tie each label to its field (two dialogs never share one)
const uid = `login-${Math.random().toString(36).slice(2, 10)}`
const ids = {
  name: `${uid}-name`,
  password: `${uid}-password`,
  error: `${uid}-error`,
}

const name = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)
const nameRef = ref<HTMLInputElement | HTMLSelectElement | null>(null)
const passwordRef = ref<HTMLInputElement | null>(null)

const reasonText = computed(() => {
  switch (props.reason) {
    case 'expired':
      return 'The sign-in has expired. Sign in again.'
    case 'invalid':
      return 'The sign-in is no longer valid. Sign in again.'
    case 'elsewhere':
      return 'Signed out in another tab. Sign in again.'
    default:
      return ''
  }
})

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    error.value = ''
    password.value = ''
    if (!name.value && props.lastUser) {
      const known =
        props.users.length === 0 ||
        props.users.some((user) => user.id === props.lastUser)
      if (known) name.value = props.lastUser
    }
    await nextTick()
    focusFirst()
  },
  { immediate: true },
)

function focusFirst() {
  ;(name.value ? passwordRef.value : nameRef.value)?.focus()
}

function onClose(open: boolean) {
  if (!open && props.closable && !busy.value) emit('close')
}

// INFO: Enter in a field signs in (the buttons answer Enter themselves)
function onEnter(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.tagName === 'BUTTON') return
  event.preventDefault()
  void submit()
}

function waitText(seconds: number | undefined): string {
  if (!seconds) return 'Try again later.'
  if (seconds < 90) return `Try again in ${seconds} seconds.`
  return `Try again in ${Math.ceil(seconds / 60)} minutes.`
}

function errorText(result: Exclude<LoginResult, { ok: true }>): string {
  switch (result.error) {
    case 'invalid_login':
      return 'The name or password is not correct.'
    case 'rate_limited':
      return `Too many failed sign-ins. ${waitText(result.retryAfter)}`
    case 'invalid_params':
      return 'Enter a name and a password.'
    case 'login_disabled':
      return 'Sign-in is not used on this server any more. Reload the page.'
    case 'network':
      return 'The server could not be reached. Check the connection and try again.'
    default:
      return `Sign-in failed (HTTP ${result.status ?? '?'}). Try again later.`
  }
}

async function submit() {
  if (busy.value) return
  const user = name.value.trim()
  const secret = password.value
  // INFO: emptied before the request: the password is not left in the page
  password.value = ''
  if (!user || !secret) {
    error.value = 'Enter a name and a password.'
    await nextTick()
    focusFirst()
    return
  }
  busy.value = true
  error.value = ''
  let result: LoginResult
  try {
    result = await props.signIn(user, secret)
  } catch {
    result = { ok: false, error: 'network' }
  } finally {
    busy.value = false
  }
  if (result.ok) {
    emit('signed-in')
    return
  }
  error.value = errorText(result)
  await nextTick()
  if (result.error === 'invalid_login') passwordRef.value?.focus()
  else focusFirst()
}
</script>

<style scoped lang="scss">
.login-dialog {
  &__field {
    display: flex;
    flex-direction: column;
    margin-bottom: 12px;

    label {
      font-size: 0.8em;
      margin-bottom: 2px;
    }
    input,
    select {
      height: 32px;
      padding: 0 8px;
      border: 1px solid var(--sd-border, rgba(0, 0, 0, 0.24));
      border-radius: var(--sd-radius, 4px);
      background: var(--sd-surface, #fff);
      font: inherit;
      color: inherit;

      &:focus {
        outline: 2px solid var(--sd-primary, #1e88e5);
        outline-offset: 0;
      }
    }
  }
  &__error {
    margin-bottom: 8px;
    color: var(--sd-error, #c62828);
  }
  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}
</style>
