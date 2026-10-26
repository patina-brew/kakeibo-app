import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CalendarView from './CalendarView.vue'

interface Cat {
  id: number
  type: string
  name: string
}
interface Tx {
  id: number
  type: string
  date: string
  amount: number
  categoryId: number
  categoryName: string
}

// メモリ上の簡易サーバー(fetch をモックして API の振る舞いを再現する)
function installFakeServer(initial: Tx[]) {
  const cats: Cat[] = [
    { id: 1, type: 'expense', name: '食費' },
    { id: 2, type: 'expense', name: '日用品' },
    { id: 11, type: 'income', name: '給与' },
  ]
  let txs = [...initial]
  let nextId = 100

  const json = (body: unknown, status = 200) =>
    new Response(status === 204 ? null : JSON.stringify(body), { status })

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = new URL(url, 'http://localhost')
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) : {}
      const nameOf = (id: number) => cats.find((c) => c.id === id)?.name ?? ''

      if (u.pathname === '/api/categories' && method === 'GET') return json(cats)
      if (u.pathname.startsWith('/api/categories/') && method === 'DELETE') {
        const id = Number(u.pathname.split('/').pop())
        if (txs.some((t) => t.categoryId === id)) return json({ error: '収支で使用中のカテゴリは削除できません' }, 409)
        cats.splice(cats.findIndex((c) => c.id === id), 1)
        return json(null, 204)
      }
      if (u.pathname === '/api/transactions' && method === 'GET') {
        const from = u.searchParams.get('from')!
        const to = u.searchParams.get('to')!
        return json(txs.filter((t) => t.date >= from && t.date <= to))
      }
      if (u.pathname === '/api/transactions' && method === 'POST') {
        const tx = { id: nextId++, ...body, categoryName: nameOf(body.categoryId) }
        txs.push(tx)
        return json(tx, 201)
      }
      const m = u.pathname.match(/^\/api\/transactions\/(\d+)$/)
      if (m && method === 'PUT') {
        const id = Number(m[1])
        txs = txs.map((t) => (t.id === id ? { id, ...body, categoryName: nameOf(body.categoryId) } : t))
        return json(txs.find((t) => t.id === id))
      }
      if (m && method === 'DELETE') {
        txs = txs.filter((t) => t.id !== Number(m[1]))
        return json(null, 204)
      }
      return json({ error: 'not found' }, 404)
    }),
  )
  return { getTxs: () => txs }
}

const food = (id: number, date: string, amount: number): Tx => ({
  id,
  type: 'expense',
  date,
  amount,
  categoryId: 1,
  categoryName: '食費',
})

async function mountView() {
  const wrapper = mount(CalendarView, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 26, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('CalendarView', () => {
  it('shows the current month and the transactions of the selected day, with markers', async () => {
    installFakeServer([food(1, '2026-10-26', 1200), food(2, '2026-10-20', 500)])
    const wrapper = await mountView()
    expect(wrapper.get('.calendar-title').text()).toBe('2026年10月')
    expect(wrapper.get('.day-header').text()).toContain('2026年10月26日(月)')
    expect(wrapper.findAll('.item')).toHaveLength(1)
    expect(wrapper.get('.item').text()).toContain('1,200円')
    expect(wrapper.findAll('[data-testid="marker"]')).toHaveLength(2)
  })

  it('shows the transactions of another date when it is selected', async () => {
    installFakeServer([food(1, '2026-10-26', 1200), food(2, '2026-10-20', 500)])
    const wrapper = await mountView()
    await wrapper.get('[data-date="2026-10-20"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('.item').text()).toContain('500円')
    await wrapper.get('[data-date="2026-10-21"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('登録された収支はありません')
  })

  it('creates a transaction from the dialog and refreshes the list and markers', async () => {
    installFakeServer([])
    const wrapper = await mountView()
    expect(wrapper.findAll('[data-testid="marker"]')).toHaveLength(0)

    await wrapper.get('button.primary').trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.get('[data-testid="date-label"]').text()).toBe('2026年10月26日(月)')
    await dialog.get('[data-date="2026-10-27"]').trigger('click')
    await dialog.get('input[name="amount"]').setValue('800')
    await dialog.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('.day-header').text()).toContain('2026年10月27日(火)')
    expect(wrapper.get('.item').text()).toContain('800円')
    expect(wrapper.findAll('[data-testid="marker"]')).toHaveLength(1)
  })

  it('edits a transaction', async () => {
    const server = installFakeServer([food(1, '2026-10-26', 1200)])
    const wrapper = await mountView()
    await wrapper.get('[data-action="edit"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    await dialog.get('input[name="amount"]').setValue('1500')
    await dialog.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('.item').text()).toContain('1,500円')
    expect(server.getTxs()[0]!.amount).toBe(1500)
  })

  it('keeps the transaction when deletion is cancelled', async () => {
    const server = installFakeServer([food(1, '2026-10-26', 1200)])
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = await mountView()
    await wrapper.get('[data-action="delete"]').trigger('click')
    await flushPromises()
    expect(server.getTxs()).toHaveLength(1)
    expect(wrapper.findAll('.item')).toHaveLength(1)
  })

  it('clears the list and the marker after deleting the last transaction of the day', async () => {
    const server = installFakeServer([food(1, '2026-10-26', 1200)])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountView()
    expect(wrapper.findAll('[data-testid="marker"]')).toHaveLength(1)
    await wrapper.get('[data-action="delete"]').trigger('click')
    await flushPromises()
    expect(server.getTxs()).toHaveLength(0)
    expect(wrapper.text()).toContain('登録された収支はありません')
    expect(wrapper.findAll('[data-testid="marker"]')).toHaveLength(0)
  })

  it('moves to another month with the navigation buttons and loads that month', async () => {
    installFakeServer([food(1, '2026-11-05', 700)])
    const wrapper = await mountView()
    expect(wrapper.findAll('[data-testid="marker"]')).toHaveLength(0)
    await wrapper.get('[aria-label="次の月"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('.calendar-title').text()).toBe('2026年11月')
    expect(wrapper.findAll('[data-testid="marker"]')).toHaveLength(1)
  })

  it('shows an error when deleting a category in use', async () => {
    installFakeServer([food(1, '2026-10-26', 1200)])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountView()
    await wrapper.get('[data-action="open-categories"]').trigger('click')
    const manager = wrapper.get('[aria-label="カテゴリ管理"]')
    await manager.get('[data-category-id="1"] [data-action="delete"]').trigger('click')
    await flushPromises()
    expect(manager.get('[role="alert"]').text()).toContain('使用中')
    expect(manager.find('[data-category-id="1"]').exists()).toBe(true)
  })

  it('deletes an unused category from the manager', async () => {
    installFakeServer([])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountView()
    await wrapper.get('[data-action="open-categories"]').trigger('click')
    const manager = wrapper.get('[aria-label="カテゴリ管理"]')
    await manager.get('[data-category-id="2"] [data-action="delete"]').trigger('click')
    await flushPromises()
    expect(manager.find('[data-category-id="2"]').exists()).toBe(false)
  })
})
