import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { Category, Transaction } from '../lib/api'
import TransactionForm from './TransactionForm.vue'

const categories: Category[] = [
  { id: 1, type: 'expense', name: '食費' },
  { id: 2, type: 'expense', name: '日用品' },
  { id: 11, type: 'income', name: '給与' },
]

function mountForm(props: Record<string, unknown> = {}) {
  return mount(TransactionForm, { props: { categories, initialDate: '2026-10-26', ...props } })
}

describe('TransactionForm', () => {
  it('uses the selected date as the initial value and shows the weekday', () => {
    const wrapper = mountForm()
    expect(wrapper.get('[data-testid="date-label"]').text()).toBe('2026年10月26日(月)')
    expect(wrapper.get('[data-date="2026-10-26"]').classes()).toContain('selected')
  })

  it('updates the date label and weekday when another date is picked on the calendar', async () => {
    const wrapper = mountForm()
    await wrapper.get('[data-date="2026-10-28"]').trigger('click')
    expect(wrapper.get('[data-testid="date-label"]').text()).toBe('2026年10月28日(水)')
  })

  it('can pick a date in another month via the calendar navigation', async () => {
    const wrapper = mountForm()
    await wrapper.get('[aria-label="次の月"]').trigger('click')
    expect(wrapper.get('.calendar-title').text()).toBe('2026年11月')
    await wrapper.get('[data-date="2026-11-03"]').trigger('click')
    expect(wrapper.get('[data-testid="date-label"]').text()).toBe('2026年11月3日(火)')
  })

  it('only lists categories matching the selected type', async () => {
    const wrapper = mountForm()
    expect(wrapper.findAll('option').map((o) => o.text())).toEqual(['食費', '日用品'])
    await wrapper.get('input[value="income"]').setValue(true)
    expect(wrapper.findAll('option').map((o) => o.text())).toEqual(['給与'])
  })

  it('emits submit with the parsed input', async () => {
    const wrapper = mountForm()
    await wrapper.get('input[name="amount"]').setValue('1,200')
    await wrapper.get('[data-date="2026-10-27"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]).toEqual([
      { type: 'expense', date: '2026-10-27', amount: 1200, categoryId: 1 },
    ])
  })

  it('shows validation errors and does not submit for invalid amounts', async () => {
    const wrapper = mountForm()
    for (const value of ['', '0', '-5', '12.5', 'abc']) {
      await wrapper.get('input[name="amount"]').setValue(value)
      await wrapper.get('form').trigger('submit')
      expect(wrapper.get('[role="alert"]').text()).toContain('金額は1以上の整数')
    }
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('prefills values when editing and emits an updated input', async () => {
    const tx: Transaction = { id: 5, type: 'expense', date: '2026-10-20', amount: 800, categoryId: 2, categoryName: '日用品' }
    const wrapper = mountForm({ transaction: tx })
    expect(wrapper.text()).toContain('収支を編集')
    expect((wrapper.get('input[name="amount"]').element as HTMLInputElement).value).toBe('800')
    expect(wrapper.get('[data-testid="date-label"]').text()).toBe('2026年10月20日(火)')
    await wrapper.get('input[name="amount"]').setValue('900')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]).toEqual([{ type: 'expense', date: '2026-10-20', amount: 900, categoryId: 2 }])
  })

  it('shows server errors and emits cancel', async () => {
    const wrapper = mountForm({ serverError: '指定したカテゴリが存在しません' })
    expect(wrapper.get('[role="alert"]').text()).toContain('指定したカテゴリが存在しません')
    await wrapper.get('[data-action="cancel"]').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
