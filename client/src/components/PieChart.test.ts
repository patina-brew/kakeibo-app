import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PieChart from './PieChart.vue'

const slices = [
  { label: '食費', value: 30000, color: '#2b6cb0' },
  { label: '交通費', value: 10000, color: '#38a169' },
]

describe('PieChart', () => {
  it('shows the title and a legend with amounts and percentages', () => {
    const wrapper = mount(PieChart, { props: { title: '支出の内訳', slices } })
    expect(wrapper.get('[data-chart="支出の内訳"] .title').text()).toBe('支出の内訳')
    const items = wrapper.findAll('[data-legend-item]')
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('食費')
    expect(items[0]!.text()).toContain('30,000円')
    expect(items[0]!.text()).toContain('75%')
    expect(items[1]!.text()).toContain('交通費')
    expect(items[1]!.text()).toContain('25%')
  })

  it('draws one path per slice', () => {
    const wrapper = mount(PieChart, { props: { title: '支出の内訳', slices } })
    expect(wrapper.findAll('path')).toHaveLength(2)
    expect(wrapper.find('circle').exists()).toBe(false)
  })

  it('draws a circle when a single slice fills the whole chart', () => {
    const wrapper = mount(PieChart, {
      props: { title: '収入の内訳', slices: [{ label: '給与', value: 250000, color: '#000000' }] },
    })
    expect(wrapper.find('circle').exists()).toBe(true)
    expect(wrapper.findAll('path')).toHaveLength(0)
    expect(wrapper.get('[data-legend-item]').text()).toContain('100%')
  })

  it('shows an empty message when there is no data', () => {
    const wrapper = mount(PieChart, { props: { title: '支出の内訳', slices: [] } })
    expect(wrapper.text()).toContain('データがありません')
    expect(wrapper.find('svg').exists()).toBe(false)
  })
})
