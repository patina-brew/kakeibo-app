import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '../lib/api'
import CategoryManager from './CategoryManager.vue'

const categories: Category[] = [
  { id: 1, type: 'expense', name: '食費' },
  { id: 2, type: 'expense', name: '日用品' },
  { id: 11, type: 'income', name: '給与' },
]

afterEach(() => vi.restoreAllMocks())

describe('CategoryManager', () => {
  it('lists categories grouped by type', () => {
    const wrapper = mount(CategoryManager, { props: { categories } })
    expect(wrapper.get('[data-section="expense"]').text()).toContain('食費')
    expect(wrapper.get('[data-section="expense"]').text()).not.toContain('給与')
    expect(wrapper.get('[data-section="income"]').text()).toContain('給与')
  })

  it('emits add with the type and trimmed name, then clears the input', async () => {
    const wrapper = mount(CategoryManager, { props: { categories } })
    const input = wrapper.get('[data-section="expense"] [data-input="new"]')
    await input.setValue('  趣味 ')
    await wrapper.get('[data-section="expense"] form').trigger('submit')
    expect(wrapper.emitted('add')?.[0]).toEqual(['expense', '趣味'])
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('ignores an empty new name', async () => {
    const wrapper = mount(CategoryManager, { props: { categories } })
    await wrapper.get('[data-section="income"] form').trigger('submit')
    expect(wrapper.emitted('add')).toBeUndefined()
  })

  it('renames a category', async () => {
    const wrapper = mount(CategoryManager, { props: { categories } })
    await wrapper.get('[data-category-id="1"] [data-action="edit"]').trigger('click')
    const input = wrapper.get('[data-category-id="1"] [data-input="rename"]')
    expect((input.element as HTMLInputElement).value).toBe('食費')
    await input.setValue('食事')
    await wrapper.get('[data-category-id="1"] [data-action="save"]').trigger('click')
    expect(wrapper.emitted('rename')?.[0]).toEqual([1, '食事'])
  })

  it('emits remove only after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const wrapper = mount(CategoryManager, { props: { categories } })
    confirm.mockReturnValue(false)
    await wrapper.get('[data-category-id="2"] [data-action="delete"]').trigger('click')
    expect(wrapper.emitted('remove')).toBeUndefined()
    confirm.mockReturnValue(true)
    await wrapper.get('[data-category-id="2"] [data-action="delete"]').trigger('click')
    expect(wrapper.emitted('remove')?.[0]).toEqual([categories[1]])
  })

  it('shows an error such as "category in use"', () => {
    const wrapper = mount(CategoryManager, {
      props: { categories, error: '収支で使用中のカテゴリは削除できません' },
    })
    expect(wrapper.get('[role="alert"]').text()).toContain('使用中')
  })
})
