const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

export interface CalendarCell {
  date: string
  inMonth: boolean
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// 日付は常に YYYY-MM-DD 文字列で扱い、タイムゾーン変換を挟まない
export function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

export function parseDateStr(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number]
  return { year, month, day }
}

export function todayStr(now: Date = new Date()): string {
  return toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function weekdayLabel(date: string): string {
  const { year, month, day } = parseDateStr(date)
  return WEEKDAYS[new Date(year, month - 1, day).getDay()]!
}

export function formatDateWithWeekday(date: string): string {
  const { year, month, day } = parseDateStr(date)
  return `${year}年${month}月${day}日(${weekdayLabel(date)})`
}

export function formatYen(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  return `${sign}${Math.abs(amount).toLocaleString('ja-JP')}円`
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  return {
    from: toDateStr(year, month, 1),
    to: toDateStr(year, month, daysInMonth(year, month)),
  }
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

// 日曜始まりの月カレンダー(前後の月の日も含めて週単位で埋める)
export function monthGrid(year: number, month: number): CalendarCell[] {
  const offset = new Date(year, month - 1, 1).getDay()
  const weeks = Math.ceil((offset + daysInMonth(year, month)) / 7)
  const cells: CalendarCell[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(year, month - 1, 1 - offset + i)
    cells.push({
      date: toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      inMonth: d.getMonth() === month - 1,
    })
  }
  return cells
}

// 年度は4月始まり。開始年で表す(2026年度 = 2026-04 〜 2027-03)
export function fiscalYearOf(date: string): number {
  const { year, month } = parseDateStr(date)
  return month >= 4 ? year : year - 1
}
