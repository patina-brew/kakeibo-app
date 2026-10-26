import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCategories, useMonthTransactions } from './useLedger'
import { useSummary } from './useSummary'

type Handler = (url: string, init?: RequestInit) => { status?: number; body?: unknown }

function mockFetch(handler: Handler) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const { status = 200, body } = handler(url, init)
    return new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const tx = (id: number, date: string) => ({
  id,
  type: 'expense',
  date,
  amount: 100,
  categoryId: 1,
  categoryName: '食費',
})

beforeEach(() => vi.unstubAllGlobals())
afterEach(() => vi.unstubAllGlobals())

describe('useMonthTransactions', () => {
  it('loads the month range and exposes dates that have transactions', async () => {
    const fetchMock = mockFetch(() => ({ body: [tx(1, '2026-10-05'), tx(2, '2026-10-05'), tx(3, '2026-10-20')] }))
    const ledger = useMonthTransactions()
    await ledger.load(2026, 10)
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/transactions?from=2026-10-01&to=2026-10-31')
    expect([...ledger.datesWithTransactions.value].sort()).toEqual(['2026-10-05', '2026-10-20'])
    expect(ledger.forDate('2026-10-05')).toHaveLength(2)
    expect(ledger.forDate('2026-10-06')).toHaveLength(0)
  })

  it('reloads after create, update and delete', async () => {
    let list = [tx(1, '2026-10-05')]
    const fetchMock = mockFetch((_url, init) => {
      if (init?.method === 'POST') {
        list = [...list, tx(2, '2026-10-06')]
        return { status: 201, body: tx(2, '2026-10-06') }
      }
      if (init?.method === 'PUT') return { body: tx(1, '2026-10-05') }
      if (init?.method === 'DELETE') {
        list = []
        return { status: 204 }
      }
      return { body: list }
    })
    const ledger = useMonthTransactions()
    await ledger.load(2026, 10)
    const input = { type: 'expense' as const, date: '2026-10-06', amount: 100, categoryId: 1 }

    await ledger.create(input)
    expect(ledger.transactions.value).toHaveLength(2)
    expect(JSON.parse(String(fetchMock.mock.calls.find((c) => c[1]?.method === 'POST')![1]!.body))).toEqual(input)

    await ledger.update(1, input)
    expect(fetchMock.mock.calls.some((c) => c[0] === '/api/transactions/1' && c[1]?.method === 'PUT')).toBe(true)

    await ledger.remove(1)
    expect(ledger.transactions.value).toHaveLength(0)
  })

  it('surfaces server error messages', async () => {
    mockFetch(() => ({ status: 400, body: { error: '金額は1以上の整数で指定してください' } }))
    const ledger = useMonthTransactions()
    await expect(
      ledger.create({ type: 'expense', date: '2026-10-06', amount: 0, categoryId: 1 }),
    ).rejects.toThrow('金額は1以上の整数で指定してください')
  })
})

describe('useCategories', () => {
  it('filters by type and reloads after changes', async () => {
    let list = [
      { id: 1, type: 'expense', name: '食費' },
      { id: 2, type: 'income', name: '給与' },
    ]
    mockFetch((_url, init) => {
      if (init?.method === 'POST') {
        list = [...list, { id: 3, type: 'expense', name: '趣味' }]
        return { status: 201, body: list[2] }
      }
      return { body: list }
    })
    const cats = useCategories()
    const expense = cats.byType('expense')
    await cats.load()
    expect(expense.value.map((c) => c.name)).toEqual(['食費'])
    await cats.add('expense', '趣味')
    expect(expense.value.map((c) => c.name)).toEqual(['食費', '趣味'])
  })

  it('throws a connection error when the server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed')))
    await expect(useCategories().load()).rejects.toThrow('サーバーに接続できません')
  })
})

describe('useSummary', () => {
  it('loads monthly and fiscal summaries', async () => {
    const fetchMock = mockFetch((url) =>
      url.includes('monthly')
        ? { body: { year: 2026, month: 10, expense: 1, income: 2, balance: 1 } }
        : { body: { year: 2026, expense: 1, income: 2, balance: 1, months: [] } },
    )
    const s = useSummary()
    await s.loadMonthly(2026, 10)
    await s.loadFiscal(2026)
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/summary/monthly?year=2026&month=10')
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/summary/fiscal-year?year=2026')
    expect(s.monthly.value?.balance).toBe(1)
    expect(s.fiscal.value?.year).toBe(2026)
  })
})
