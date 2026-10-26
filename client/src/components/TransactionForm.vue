<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Category, Transaction, TransactionInput, TxType } from '../lib/api'
import { formatDateWithWeekday, parseDateStr } from '../lib/date'
import CalendarMonth from './CalendarMonth.vue'

const props = defineProps<{
  categories: Category[]
  initialDate: string
  transaction?: Transaction | null
  serverError?: string
}>()

const emit = defineEmits<{
  submit: [input: TransactionInput]
  cancel: []
}>()

const start = props.transaction?.date ?? props.initialDate
const type = ref<TxType>(props.transaction?.type ?? 'expense')
const date = ref(start)
const amount = ref(props.transaction ? String(props.transaction.amount) : '')
const categoryId = ref<number | null>(props.transaction?.categoryId ?? null)
const viewYear = ref(parseDateStr(start).year)
const viewMonth = ref(parseDateStr(start).month)
const errors = ref<string[]>([])

const options = computed(() => props.categories.filter((c) => c.type === type.value))

function ensureCategory() {
  if (!options.value.some((c) => c.id === categoryId.value)) {
    categoryId.value = options.value[0]?.id ?? null
  }
}
ensureCategory()
watch(type, ensureCategory)
watch(() => props.categories, ensureCategory)

function selectDate(value: string) {
  date.value = value
  const { year, month } = parseDateStr(value)
  viewYear.value = year
  viewMonth.value = month
}

function navigate(delta: number) {
  const index = viewYear.value * 12 + (viewMonth.value - 1) + delta
  viewYear.value = Math.floor(index / 12)
  viewMonth.value = (index % 12) + 1
}

function submit() {
  const messages: string[] = []
  const normalized = amount.value.replace(/[,\s]/g, '')
  if (!/^\d+$/.test(normalized) || Number(normalized) < 1) {
    messages.push('金額は1以上の整数で入力してください')
  }
  if (!date.value) messages.push('日付を選択してください')
  if (categoryId.value === null) messages.push('カテゴリを選択してください')
  errors.value = messages
  if (messages.length > 0) return
  emit('submit', {
    type: type.value,
    date: date.value,
    amount: Number(normalized),
    categoryId: categoryId.value!,
  })
}
</script>

<template>
  <form class="form" novalidate @submit.prevent="submit">
    <h2>{{ transaction ? '収支を編集' : '収支を新規登録' }}</h2>

    <fieldset class="types">
      <legend>種別</legend>
      <label><input v-model="type" type="radio" name="type" value="expense" /> 支出</label>
      <label><input v-model="type" type="radio" name="type" value="income" /> 収入</label>
    </fieldset>

    <div class="field">
      <span class="label">日付</span>
      <strong data-testid="date-label">{{ date ? formatDateWithWeekday(date) : '未選択' }}</strong>
      <CalendarMonth
        :year="viewYear"
        :month="viewMonth"
        :selected="date"
        @select="selectDate"
        @navigate="navigate"
      />
    </div>

    <label class="field">
      <span class="label">金額(円)</span>
      <input v-model="amount" name="amount" type="text" inputmode="numeric" autocomplete="off" />
    </label>

    <label class="field">
      <span class="label">カテゴリ</span>
      <select v-model="categoryId" name="category">
        <option v-for="c in options" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </label>

    <ul v-if="errors.length || serverError" class="errors" role="alert">
      <li v-for="e in errors" :key="e">{{ e }}</li>
      <li v-if="serverError">{{ serverError }}</li>
    </ul>

    <div class="actions">
      <button type="button" data-action="cancel" @click="emit('cancel')">キャンセル</button>
      <button type="submit" class="primary">{{ transaction ? '更新' : '登録' }}</button>
    </div>
  </form>
</template>

<style scoped>
.form {
  display: grid;
  gap: 12px;
}
h2 {
  margin: 0;
  font-size: 1.1rem;
}
.types {
  display: flex;
  gap: 16px;
  border: 0;
  padding: 0;
  margin: 0;
}
.field {
  display: grid;
  gap: 4px;
}
.label {
  font-size: 0.85rem;
  color: #52606d;
}
input[type='text'],
select {
  font: inherit;
  padding: 6px 8px;
  border: 1px solid #bcccdc;
  border-radius: 6px;
}
.errors {
  color: #d64545;
  margin: 0;
  padding-left: 20px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
button {
  border: 1px solid #bcccdc;
  background: #fff;
  border-radius: 6px;
  padding: 6px 14px;
}
button.primary {
  background: #2b6cb0;
  border-color: #2b6cb0;
  color: #fff;
}
</style>
