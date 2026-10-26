import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SummaryView from './SummaryView.vue'

function installFakeSummary() {
  const month = (year: number, m: number, expense: number, income: number) => ({
    year,
    month: m,
    expense,
    income,
    balance: income - expense,
  })
  const fetchMock = vi.fn(async (url: string) => {
    const u = new URL(url, 'http://localhost')
    if (u.pathname === '/api/summary/monthly') {
      const y = Number(u.searchParams.get('year'))
      const m = Number(u.searchParams.get('month'))
      const data = m === 10 ? month(y, m, 30000, 250000) : m === 9 ? month(y, m, 8000, 1000) : month(y, m, 0, 0)
      return new Response(JSON.stringify(data))
    }
    if (u.pathname === '/api/summary/fiscal-year') {
      const y = Number(u.searchParams.get('year'))
      const months = Array.from({ length: 12 }, (_, i) => {
        const m = ((3 + i) % 12) + 1
        return month(m >= 4 ? y : y + 1, m, 0, 0)
      })
      months[0] = month(y, 4, 100, 1000)
      return new Response(JSON.stringify({ year: y, expense: 100, income: 1000, balance: 900, months }))
    }
    return new Response('{}', { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 26, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function mountView() {
  const wrapper = mount(SummaryView)
  await flushPromises()
  return wrapper
}

describe('SummaryView', () => {
  it('shows the monthly totals and balance for the current month', async () => {
    installFakeSummary()
    const wrapper = await mountView()
    expect(wrapper.get('[data-testid="period"]').text()).toBe('2026年10月')
    expect(wrapper.get('[data-testid="expense"]').text()).toBe('30,000円')
    expect(wrapper.get('[data-testid="income"]').text()).toBe('250,000円')
    expect(wrapper.get('[data-testid="balance"]').text()).toBe('220,000円')
    expect(wrapper.get('[data-testid="balance"]').classes()).toContain('positive')
  })

  it('moves to the previous month and distinguishes a negative balance', async () => {
    installFakeSummary()
    const wrapper = await mountView()
    await wrapper.get('[aria-label="前の月"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="period"]').text()).toBe('2026年9月')
    expect(wrapper.get('[data-testid="balance"]').text()).toBe('-7,000円')
    expect(wrapper.get('[data-testid="balance"]').classes()).toContain('negative')
  })

  it('shows zeros for a month without transactions and crosses year boundaries', async () => {
    installFakeSummary()
    const wrapper = await mountView()
    for (let i = 0; i < 10; i++) await wrapper.get('[aria-label="次の月"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="period"]').text()).toBe('2027年8月')
    expect(wrapper.get('[data-testid="expense"]').text()).toBe('0円')
    expect(wrapper.get('[data-testid="balance"]').text()).toBe('0円')
  })

  it('shows the fiscal year (April start) with 12 monthly rows', async () => {
    installFakeSummary()
    const wrapper = await mountView()
    await wrapper.get('[data-tab="fiscal"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="period"]').text()).toContain('2026年度')
    expect(wrapper.get('[data-testid="balance"]').text()).toBe('900円')
    const rows = wrapper.findAll('[data-row="month"]')
    expect(rows).toHaveLength(12)
    expect(rows[0]!.text()).toContain('2026年4月')
    expect(rows[11]!.text()).toContain('2027年3月')
  })

  it('switches the fiscal year', async () => {
    const fetchMock = installFakeSummary()
    const wrapper = await mountView()
    await wrapper.get('[data-tab="fiscal"]').trigger('click')
    await flushPromises()
    await wrapper.get('[aria-label="前の年度"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="period"]').text()).toContain('2025年度')
    expect(fetchMock.mock.calls.at(-1)![0]).toBe('/api/summary/fiscal-year?year=2025')
  })

  it('shows an error when the server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed')))
    const wrapper = await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('サーバーに接続できません')
  })
})
