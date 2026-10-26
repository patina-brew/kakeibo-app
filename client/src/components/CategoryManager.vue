<script setup lang="ts">
import { ref } from 'vue'
import type { Category, TxType } from '../lib/api'

defineProps<{
  categories: Category[]
  error?: string
}>()

const emit = defineEmits<{
  add: [type: TxType, name: string]
  rename: [id: number, name: string]
  remove: [category: Category]
  close: []
}>()

const sections: { type: TxType; label: string }[] = [
  { type: 'expense', label: '支出カテゴリ' },
  { type: 'income', label: '収入カテゴリ' },
]

const newNames = ref<Record<TxType, string>>({ expense: '', income: '' })
const editingId = ref<number | null>(null)
const editingName = ref('')

function submitNew(type: TxType) {
  const name = newNames.value[type].trim()
  if (!name) return
  emit('add', type, name)
  newNames.value[type] = ''
}

function startEdit(category: Category) {
  editingId.value = category.id
  editingName.value = category.name
}

function saveEdit() {
  if (editingId.value === null) return
  emit('rename', editingId.value, editingName.value.trim())
  editingId.value = null
}

function confirmRemove(category: Category) {
  if (window.confirm(`カテゴリ「${category.name}」を削除しますか?`)) emit('remove', category)
}
</script>

<template>
  <div class="manager">
    <h2>カテゴリ管理</h2>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <section v-for="s in sections" :key="s.type" :data-section="s.type">
      <h3>{{ s.label }}</h3>
      <ul>
        <li v-for="c in categories.filter((x) => x.type === s.type)" :key="c.id" :data-category-id="c.id">
          <template v-if="editingId === c.id">
            <input v-model="editingName" data-input="rename" type="text" @keydown.enter.prevent="saveEdit" />
            <button type="button" data-action="save" @click="saveEdit">保存</button>
            <button type="button" data-action="cancel-edit" @click="editingId = null">取消</button>
          </template>
          <template v-else>
            <span class="name">{{ c.name }}</span>
            <button type="button" data-action="edit" @click="startEdit(c)">名前を変更</button>
            <button type="button" data-action="delete" class="danger" @click="confirmRemove(c)">削除</button>
          </template>
        </li>
      </ul>
      <form class="add" @submit.prevent="submitNew(s.type)">
        <input v-model="newNames[s.type]" data-input="new" type="text" placeholder="新しいカテゴリ名" />
        <button type="submit" data-action="add">追加</button>
      </form>
    </section>

    <div class="actions">
      <button type="button" data-action="close" @click="emit('close')">閉じる</button>
    </div>
  </div>
</template>

<style scoped>
.manager {
  display: grid;
  gap: 12px;
}
h2,
h3 {
  margin: 0;
}
h2 {
  font-size: 1.1rem;
}
h3 {
  font-size: 0.95rem;
  color: #52606d;
}
ul {
  list-style: none;
  padding: 0;
  margin: 8px 0;
  display: grid;
  gap: 6px;
}
li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.name {
  flex: 1;
}
.add {
  display: flex;
  gap: 8px;
}
input[type='text'] {
  font: inherit;
  padding: 4px 8px;
  border: 1px solid #bcccdc;
  border-radius: 6px;
  flex: 1;
}
button {
  border: 1px solid #bcccdc;
  background: #fff;
  border-radius: 6px;
  padding: 4px 10px;
}
button.danger {
  color: #d64545;
  border-color: #d64545;
}
.error {
  color: #d64545;
  margin: 0;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
