import { ref } from 'vue'
import { api, type FiscalYearSummary, type MonthlySummary } from '../lib/api'

export function useSummary() {
  const monthly = ref<MonthlySummary | null>(null)
  const fiscal = ref<FiscalYearSummary | null>(null)

  async function loadMonthly(year: number, month: number) {
    monthly.value = await api.monthlySummary(year, month)
  }

  async function loadFiscal(year: number) {
    fiscal.value = await api.fiscalYearSummary(year)
  }

  return { monthly, fiscal, loadMonthly, loadFiscal }
}
