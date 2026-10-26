<script setup lang="ts">
import { computed } from 'vue'
import { monthGrid, todayStr } from '../lib/date'

const props = defineProps<{
  year: number
  month: number
  selected: string | null
  markedDates?: Set<string>
}>()

const emit = defineEmits<{
  select: [date: string]
  navigate: [delta: number]
}>()

const weekdays = ['日', '月', '火', '水', '木', '金', '土']
const cells = computed(() => monthGrid(props.year, props.month))
const today = computed(() => todayStr())

function dayOf(date: string): number {
  return Number(date.slice(8, 10))
}
</script>

<template>
  <div class="calendar">
    <div class="calendar-header">
      <button type="button" class="nav" aria-label="前の月" @click="emit('navigate', -1)">‹</button>
      <span class="calendar-title">{{ year }}年{{ month }}月</span>
      <button type="button" class="nav" aria-label="次の月" @click="emit('navigate', 1)">›</button>
    </div>
    <div class="weekdays">
      <span v-for="(w, i) in weekdays" :key="w" :class="{ sun: i === 0, sat: i === 6 }">{{ w }}</span>
    </div>
    <div class="grid">
      <button
        v-for="cell in cells"
        :key="cell.date"
        type="button"
        class="cell"
        :class="{
          outside: !cell.inMonth,
          selected: cell.date === selected,
          today: cell.date === today,
        }"
        :data-date="cell.date"
        :aria-pressed="cell.date === selected"
        @click="emit('select', cell.date)"
      >
        <span>{{ dayOf(cell.date) }}</span>
        <span v-if="markedDates?.has(cell.date)" class="marker" data-testid="marker" aria-label="収支あり"></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  background: #fff;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  padding: 12px;
}
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.calendar-title {
  font-weight: 600;
}
.nav {
  border: 1px solid #d9e2ec;
  background: #fff;
  border-radius: 6px;
  width: 36px;
  height: 32px;
}
.weekdays,
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.weekdays span {
  text-align: center;
  font-size: 0.8rem;
  color: #52606d;
}
.sun {
  color: #d64545 !important;
}
.sat {
  color: #2b6cb0 !important;
}
.cell {
  position: relative;
  min-height: 48px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.cell.outside {
  color: #9aa5b1;
  background: transparent;
}
.cell.today {
  border-color: #2b6cb0;
}
.cell.selected {
  background: #2b6cb0;
  color: #fff;
}
.marker {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e8590c;
}
.cell.selected .marker {
  background: #fff;
}
</style>
