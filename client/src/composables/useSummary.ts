import { ref } from 'vue'
import { api, type MonthlySummary, type YearlySummary } from '../lib/api'

export function useSummary() {
  const monthly = ref<MonthlySummary | null>(null)
  const yearly = ref<YearlySummary | null>(null)

  async function loadMonthly(year: number, month: number) {
    monthly.value = await api.monthlySummary(year, month)
  }

  async function loadYearly(year: number) {
    yearly.value = await api.yearlySummary(year)
  }

  return { monthly, yearly, loadMonthly, loadYearly }
}
