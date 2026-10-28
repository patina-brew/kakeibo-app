import { ref } from 'vue'
import { api } from '../lib/api'

export interface CategoryAmount {
  categoryId: number
  name: string
  amount: number
}

export interface CategoryBreakdown {
  expense: CategoryAmount[]
  income: CategoryAmount[]
}

// 指定期間の取引をカテゴリ別に集計する(円グラフ用)
export function useCategoryBreakdown() {
  const breakdown = ref<CategoryBreakdown | null>(null)

  async function load(from: string, to: string) {
    const transactions = await api.listTransactions(from, to)
    const expense = new Map<number, CategoryAmount>()
    const income = new Map<number, CategoryAmount>()
    for (const tx of transactions) {
      const map = tx.type === 'expense' ? expense : income
      const entry = map.get(tx.categoryId) ?? { categoryId: tx.categoryId, name: tx.categoryName, amount: 0 }
      entry.amount += tx.amount
      map.set(tx.categoryId, entry)
    }
    const byAmountDesc = (a: CategoryAmount, b: CategoryAmount) => b.amount - a.amount
    breakdown.value = {
      expense: [...expense.values()].sort(byAmountDesc),
      income: [...income.values()].sort(byAmountDesc),
    }
  }

  return { breakdown, load }
}
