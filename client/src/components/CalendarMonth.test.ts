import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CalendarMonth from './CalendarMonth.vue'

function mountCalendar(props: Partial<InstanceType<typeof CalendarMonth>['$props']> = {}) {
  return mount(CalendarMonth, {
    props: { year: 2026, month: 10, selected: null, markedDates: new Set<string>(), ...props },
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

  it('shows a marker only on dates with transactions', () => {
    const wrapper = mountCalendar({ markedDates: new Set(['2026-10-05', '2026-10-20']) })
    expect(wrapper.find('[data-date="2026-10-05"] [data-testid="marker"]').exists()).toBe(true)
    expect(wrapper.find('[data-date="2026-10-20"] [data-testid="marker"]').exists()).toBe(true)
    expect(wrapper.find('[data-date="2026-10-06"] [data-testid="marker"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="marker"]')).toHaveLength(2)
  })

  it('removes the marker when the set no longer contains the date', async () => {
    const wrapper = mountCalendar({ markedDates: new Set(['2026-10-05']) })
    await wrapper.setProps({ markedDates: new Set<string>() })
    expect(wrapper.findAll('[data-testid="marker"]')).toHaveLength(0)
  })
})
