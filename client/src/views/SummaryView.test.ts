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
    if (u.pathname === '/api/summary/yearly') {
      const y = Number(u.searchParams.get('year'))
      const months = Array.from({ length: 12 }, (_, i) => month(y, i + 1, 0, 0))
      months[0] = month(y, 1, 100, 1000)
      return new Response(JSON.stringify({ year: y, expense: 100, income: 1000, balance: 900, months }))
    }
    if (u.pathname === '/api/transactions') {
      const from = u.searchParams.get('from') ?? ''
      const to = u.searchParams.get('to') ?? ''
      const all = [
        { id: 1, type: 'expense', date: '2026-10-05', amount: 20000, categoryId: 1, categoryName: '食費' },
        { id: 2, type: 'expense', date: '2026-10-12', amount: 10000, categoryId: 2, categoryName: '交通費' },
        { id: 3, type: 'income', date: '2026-10-25', amount: 250000, categoryId: 8, categoryName: '給与' },
      ]
      return new Response(JSON.stringify(all.filter((tx) => tx.date >= from && tx.date <= to)))
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

  it('shows the year (January to December) with 12 monthly rows', async () => {
    installFakeSummary()
    const wrapper = await mountView()
    await wrapper.get('[data-tab="yearly"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="period"]').text()).toContain('2026年')
    expect(wrapper.get('[data-testid="balance"]').text()).toBe('900円')
    const rows = wrapper.findAll('[data-row="month"]')
    expect(rows).toHaveLength(12)
    expect(rows[0]!.text()).toContain('2026年1月')
    expect(rows[11]!.text()).toContain('2026年12月')
  })

  it('switches the year', async () => {
    const fetchMock = installFakeSummary()
    const wrapper = await mountView()
    await wrapper.get('[data-tab="yearly"]').trigger('click')
    await flushPromises()
    await wrapper.get('[aria-label="前の年"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="period"]').text()).toContain('2025年')
    const urls = fetchMock.mock.calls.map((call) => String(call[0]))
    expect(urls).toContain('/api/summary/yearly?year=2025')
    expect(urls).toContain('/api/transactions?from=2025-01-01&to=2025-12-31')
  })

  it('shows expense and income pie charts for the month', async () => {
    installFakeSummary()
    const wrapper = await mountView()
    const expenseItems = wrapper.get('[data-chart="支出の内訳"]').findAll('[data-legend-item]')
    expect(expenseItems).toHaveLength(2)
    expect(expenseItems[0]!.text()).toContain('食費')
    expect(expenseItems[0]!.text()).toContain('20,000円')
    expect(expenseItems[0]!.text()).toContain('66.7%')
    expect(expenseItems[1]!.text()).toContain('交通費')
    const incomeChart = wrapper.get('[data-chart="収入の内訳"]')
    expect(incomeChart.text()).toContain('給与')
    expect(incomeChart.text()).toContain('100%')
  })

  it('shows an empty chart message for a month without transactions', async () => {
    installFakeSummary()
    const wrapper = await mountView()
    await wrapper.get('[aria-label="次の月"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="period"]').text()).toBe('2026年11月')
    expect(wrapper.get('[data-chart="支出の内訳"]').text()).toContain('データがありません')
    expect(wrapper.get('[data-chart="収入の内訳"]').text()).toContain('データがありません')
  })

  it('shows pie charts in the yearly view too', async () => {
    installFakeSummary()
    const wrapper = await mountView()
    await wrapper.get('[data-tab="yearly"]').trigger('click')
    await flushPromises()
    const expenseChart = wrapper.get('[data-chart="支出の内訳"]')
    expect(expenseChart.text()).toContain('食費')
    expect(expenseChart.findAll('[data-legend-item]')).toHaveLength(2)
  })

  it('uses orange shades for expenses and blue shades for income', async () => {
    installFakeSummary()
    const wrapper = await mountView()
    const expenseFills = wrapper
      .get('[data-chart="支出の内訳"]')
      .findAll('path, circle')
      .map((el) => el.attributes('fill'))
    expect(expenseFills.length).toBeGreaterThan(0)
    for (const fill of expenseFills) {
      expect(fill).toMatch(/^#(b3540e|dd6b20|ed8936|f6a055|f9b877|fbcf9d|fde3c3|fef1e3)$/)
    }
    const incomeFills = wrapper
      .get('[data-chart="収入の内訳"]')
      .findAll('path, circle')
      .map((el) => el.attributes('fill'))
    expect(incomeFills.length).toBeGreaterThan(0)
    for (const fill of incomeFills) {
      expect(fill).toMatch(/^#(1e4e8c|2b6cb0|3b82c4|5b9bd5|7fb3e0|a3c9ec|c7dff7|e3effb)$/)
    }
  })

  it('shows a balance chart with income in blue and expense in orange when both exist', async () => {
    installFakeSummary()
    const wrapper = await mountView()
    const chart = wrapper.get('[data-chart="収支の割合"]')
    const items = chart.findAll('[data-legend-item]')
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('収入')
    expect(items[0]!.text()).toContain('250,000円')
    expect(items[1]!.text()).toContain('支出')
    expect(items[1]!.text()).toContain('30,000円')
    const fills = chart.findAll('path').map((el) => el.attributes('fill'))
    expect(fills).toEqual(['#2b6cb0', '#dd6b20'])
  })

  it('orders the charts as expense, income, then balance', async () => {
    installFakeSummary()
    const wrapper = await mountView()
    const titles = wrapper.findAll('[data-chart]').map((el) => el.attributes('data-chart'))
    expect(titles).toEqual(['支出の内訳', '収入の内訳', '収支の割合'])
  })

  it('hides the balance chart when there is no data for the period', async () => {
    installFakeSummary()
    const wrapper = await mountView()
    await wrapper.get('[aria-label="次の月"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="period"]').text()).toBe('2026年11月')
    expect(wrapper.find('[data-chart="収支の割合"]').exists()).toBe(false)
  })

  it('shows an error when the server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed')))
    const wrapper = await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('サーバーに接続できません')
  })
})
