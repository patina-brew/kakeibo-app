<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CalendarMonth from '../components/CalendarMonth.vue'
import CategoryManager from '../components/CategoryManager.vue'
import DayTransactions from '../components/DayTransactions.vue'
import TransactionForm from '../components/TransactionForm.vue'
import { useCategories, useMonthTransactions } from '../composables/useLedger'
import type { Transaction, TransactionInput, TxType } from '../lib/api'
import { addMonths, parseDateStr, todayStr } from '../lib/date'

const ledger = useMonthTransactions()
const cats = useCategories()

const selected = ref(todayStr())
const loadError = ref('')
const formOpen = ref(false)
const editing = ref<Transaction | null>(null)
const formError = ref('')
const categoriesOpen = ref(false)
const categoryError = ref('')

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : 'エラーが発生しました'
}

async function loadMonthOf(date: string) {
  const { year, month } = parseDateStr(date)
  if (year !== ledger.year.value || month !== ledger.month.value) {
    await ledger.load(year, month)
  }
}

async function refresh() {
  loadError.value = ''
  try {
    const { year, month } = parseDateStr(selected.value)
    await Promise.all([cats.load(), ledger.load(year, month)])
  } catch (e) {
    loadError.value = messageOf(e)
  }
}

onMounted(refresh)

async function selectDate(date: string) {
  selected.value = date
  try {
    await loadMonthOf(date)
  } catch (e) {
    loadError.value = messageOf(e)
  }
}

async function navigate(delta: number) {
  const next = addMonths(ledger.year.value, ledger.month.value, delta)
  try {
    await ledger.load(next.year, next.month)
    loadError.value = ''
  } catch (e) {
    loadError.value = messageOf(e)
  }
}

function openCreate() {
  editing.value = null
  formError.value = ''
  formOpen.value = true
}

function openEdit(tx: Transaction) {
  editing.value = tx
  formError.value = ''
  formOpen.value = true
}

async function save(input: TransactionInput) {
  formError.value = ''
  try {
    if (editing.value) await ledger.update(editing.value.id, input)
    else await ledger.create(input)
    formOpen.value = false
    selected.value = input.date
    await loadMonthOf(input.date)
  } catch (e) {
    formError.value = messageOf(e)
  }
}

async function removeTransaction(tx: Transaction) {
  try {
    await ledger.remove(tx.id)
  } catch (e) {
    loadError.value = messageOf(e)
  }
}

async function runCategoryAction(action: () => Promise<void>) {
  categoryError.value = ''
  try {
    await action()
    // カテゴリ名の変更を一覧の表示に反映する
    await ledger.load()
  } catch (e) {
    categoryError.value = messageOf(e)
  }
}

const addCategory = (type: TxType, name: string) => runCategoryAction(() => cats.add(type, name))
const renameCategory = (id: number, name: string) => runCategoryAction(() => cats.rename(id, name))
const removeCategory = (id: number) => runCategoryAction(() => cats.remove(id))

function openCategories() {
  categoryError.value = ''
  categoriesOpen.value = true
}
</script>

<template>
  <div class="page">
    <p v-if="loadError" class="error" role="alert">{{ loadError }}</p>
    <div class="layout">
      <CalendarMonth
        :year="ledger.year.value"
        :month="ledger.month.value"
        :selected="selected"
        :day-markers="ledger.dayMarkers.value"
        @select="selectDate"
        @navigate="navigate"
      />
      <div class="side">
        <DayTransactions
          :date="selected"
          :transactions="ledger.forDate(selected)"
          @add="openCreate"
          @edit="openEdit"
          @remove="removeTransaction"
        />
        <button type="button" class="link" data-action="open-categories" @click="openCategories">カテゴリ管理</button>
      </div>
    </div>

    <div v-if="formOpen" class="overlay" role="dialog" aria-modal="true" aria-label="収支の登録・編集">
      <div class="dialog">
        <TransactionForm
          :key="editing ? `edit-${editing.id}` : `new-${selected}`"
          :categories="cats.categories.value"
          :initial-date="selected"
          :transaction="editing"
          :server-error="formError"
          @submit="save"
          @cancel="formOpen = false"
        />
      </div>
    </div>

    <div v-if="categoriesOpen" class="overlay" role="dialog" aria-modal="true" aria-label="カテゴリ管理">
      <div class="dialog">
        <CategoryManager
          :categories="cats.categories.value"
          :error="categoryError"
          @add="addCategory"
          @rename="renameCategory"
          @remove="(c) => removeCategory(c.id)"
          @close="categoriesOpen = false"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(300px, 420px) 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 760px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
.side {
  display: grid;
  gap: 12px;
}
.error {
  color: #d64545;
}
.link {
  justify-self: start;
  border: 0;
  background: none;
  color: #2b6cb0;
  text-decoration: underline;
  padding: 0;
}
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(31, 41, 51, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.dialog {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  width: min(480px, 100%);
  max-height: 100%;
  overflow: auto;
}
</style>
