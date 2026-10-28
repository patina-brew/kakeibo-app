import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CalendarMonth from './CalendarMonth.vue'

function mountCalendar(props: Partial<InstanceType<typeof CalendarMonth>['$props']> = {}) {
  return mount(CalendarMonth, {
    props: { year: 2026, month: 10, selected: null, dayMarkers: new Map(), ...props },
  })
}

describe('CalendarMonth', () => {
  it('renders the title and all days of the month', () => {
    const wrapper = mountCalendar()
    expect(wrapper.find('.calendar-title').text()).toBe('2026年10月')
    expect(wrapper.find('[data-date="2026-10-01"]').exists()).toBe(true)
    expect(wrapper.find('[data-date="2026-10-31"]').exists()).toBe(true)
  })

  it('emits select when a date is clicked', async () => {
    const wrapper = mountCalendar()
    await wrapper.find('[data-date="2026-10-15"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['2026-10-15'])
  })

  it('highlights the selected date', () => {
    const wrapper = mountCalendar({ selected: '2026-10-15' })
    expect(wrapper.find('[data-date="2026-10-15"]').classes()).toContain('selected')
    expect(wrapper.find('[data-date="2026-10-16"]').classes()).not.toContain('selected')
  })

  it('emits navigate with -1 / 1 for previous / next month', async () => {
    const wrapper = mountCalendar()
    await wrapper.find('[aria-label="前の月"]').trigger('click')
    await wrapper.find('[aria-label="次の月"]').trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([[-1], [1]])
  })

  it('shows an orange marker for expense days and a blue marker for income days', () => {
    const dayMarkers = new Map([
      ['2026-10-05', new Set(['expense' as const])],
      ['2026-10-20', new Set(['income' as const])],
      ['2026-10-26', new Set(['expense' as const, 'income' as const])],
    ])
    const wrapper = mountCalendar({ dayMarkers })
    expect(wrapper.find('[data-date="2026-10-05"] [data-testid="marker-expense"]').exists()).toBe(true)
    expect(wrapper.find('[data-date="2026-10-05"] [data-testid="marker-income"]').exists()).toBe(false)
    expect(wrapper.find('[data-date="2026-10-20"] [data-testid="marker-income"]').exists()).toBe(true)
    expect(wrapper.find('[data-date="2026-10-20"] [data-testid="marker-expense"]').exists()).toBe(false)
    expect(wrapper.find('[data-date="2026-10-06"] [data-testid="marker-expense"]').exists()).toBe(false)
  })

  it('shows both markers on a day that has expense and income', () => {
    const dayMarkers = new Map([['2026-10-26', new Set(['expense' as const, 'income' as const])]])
    const wrapper = mountCalendar({ dayMarkers })
    const cell = wrapper.get('[data-date="2026-10-26"]')
    expect(cell.get('[data-testid="marker-expense"]').classes()).toContain('expense')
    expect(cell.get('[data-testid="marker-income"]').classes()).toContain('income')
    expect(wrapper.findAll('[data-testid="marker-expense"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-testid="marker-income"]')).toHaveLength(1)
  })

  it('removes the markers when the map no longer contains the date', async () => {
    const wrapper = mountCalendar({ dayMarkers: new Map([['2026-10-05', new Set(['expense' as const])]]) })
    await wrapper.setProps({ dayMarkers: new Map() })
    expect(wrapper.find('[data-testid="marker-expense"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="marker-income"]').exists()).toBe(false)
  })
})
