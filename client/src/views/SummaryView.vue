<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PieChart from '../components/PieChart.vue'
import { useCategoryBreakdown, type CategoryAmount } from '../composables/useCategoryBreakdown'
import { useSummary } from '../composables/useSummary'
import { addMonths, formatYen, monthRange, toDateStr, todayStr } from '../lib/date'

const today = todayStr()
const mode = ref<'monthly' | 'yearly'>('monthly')
const year = ref(Number(today.slice(0, 4)))
const month = ref(Number(today.slice(5, 7)))
const summaryYear = ref(Number(today.slice(0, 4)))
const error = ref('')

const summary = useSummary()
const categoryBreakdown = useCategoryBreakdown()

// 収入は青系、支出はオレンジ系の濃淡で統一する
const INCOME_PALETTE = ['#1e4e8c', '#2b6cb0', '#3b82c4', '#5b9bd5', '#7fb3e0', '#a3c9ec', '#c7dff7', '#e3effb'] as const
const EXPENSE_PALETTE = ['#b3540e', '#dd6b20', '#ed8936', '#f6a055', '#f9b877', '#fbcf9d', '#fde3c3', '#fef1e3'] as const

function toSlices(list: CategoryAmount[], palette: readonly string[]) {
  return list.map((item, i) => ({ label: item.name, value: item.amount, color: palette[i % palette.length]! }))
}

const expenseSlices = computed(() => toSlices(categoryBreakdown.breakdown.value?.expense ?? [], EXPENSE_PALETTE))
const incomeSlices = computed(() => toSlices(categoryBreakdown.breakdown.value?.income ?? [], INCOME_PALETTE))

// 収入と支出の両方がある期間だけ、合計に対する割合のグラフを出す
const balanceSlices = computed(() => {
  const totals = mode.value === 'monthly' ? summary.monthly.value : summary.yearly.value
  if (!totals || totals.expense <= 0 || totals.income <= 0) return []
  return [
    { label: '収入', value: totals.income, color: '#2b6cb0' },
    { label: '支出', value: totals.expense, color: '#dd6b20' },
  ]
})

async function load() {
  error.value = ''
  try {
    if (mode.value === 'monthly') {
      const range = monthRange(year.value, month.value)
      await Promise.all([
        summary.loadMonthly(year.value, month.value),
        categoryBreakdown.load(range.from, range.to),
      ])
    } else {
      await Promise.all([
        summary.loadYearly(summaryYear.value),
        categoryBreakdown.load(toDateStr(summaryYear.value, 1, 1), toDateStr(summaryYear.value, 12, 31)),
      ])
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  }
}

onMounted(load)
watch([mode, year, month, summaryYear], load)

function moveMonth(delta: number) {
  const next = addMonths(year.value, month.value, delta)
  year.value = next.year
  month.value = next.month
}

function balanceClass(value: number) {
  return value < 0 ? 'negative' : 'positive'
}
</script>

<template>
  <div class="page">
    <div class="tabs" role="tablist">
      <button type="button" role="tab" data-tab="monthly" :aria-selected="mode === 'monthly'" :class="{ active: mode === 'monthly' }" @click="mode = 'monthly'">月別</button>
      <button type="button" role="tab" data-tab="yearly" :aria-selected="mode === 'yearly'" :class="{ active: mode === 'yearly' }" @click="mode = 'yearly'">年別</button>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <section v-if="mode === 'monthly'" class="card" data-view="monthly">
      <div class="nav">
        <button type="button" aria-label="前の月" @click="moveMonth(-1)">‹</button>
        <strong data-testid="period">{{ year }}年{{ month }}月</strong>
        <button type="button" aria-label="次の月" @click="moveMonth(1)">›</button>
      </div>
      <dl v-if="summary.monthly.value" class="totals">
        <div><dt>支出合計</dt><dd data-testid="expense" class="expense">{{ formatYen(summary.monthly.value.expense) }}</dd></div>
        <div><dt>収入合計</dt><dd data-testid="income" class="income">{{ formatYen(summary.monthly.value.income) }}</dd></div>
        <div><dt>差額</dt><dd data-testid="balance" :class="balanceClass(summary.monthly.value.balance)">{{ formatYen(summary.monthly.value.balance) }}</dd></div>
      </dl>
      <div class="charts">
        <PieChart title="支出の内訳" :slices="expenseSlices" />
        <PieChart title="収入の内訳" :slices="incomeSlices" />
        <PieChart v-if="balanceSlices.length > 0" title="収支の割合" :slices="balanceSlices" />
      </div>
    </section>

    <section v-else class="card" data-view="yearly">
      <div class="nav">
        <button type="button" aria-label="前の年" @click="summaryYear--">‹</button>
        <strong data-testid="period">{{ summaryYear }}年(1月〜12月)</strong>
        <button type="button" aria-label="次の年" @click="summaryYear++">›</button>
      </div>
      <template v-if="summary.yearly.value">
        <dl class="totals">
          <div><dt>支出合計</dt><dd data-testid="expense" class="expense">{{ formatYen(summary.yearly.value.expense) }}</dd></div>
          <div><dt>収入合計</dt><dd data-testid="income" class="income">{{ formatYen(summary.yearly.value.income) }}</dd></div>
          <div><dt>差額</dt><dd data-testid="balance" :class="balanceClass(summary.yearly.value.balance)">{{ formatYen(summary.yearly.value.balance) }}</dd></div>
        </dl>
        <table class="months">
          <thead>
            <tr><th>月</th><th>支出</th><th>収入</th><th>差額</th></tr>
          </thead>
          <tbody>
            <tr v-for="m in summary.yearly.value.months" :key="`${m.year}-${m.month}`" data-row="month">
              <th scope="row">{{ m.year }}年{{ m.month }}月</th>
              <td>{{ formatYen(m.expense) }}</td>
              <td>{{ formatYen(m.income) }}</td>
              <td :class="balanceClass(m.balance)">{{ formatYen(m.balance) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="charts">
          <PieChart title="支出の内訳" :slices="expenseSlices" />
          <PieChart title="収入の内訳" :slices="incomeSlices" />
          <PieChart v-if="balanceSlices.length > 0" title="収支の割合" :slices="balanceSlices" />
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.tabs button,
.nav button {
  border: 1px solid #bcccdc;
  background: #fff;
  border-radius: 6px;
  padding: 6px 14px;
}
.tabs button.active {
  background: #2b6cb0;
  border-color: #2b6cb0;
  color: #fff;
}
.card {
  background: #fff;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  padding: 16px;
}
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}
.totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin: 0 0 16px;
}
.totals div {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 10px 12px;
}
dt {
  font-size: 0.8rem;
  color: #52606d;
}
dd {
  margin: 4px 0 0;
  font-size: 1.2rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.expense {
  color: #d64545;
}
.income {
  color: #2f9e44;
}
.positive {
  color: #1f2933;
}
.negative {
  color: #d64545;
}
.negative::before {
  content: '▼ ';
  font-size: 0.7em;
}
.months {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.months th,
.months td {
  padding: 6px 8px;
  border-bottom: 1px solid #e4e7eb;
  text-align: right;
}
.months th:first-child {
  text-align: left;
}
.charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.error {
  color: #d64545;
}
</style>
