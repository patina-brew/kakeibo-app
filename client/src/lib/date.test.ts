import { describe, expect, it } from 'vitest'
import {
  addMonths,
  daysInMonth,
  fiscalYearOf,
  formatDateWithWeekday,
  formatYen,
  monthGrid,
  monthRange,
  todayStr,
  weekdayLabel,
} from './date'

describe('weekdayLabel', () => {
  it('returns the weekday for a date', () => {
    expect(weekdayLabel('2026-10-26')).toBe('月')
    expect(weekdayLabel('2026-10-25')).toBe('日')
    expect(weekdayLabel('2026-10-31')).toBe('土')
  })

  it('handles year boundaries and leap days', () => {
    expect(weekdayLabel('2024-02-29')).toBe('木')
    expect(weekdayLabel('2025-12-31')).toBe('水')
    expect(weekdayLabel('2026-01-01')).toBe('木')
  })

  it('formats a date with its weekday', () => {
    expect(formatDateWithWeekday('2026-10-26')).toBe('2026年10月26日(月)')
  })
})

describe('daysInMonth / monthRange', () => {
  it('handles month ends and leap years', () => {
    expect(daysInMonth(2026, 10)).toBe(31)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 12)).toBe(31)
    expect(monthRange(2026, 2)).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })
})

describe('addMonths', () => {
  it('moves across year boundaries', () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
    expect(addMonths(2026, 10, 0)).toEqual({ year: 2026, month: 10 })
  })
})

describe('monthGrid', () => {
  it('fills whole weeks starting on Sunday', () => {
    const cells = monthGrid(2026, 10)
    expect(cells.length % 7).toBe(0)
    expect(weekdayLabel(cells[0]!.date)).toBe('日')
    expect(cells[0]).toEqual({ date: '2026-09-27', inMonth: false })
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31)
    expect(cells.find((c) => c.date === '2026-10-01')?.inMonth).toBe(true)
  })

  it('handles a month starting on Sunday with 28 days', () => {
    const cells = monthGrid(2026, 2)
    expect(cells).toHaveLength(28)
    expect(cells[0]).toEqual({ date: '2026-02-01', inMonth: true })
  })

  it('handles December with year rollover', () => {
    const cells = monthGrid(2026, 12)
    expect(cells).toHaveLength(35)
    expect(cells[cells.length - 1]!.date).toBe('2027-01-02')
  })
})

describe('fiscalYearOf', () => {
  it('uses April as the start of the fiscal year', () => {
    expect(fiscalYearOf('2027-03-31')).toBe(2026)
    expect(fiscalYearOf('2027-04-01')).toBe(2027)
    expect(fiscalYearOf('2026-12-31')).toBe(2026)
    expect(fiscalYearOf('2026-01-01')).toBe(2025)
  })
})

describe('formatYen / todayStr', () => {
  it('formats amounts with separators and sign', () => {
    expect(formatYen(250000)).toBe('250,000円')
    expect(formatYen(0)).toBe('0円')
    expect(formatYen(-4000)).toBe('-4,000円')
  })

  it('formats local today', () => {
    expect(todayStr(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(todayStr(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
})
