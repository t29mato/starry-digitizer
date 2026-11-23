import { mount } from '@vue/test-utils'
import MyWorkDialog from './MyWorkDialog.vue'
import { parseWorkList, WorkList } from './myWork'

// INFO: the My work dialog: the list, the older-backend note, the search
// going to the server, and Open

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

const LIST: WorkList = parseWorkList({
  works: [
    {
      project_id: '44444444-4444-4444-8444-444444444444',
      updated_at: '2026-11-24T03:34:00Z',
      format: 'starry-digitizer/project',
      files: [
        { index: 0, sha256: 'a'.repeat(64), name: 'chart.png', size: 4096 },
      ],
      summary: { axes: 1, datasets: 2, points: 40 },
      view: { file_index: 0 },
    },
  ],
  total: 1,
  offset: 0,
})

function mountDialog(list: () => Promise<WorkList>) {
  const listFn = jest.fn(list)
  const thumbnail = jest.fn(async () => null)
  const wrapper = mount(MyWorkDialog, {
    props: { modelValue: true, list: listFn, thumbnail },
    attachTo: document.body,
  })
  const find = (cy: string) =>
    document.body.querySelector(`[data-cy="${cy}"]`) as HTMLElement | null
  return { wrapper, listFn, thumbnail, find }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('MyWorkDialog', () => {
  it('lists the works and emits open', async () => {
    const { wrapper, find, thumbnail } = mountDialog(async () => LIST)
    await settle()
    expect(find('my-work-count')?.textContent).toContain('1 work')
    const item = find('my-work-44444444-4444-4444-8444-444444444444')
    expect(item?.textContent).toContain('chart.png')
    expect(item?.textContent).toContain('2 datasets · 40 points · 4 KB')
    expect(thumbnail).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
    )
    find('my-work-open')?.click()
    expect(wrapper.emitted('open')?.[0]?.[0]).toMatchObject({
      projectId: '44444444-4444-4444-8444-444444444444',
    })
    wrapper.unmount()
  })

  it('says when the server keeps no starry-digitizer work', async () => {
    const { wrapper } = mountDialog(async () => ({
      works: [],
      total: 0,
      offset: 0,
      unsupported: true,
    }))
    await settle()
    expect(document.body.textContent).toContain(
      'This server does not keep starry-digitizer work yet.',
    )
    wrapper.unmount()
  })

  it('shows the error of the list', async () => {
    const { wrapper } = mountDialog(async () => {
      throw new Error('The server could not be reached. Try again later.')
    })
    await settle()
    expect(document.body.querySelector('[role="alert"]')?.textContent).toBe(
      'The server could not be reached. Try again later.',
    )
    wrapper.unmount()
  })

  it('asks the server again for a search', async () => {
    jest.useFakeTimers()
    const { wrapper, listFn, find } = mountDialog(async () => LIST)
    const input = find('my-work-search') as HTMLInputElement
    input.value = 'Fig'
    input.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()
    jest.advanceTimersByTime(300)
    jest.useRealTimers()
    await settle()
    expect(listFn).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'Fig', offset: 0 }),
    )
    wrapper.unmount()
  })
})
