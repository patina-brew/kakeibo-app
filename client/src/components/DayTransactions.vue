<script setup lang="ts">
import type { Transaction } from '../lib/api'
import { formatDateWithWeekday, formatYen } from '../lib/date'

defineProps<{
  date: string
  transactions: Transaction[]
}>()

const emit = defineEmits<{
  add: []
  edit: [tx: Transaction]
  remove: [tx: Transaction]
}>()

function confirmRemove(tx: Transaction) {
  const label = `${tx.categoryName} ${formatYen(tx.amount)}`
  if (window.confirm(`「${label}」を削除しますか?`)) emit('remove', tx)
}
</script>

<template>
  <section class="day">
    <div class="day-header">
      <h2>{{ formatDateWithWeekday(date) }}</h2>
      <button type="button" class="primary" @click="emit('add')">新規登録</button>
    </div>
    <p v-if="transactions.length === 0" class="empty">登録された収支はありません</p>
    <ul v-else class="list">
      <li v-for="tx in transactions" :key="tx.id" class="item" :data-tx-id="tx.id">
        <span class="badge" :class="tx.type">{{ tx.type === 'expense' ? '支出' : '収入' }}</span>
        <span class="category">{{ tx.categoryName }}</span>
        <span class="amount" :class="tx.type">{{ formatYen(tx.amount) }}</span>
        <button type="button" data-action="edit" @click="emit('edit', tx)">編集</button>
        <button type="button" data-action="delete" class="danger" @click="confirmRemove(tx)">削除</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.day {
  background: #fff;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  padding: 12px 16px;
}
.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
h2 {
  font-size: 1.1rem;
  margin: 0;
}
.empty {
  color: #52606d;
}
.list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  gap: 8px;
}
.item {
  display: grid;
  grid-template-columns: auto 1fr auto auto auto;
  align-items: center;
  gap: 8px;
}
.badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 999px;
  color: #fff;
}
.badge.expense {
  background: #d64545;
}
.badge.income {
  background: #2f9e44;
}
.amount {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.amount.expense {
  color: #d64545;
}
.amount.income {
  color: #2f9e44;
}
button {
  border: 1px solid #bcccdc;
  background: #fff;
  border-radius: 6px;
  padding: 4px 10px;
}
button.primary {
  background: #2b6cb0;
  border-color: #2b6cb0;
  color: #fff;
}
button.danger {
  color: #d64545;
  border-color: #d64545;
}
</style>
