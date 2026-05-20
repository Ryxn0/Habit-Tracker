import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, getDaysInMonth, startOfMonth, getDay } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns array of day numbers [1..N] for a given month */
export function getDaysArray(year: number, month: number): number[] {
  const count = getDaysInMonth(new Date(year, month - 1))
  return Array.from({ length: count }, (_, i) => i + 1)
}

/** ISO date string for a given year/month/day e.g. "2026-05-01" */
export function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Today as ISO date string */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Current month number (1-12) */
export function currentMonth(): number {
  return new Date().getMonth() + 1
}

/** Current year */
export function currentYear(): number {
  return new Date().getFullYear()
}

/** Month name from number */
export function monthName(month: number): string {
  return format(new Date(2000, month - 1), 'MMMM')
}

/** Day-of-week abbreviation for a given date */
export function dayAbbr(year: number, month: number, day: number): string {
  return format(new Date(year, month - 1, day), 'EEE')
}

/** Percentage rounded to nearest int */
export function pct(completed: number, goal: number): number {
  if (!goal) return 0
  return Math.round((completed / goal) * 100)
}

/** Previous month and year, handling Jan → Dec year rollover */
export function prevMonthYear(month: number, year: number): { month: number; year: number } {
  if (month === 1) return { month: 12, year: year - 1 }
  return { month: month - 1, year }
}

/** Next month and year, handling Dec → Jan year rollover */
export function nextMonthYear(month: number, year: number): { month: number; year: number } {
  if (month === 12) return { month: 1, year: year + 1 }
  return { month: month + 1, year }
}
