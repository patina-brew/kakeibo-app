import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Transaction } from '../lib/api'
import DayTransactions from './DayTransactions.vue'

const expense: Transaction = { id: 1, type: 'expense', date: '2026-10-26', amount: 1200, categoryId: 1, categoryName: '食費' }
const income: Transaction = { id: 2, type: 'income', date: '2026-10-26', amount: 250000, categoryId: 11, categoryName: '給与' }

afterEach(() => vi.restoreAllMocks())

describe('DayTransactions', () => {
  it('shows the date with weekday and the registered transactions', () => {
    const wrapper = mount(DayTransactions, { props: { date: '2026-10-26', transactions: [expense, income] } })
    expect(wrapper.text()).toContain('2026年10月26日(月)')
    const items = wrapper.findAll('.item')
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('支出')
    expect(items[0]!.text()).toContain('食費')
    expect(items[0]!.text()).toContain('1,200円')
    expect(items[1]!.text()).toContain('収入')
    expect(items[1]!.text()).toContain('250,000円')
  })

  it('shows an empty message when there are no transactions', () => {
    const wrapper = mount(DayTransactions, { props: { date: '2026-10-27', transactions: [] } })
    expect(wrapper.text()).toContain('登録された収支はありません')
    expect(wrapper.find('.item').exists()).toBe(false)
  })

  it('emits add and edit', async () => {
    const wrapper = mount(DayTransactions, { props: { date: '2026-10-26', transactions: [expense] } })
    await wrapper.find('button.primary').trigger('click')
    await wrapper.find('[data-action="edit"]').trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
    expect(wrapper.emitted('edit')?.[0]).toEqual([expense])
  })

  it('emits remove only after the user confirms', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const wrapper = mount(DayTransactions, { props: { date: '2026-10-26', transactions: [expense] } })

    confirm.mockReturnValue(false)
    await wrapper.find('[data-action="delete"]').trigger('click')
    expect(wrapper.emitted('remove')).toBeUndefined()

    confirm.mockReturnValue(true)
    await wrapper.find('[data-action="delete"]').trigger('click')
    expect(wrapper.emitted('remove')?.[0]).toEqual([expense])
  })
})
