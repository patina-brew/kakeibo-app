import { computed, ref } from 'vue'
import { api, type Category, type Transaction, type TransactionInput, type TxType } from '../lib/api'
import { monthRange } from '../lib/date'

export function useCategories() {
  const categories = ref<Category[]>([])

  async function load() {
    categories.value = await api.listCategories()
  }

  function byType(type: TxType) {
    return computed(() => categories.value.filter((c) => c.type === type))
  }

  async function add(type: TxType, name: string) {
    await api.addCategory(type, name)
    await load()
  }

  async function rename(id: number, name: string) {
    await api.renameCategory(id, name)
    await load()
  }

  async function remove(id: number) {
    await api.deleteCategory(id)
    await load()
  }

  return { categories, load, byType, add, rename, remove }
}

// 表示中の月の収支を保持し、変更操作のあとに再取得する
export function useMonthTransactions() {
  const year = ref(new Date().getFullYear())
  const month = ref(new Date().getMonth() + 1)
  const transactions = ref<Transaction[]>([])

  const dayMarkers = computed(() => {
    const map = new Map<string, Set<TxType>>()
    for (const t of transactions.value) {
      const types = map.get(t.date) ?? new Set<TxType>()
      types.add(t.type)
      map.set(t.date, types)
    }
    return map
  })

  async function load(y = year.value, m = month.value) {
    year.value = y
    month.value = m
    const { from, to } = monthRange(y, m)
    transactions.value = await api.listTransactions(from, to)
  }

  function forDate(date: string) {
    return transactions.value.filter((t) => t.date === date)
  }

  async function create(input: TransactionInput) {
    await api.createTransaction(input)
    await load()
  }

  async function update(id: number, input: TransactionInput) {
    await api.updateTransaction(id, input)
    await load()
  }

  async function remove(id: number) {
    await api.deleteTransaction(id)
    await load()
  }

  return { year, month, transactions, dayMarkers, load, forDate, create, update, remove }
}
