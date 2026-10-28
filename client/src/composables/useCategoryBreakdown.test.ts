import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCategoryBreakdown } from './useCategoryBreakdown'

function fakeFetch(transactions: unknown[]) {
  const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify(transactions)))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useCategoryBreakdown', () => {
  it('aggregates transactions by category and type, sorted by amount descending', async () => {
    fakeFetch([
      { id: 1, type: 'expense', date: '2026-10-01', amount: 5000, categoryId: 1, categoryName: '食費' },
      { id: 2, type: 'expense', date: '2026-10-02', amount: 15000, categoryId: 2, categoryName: '家賃' },
      { id: 3, type: 'expense', date: '2026-10-03', amount: 3000, categoryId: 1, categoryName: '食費' },
      { id: 4, type: 'income', date: '2026-10-25', amount: 250000, categoryId: 8, categoryName: '給与' },
    ])
    const { breakdown, load } = useCategoryBreakdown()
    await load('2026-10-01', '2026-10-31')
    expect(breakdown.value?.expense).toEqual([
      { categoryId: 2, name: '家賃', amount: 15000 },
      { categoryId: 1, name: '食費', amount: 8000 },
    ])
    expect(breakdown.value?.income).toEqual([{ categoryId: 8, name: '給与', amount: 250000 }])
  })

  it('requests transactions for the given range', async () => {
    const fetchMock = fakeFetch([])
    const { load } = useCategoryBreakdown()
    await load('2026-04-01', '2027-03-31')
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/transactions?from=2026-04-01&to=2027-03-31')
  })
})
