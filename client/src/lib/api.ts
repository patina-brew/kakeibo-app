export type TxType = 'expense' | 'income'

export interface Category {
  id: number
  type: TxType
  name: string
}

export interface Transaction {
  id: number
  type: TxType
  date: string
  amount: number
  categoryId: number
  categoryName: string
}

export interface TransactionInput {
  type: TxType
  date: string
  amount: number
  categoryId: number
}

export interface Totals {
  expense: number
  income: number
  balance: number
}

export interface MonthlySummary extends Totals {
  year: number
  month: number
}

export interface YearlySummary extends Totals {
  year: number
  months: MonthlySummary[]
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    })
  } catch {
    throw new ApiError('サーバーに接続できません', 0)
  }
  if (!res.ok) {
    let message = 'エラーが発生しました'
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // 本文がJSONでない場合は既定のメッセージを使う
    }
    throw new ApiError(message, res.status)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  listCategories: () => request<Category[]>('/api/categories'),
  addCategory: (type: TxType, name: string) =>
    request<Category>('/api/categories', { method: 'POST', body: JSON.stringify({ type, name }) }),
  renameCategory: (id: number, name: string) =>
    request<Category>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteCategory: (id: number) => request<void>(`/api/categories/${id}`, { method: 'DELETE' }),

  listTransactions: (from: string, to: string) =>
    request<Transaction[]>(`/api/transactions?from=${from}&to=${to}`),
  createTransaction: (input: TransactionInput) =>
    request<Transaction>('/api/transactions', { method: 'POST', body: JSON.stringify(input) }),
  updateTransaction: (id: number, input: TransactionInput) =>
    request<Transaction>(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteTransaction: (id: number) => request<void>(`/api/transactions/${id}`, { method: 'DELETE' }),

  monthlySummary: (year: number, month: number) =>
    request<MonthlySummary>(`/api/summary/monthly?year=${year}&month=${month}`),
  yearlySummary: (year: number) => request<YearlySummary>(`/api/summary/yearly?year=${year}`),
}
