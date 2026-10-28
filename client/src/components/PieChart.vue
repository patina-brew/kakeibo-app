<script setup lang="ts">
import { computed } from 'vue'
import { formatYen } from '../lib/date'

interface PieSlice {
  label: string
  value: number
  color: string
}

const props = defineProps<{
  title: string
  slices: PieSlice[]
}>()

const CX = 100
const CY = 100
const R = 90

interface Segment extends PieSlice {
  // 1つの項目が100%のときは円弧パスが退化するため、代わりにcircleを描く
  path: string | null
  percent: number
}

function arcPath(startAngle: number, endAngle: number): string {
  const x1 = CX + R * Math.cos(startAngle)
  const y1 = CY + R * Math.sin(startAngle)
  const x2 = CX + R * Math.cos(endAngle)
  const y2 = CY + R * Math.sin(endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${CX} ${CY} L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`
}

const total = computed(() => props.slices.reduce((sum, s) => sum + s.value, 0))

const segments = computed<Segment[]>(() => {
  if (total.value <= 0) return []
  let angle = -Math.PI / 2
  return props.slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const sweep = (s.value / total.value) * Math.PI * 2
      const start = angle
      angle += sweep
      return {
        ...s,
        percent: Math.round((s.value / total.value) * 1000) / 10,
        path: sweep >= Math.PI * 2 - 1e-9 ? null : arcPath(start, angle),
      }
    })
})
</script>

<template>
  <figure class="pie" :data-chart="title">
    <figcaption class="title">{{ title }}</figcaption>
    <p v-if="segments.length === 0" class="empty">データがありません</p>
    <template v-else>
      <svg viewBox="0 0 200 200" role="img" :aria-label="title">
        <template v-for="seg in segments" :key="seg.label">
          <circle v-if="seg.path === null" :cx="CX" :cy="CY" :r="R" :fill="seg.color" />
          <path v-else :d="seg.path" :fill="seg.color" />
        </template>
      </svg>
      <ul class="legend">
        <li v-for="seg in segments" :key="seg.label" data-legend-item>
          <span class="swatch" :style="{ backgroundColor: seg.color }"></span>
          <span class="name">{{ seg.label }}</span>
          <span class="amount">{{ formatYen(seg.value) }}</span>
          <span class="percent">{{ seg.percent }}%</span>
        </li>
      </ul>
    </template>
  </figure>
</template>

<style scoped>
.pie {
  margin: 0;
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px;
}
.title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #52606d;
  margin-bottom: 8px;
}
svg {
  display: block;
  width: 180px;
  max-width: 100%;
  margin: 0 auto 8px;
}
.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
}
.legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}
.swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}
.name {
  flex: 1;
}
.amount,
.percent {
  font-variant-numeric: tabular-nums;
}
.percent {
  color: #52606d;
  min-width: 3.5em;
  text-align: right;
}
.empty {
  color: #52606d;
  font-size: 0.85rem;
}
</style>
