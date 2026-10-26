import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import App from './App.vue'
import { createAppRouter } from './router'

afterEach(() => vi.unstubAllGlobals())

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.startsWith('/api/summary/monthly')) {
        return new Response(JSON.stringify({ year: 2026, month: 10, expense: 0, income: 0, balance: 0 }))
      }
      return new Response('[]')
    }),
  )
}

describe('navigation', () => {
  it('moves between the calendar page and the summary page', async () => {
    stubFetch()
    const router = createAppRouter(createMemoryHistory())
    router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.find('.calendar').exists()).toBe(true)
    expect(wrapper.find('[data-view="monthly"]').exists()).toBe(false)

    await wrapper.get('[data-nav="summary"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/summary')
    expect(wrapper.find('[data-view="monthly"]').exists()).toBe(true)
    expect(wrapper.find('.calendar').exists()).toBe(false)

    await wrapper.get('[data-nav="calendar"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/')
    expect(wrapper.find('.calendar').exists()).toBe(true)
  })
})
