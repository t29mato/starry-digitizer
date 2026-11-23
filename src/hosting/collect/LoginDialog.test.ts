import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { LoginResult } from './auth'
import LoginDialog from './LoginDialog.vue'

// INFO: the login dialog of the starryai build: labels, Enter, the errors,
// and that the password does not stay in the field

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

function mountDialog(
  props: Partial<{
    users: { id: string; name: string }[]
    guestAllowed: boolean
    reason: 'expired' | 'invalid' | 'elsewhere' | 'signed-out' | null
    lastUser: string | null
    closable: boolean
  }> = {},
  answer: LoginResult = { ok: true, user: { id: 'alice', name: 'Alice' } },
) {
  const signIn = jest.fn(async () => answer)
  const wrapper = mount(LoginDialog, {
    props: {
      modelValue: true,
      users: [],
      guestAllowed: true,
      signIn,
      ...props,
    },
    attachTo: document.body,
  })
  const find = (cy: string) =>
    document.body.querySelector(`[data-cy="${cy}"]`) as HTMLElement | null
  return { wrapper, signIn, find }
}

async function type(el: HTMLElement | null, value: string) {
  const input = el as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event('input'))
  input.dispatchEvent(new Event('change'))
  await nextTick()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('LoginDialog', () => {
  it('labels its fields and focuses the name first', async () => {
    const { find, wrapper } = mountDialog()
    await settle()
    const name = find('login-name') as HTMLInputElement
    const password = find('login-password') as HTMLInputElement
    expect(name.tagName).toBe('INPUT')
    expect(password.type).toBe('password')
    expect(password.autocomplete).toBe('current-password')
    const label = (el: HTMLElement) =>
      document.body.querySelector(`label[for="${el.id}"]`)?.textContent
    expect(label(name)).toBe('Name')
    expect(label(password)).toBe('Password')
    expect(document.activeElement).toBe(name)
    wrapper.unmount()
  })

  it("offers the server's names as a list and the last person first", async () => {
    const { find, wrapper } = mountDialog({
      users: [
        { id: 'alice', name: 'Alice' },
        { id: 'bob', name: 'Bob' },
      ],
      lastUser: 'bob',
      reason: 'expired',
    })
    await settle()
    const select = find('login-name') as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    expect(select.value).toBe('bob')
    expect(document.activeElement).toBe(find('login-password'))
    expect(find('login-reason')?.textContent).toContain('expired')
    wrapper.unmount()
  })

  it('signs in on Enter and empties the password field', async () => {
    const { find, signIn, wrapper } = mountDialog()
    await type(find('login-name'), 'alice')
    await type(find('login-password'), 'secret')
    find('login-password')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    await settle()
    expect(signIn).toHaveBeenCalledWith('alice', 'secret')
    expect((find('login-password') as HTMLInputElement).value).toBe('')
    expect(wrapper.emitted('signed-in')).toHaveLength(1)
    wrapper.unmount()
  })

  it.each([
    [{ ok: false, error: 'invalid_login' }, 'not correct'],
    [{ ok: false, error: 'rate_limited', retryAfter: 600 }, 'in 10 minutes'],
    [{ ok: false, error: 'rate_limited', retryAfter: 30 }, 'in 30 seconds'],
    [{ ok: false, error: 'network' }, 'could not be reached'],
    [{ ok: false, error: 'http', status: 500 }, 'HTTP 500'],
  ] as [LoginResult, string][])(
    'shows %j as an alert',
    async (answer, text) => {
      const { find, wrapper } = mountDialog({}, answer)
      await type(find('login-name'), 'alice')
      await type(find('login-password'), 'secret')
      find('login-submit')?.click()
      await settle()
      const alert = find('login-error')
      expect(alert?.getAttribute('role')).toBe('alert')
      expect(alert?.textContent).toContain(text)
      expect((find('login-password') as HTMLInputElement).value).toBe('')
      expect(wrapper.emitted('signed-in')).toBeUndefined()
      wrapper.unmount()
    },
  )

  it('asks for both fields before sending anything', async () => {
    const { find, signIn, wrapper } = mountDialog()
    find('login-submit')?.click()
    await settle()
    expect(signIn).not.toHaveBeenCalled()
    expect(find('login-error')?.textContent).toContain('Enter a name')
    wrapper.unmount()
  })

  it('offers Guest only when allowed', async () => {
    const allowed = mountDialog()
    allowed.find('login-guest')?.click()
    expect(allowed.wrapper.emitted('guest')).toHaveLength(1)
    allowed.wrapper.unmount()
    document.body.innerHTML = ''
    const refused = mountDialog({ guestAllowed: false })
    expect(refused.find('login-guest')).toBeNull()
    refused.wrapper.unmount()
  })

  it('closes on Esc only when it may be closed', async () => {
    const open = mountDialog({ closable: false })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(open.wrapper.emitted('close')).toBeUndefined()
    open.wrapper.unmount()
    const closable = mountDialog({ closable: true })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(closable.wrapper.emitted('close')).toHaveLength(1)
    closable.wrapper.unmount()
  })
})
