<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useSummary } from '../composables/useSummary'
import { addMonths, fiscalYearOf, formatYen, todayStr } from '../lib/date'

const today = todayStr()
const mode = ref<'monthly' | 'fiscal'>('monthly')
const year = ref(Number(today.slice(0, 4)))
const month = ref(Number(today.slice(5, 7)))
const fiscalYear = ref(fiscalYearOf(today))
const error = ref('')

const summary = useSummary()

async function load() {
  error.value = ''
  try {
    if (mode.value === 'monthly') await summary.loadMonthly(year.value, month.value)
    else await summary.loadFiscal(fiscalYear.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  }
}

onMounted(load)
watch([mode, year, month, fiscalYear], load)

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
      <button type="button" role="tab" data-tab="fiscal" :aria-selected="mode === 'fiscal'" :class="{ active: mode === 'fiscal' }" @click="mode = 'fiscal'">年度別</button>
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
    </section>

    <section v-else class="card" data-view="fiscal">
      <div class="nav">
        <button type="button" aria-label="前の年度" @click="fiscalYear--">‹</button>
        <strong data-testid="period">{{ fiscalYear }}年度({{ fiscalYear }}年4月〜{{ fiscalYear + 1 }}年3月)</strong>
        <button type="button" aria-label="次の年度" @click="fiscalYear++">›</button>
      </div>
      <template v-if="summary.fiscal.value">
        <dl class="totals">
          <div><dt>支出合計</dt><dd data-testid="expense" class="expense">{{ formatYen(summary.fiscal.value.expense) }}</dd></div>
          <div><dt>収入合計</dt><dd data-testid="income" class="income">{{ formatYen(summary.fiscal.value.income) }}</dd></div>
          <div><dt>差額</dt><dd data-testid="balance" :class="balanceClass(summary.fiscal.value.balance)">{{ formatYen(summary.fiscal.value.balance) }}</dd></div>
        </dl>
        <table class="months">
          <thead>
            <tr><th>月</th><th>支出</th><th>収入</th><th>差額</th></tr>
          </thead>
          <tbody>
            <tr v-for="m in summary.fiscal.value.months" :key="`${m.year}-${m.month}`" data-row="month">
              <th scope="row">{{ m.year }}年{{ m.month }}月</th>
              <td>{{ formatYen(m.expense) }}</td>
              <td>{{ formatYen(m.income) }}</td>
              <td :class="balanceClass(m.balance)">{{ formatYen(m.balance) }}</td>
            </tr>
          </tbody>
        </table>
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
.error {
  color: #d64545;
}
</style>
