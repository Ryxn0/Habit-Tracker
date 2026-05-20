'use client'

import { useState, useCallback } from 'react'
import { getDaysInMonth } from 'date-fns'
import type { Habit, Completion, HabitType } from '@/types'
import { getDaysArray, toISODate, todayISO, dayAbbr, pct, cn } from '@/lib/utils'
import ProgressBar from '@/components/ui/ProgressBar'
import HabitModal from './HabitModal'

interface Props {
  dailyHabits:  Habit[]
  weeklyHabits: Habit[]
  completions:  Completion[]
  month: number
  year:  number
}

interface ModalState {
  open: boolean
  habit: Habit | null
  defaultType: HabitType
}

export default function HabitTracker({
  dailyHabits: initialDaily,
  weeklyHabits: initialWeekly,
  completions,
  month,
  year,
}: Props) {
  const [dailyHabits,  setDailyHabits]  = useState<Habit[]>(initialDaily)
  const [weeklyHabits, setWeeklyHabits] = useState<Habit[]>(initialWeekly)
  const [completionSet, setCompletionSet] = useState<Set<string>>(
    () => new Set(completions.map(c => `${c.habit_id}__${c.date}`))
  )
  const [loading, setLoading] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false, habit: null, defaultType: 'daily' })

  const today      = todayISO()
  const days       = getDaysArray(year, month)
  const daysInMonth = getDaysInMonth(new Date(year, month - 1))

  // Determine if we're viewing the current month (for Day stat display)
  const todayMonthISO    = today.substring(0, 7)
  const viewingMonthISO  = `${year}-${String(month).padStart(2, '0')}`
  const isViewingNow     = todayMonthISO === viewingMonthISO

  // ── Completion helpers ──────────────────────────────────────────

  const isCompleted = (habitId: string, date: string) =>
    completionSet.has(`${habitId}__${date}`)

  const toggle = useCallback(async (habitId: string, date: string) => {
    if (date > today) return
    const key = `${habitId}__${date}`
    setLoading(key)
    setCompletionSet(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    await fetch('/api/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habit_id: habitId, date }),
    })
    setLoading(null)
  }, [today])

  const getCompletedCount = (habitId: string) =>
    days.filter(d => isCompleted(habitId, toISODate(year, month, d))).length

  /** Consecutive days completed ending at today (or last day of month for past months) */
  const getStreak = (habitId: string) => {
    const lastDay     = toISODate(year, month, days[days.length - 1])
    const startDate   = today > lastDay ? lastDay : today
    const startDayNum = parseInt(startDate.split('-')[2])
    let streak = 0
    for (let d = startDayNum; d >= 1; d--) {
      if (isCompleted(habitId, toISODate(year, month, d))) streak++
      else break
    }
    return streak
  }

  // ── Modal helpers ───────────────────────────────────────────────

  const openAddModal  = (type: HabitType) => setModal({ open: true, habit: null, defaultType: type })
  const openEditModal = (habit: Habit)    => setModal({ open: true, habit, defaultType: habit.type })
  const closeModal    = ()                => setModal({ open: false, habit: null, defaultType: 'daily' })

  // ── CRUD handlers ───────────────────────────────────────────────

  async function handleSave(name: string, type: HabitType, goal: number) {
    if (modal.habit) {
      // Edit existing
      const res = await fetch(`/api/habits/${modal.habit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, goal }),
      })
      if (!res.ok) return
      const updated: Habit = await res.json()
      const patch = (arr: Habit[]) => arr.map(h => h.id === updated.id ? updated : h)
      setDailyHabits(patch)
      setWeeklyHabits(patch)
    } else {
      // Add new
      const finalGoal = type === 'daily' ? daysInMonth : goal
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, goal: finalGoal, month, year }),
      })
      if (!res.ok) return
      const habit: Habit = await res.json()
      if (type === 'daily') setDailyHabits(prev => [...prev, habit])
      else                  setWeeklyHabits(prev => [...prev, habit])
    }
    closeModal()
  }

  async function handleDelete(habit: Habit) {
    if (!window.confirm(`Delete "${habit.name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/habits/${habit.id}`, { method: 'DELETE' })
    if (!res.ok) return
    const remove = (arr: Habit[]) => arr.filter(h => h.id !== habit.id)
    if (habit.type === 'daily') setDailyHabits(remove)
    else                        setWeeklyHabits(remove)
    // Remove associated completions from local state
    setCompletionSet(prev => {
      const next = new Set(prev)
      for (const key of next) {
        if (key.startsWith(`${habit.id}__`)) next.delete(key)
      }
      return next
    })
  }

  // ── Stats strip ─────────────────────────────────────────────────

  const overallDailyRate = dailyHabits.length > 0
    ? Math.round(
        dailyHabits.reduce((sum, h) => sum + pct(getCompletedCount(h.id), h.goal), 0)
        / dailyHabits.length
      )
    : 0

  const todayDayNum  = parseInt(today.split('-')[2])
  const dayStatValue = isViewingNow
    ? `${todayDayNum}/${days.length}`
    : viewingMonthISO < todayMonthISO
      ? `${days.length}/${days.length}`  // past month
      : `0/${days.length}`               // future month

  return (
    <div className="space-y-16">
      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Daily Habits',  value: dailyHabits.length,    color: 'text-white' },
          { label: 'Weekly Habits', value: weeklyHabits.length,   color: 'text-white' },
          { label: 'Overall Rate',  value: `${overallDailyRate}%`, color: 'text-done'  },
          { label: 'Day',           value: dayStatValue,           color: 'text-accent' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <div className={cn('font-display text-3xl mb-1', color)}>{value}</div>
            <div className="text-muted text-xs uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      {/* Daily section */}
      <HabitSection
        title="Daily Habits"
        habits={dailyHabits}
        days={days}
        month={month}
        year={year}
        today={today}
        isCompleted={isCompleted}
        getCompletedCount={getCompletedCount}
        getStreak={getStreak}
        toggle={toggle}
        loading={loading}
        onAdd={() => openAddModal('daily')}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      {/* Weekly section */}
      <HabitSection
        title="Weekly Habits"
        habits={weeklyHabits}
        days={days}
        month={month}
        year={year}
        today={today}
        isCompleted={isCompleted}
        getCompletedCount={getCompletedCount}
        getStreak={getStreak}
        toggle={toggle}
        loading={loading}
        onAdd={() => openAddModal('weekly')}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      {/* Add / edit modal */}
      {modal.open && (
        <HabitModal
          habit={modal.habit}
          defaultType={modal.defaultType}
          month={month}
          year={year}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

// ── HabitSection ─────────────────────────────────────────────────

interface SectionProps {
  title: string
  habits: Habit[]
  days: number[]
  month: number
  year: number
  today: string
  isCompleted: (id: string, date: string) => boolean
  getCompletedCount: (id: string) => number
  getStreak: (id: string) => number
  toggle: (id: string, date: string) => void
  loading: string | null
  onAdd: () => void
  onEdit: (habit: Habit) => void
  onDelete: (habit: Habit) => void
}

function HabitSection({
  title, habits, days, month, year, today,
  isCompleted, getCompletedCount, getStreak,
  toggle, loading, onAdd, onEdit, onDelete,
}: SectionProps) {
  return (
    <section>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h2 className="font-display text-2xl text-white">{title}</h2>
        <div className="flex-1 h-px bg-border" />
        {habits.length > 0 && (
          <span className="text-muted text-sm">{habits.length} habits</span>
        )}
        <button
          onClick={onAdd}
          className="text-accent text-sm hover:text-accent/80 transition-colors"
        >
          + Add habit
        </button>
      </div>

      {/* Empty state */}
      {habits.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border rounded-xl text-muted text-sm">
          No {title.toLowerCase()} yet.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="min-w-max">
            {/* Day header row */}
            <div className="flex mb-2 ml-[220px] gap-1">
              {days.map(d => {
                const date    = toISODate(year, month, d)
                const isToday = date === today
                return (
                  <div
                    key={d}
                    className={cn(
                      'w-8 text-center flex flex-col items-center gap-0.5',
                      isToday ? 'text-accent' : 'text-muted'
                    )}
                  >
                    <span className="text-[9px] uppercase">{dayAbbr(year, month, d)}</span>
                    <span className={cn(
                      'text-[11px] font-mono w-6 h-6 flex items-center justify-center rounded',
                      isToday && 'bg-accent text-white font-bold'
                    )}>{d}</span>
                  </div>
                )
              })}
              {/* Spacers matching row right-side columns */}
              <div className="w-24 ml-2" />
              <div className="w-14 ml-1" />
            </div>

            {/* Habit rows */}
            <div className="space-y-1">
              {habits.map((habit, idx) => {
                const completed = getCompletedCount(habit.id)
                const rate      = pct(completed, habit.goal)
                const streak    = getStreak(habit.id)

                return (
                  <div
                    key={habit.id}
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-2 py-1.5 group',
                      idx % 2 === 0 ? 'bg-surface/50' : 'bg-transparent'
                    )}
                  >
                    {/* Name + streak badge */}
                    <div className="w-[212px] flex-shrink-0 pr-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm text-subtle group-hover:text-white transition-colors truncate">
                          {habit.name}
                        </span>
                        {streak > 0 && (
                          <span className="text-[10px] text-warn font-mono flex-shrink-0">
                            {streak}d
                          </span>
                        )}
                      </div>
                      <ProgressBar
                        value={rate}
                        className="mt-1"
                        color={rate >= 100 ? 'done' : rate >= 50 ? 'done' : 'warn'}
                      />
                    </div>

                    {/* Day tick buttons */}
                    {days.map(d => {
                      const date    = toISODate(year, month, d)
                      const done    = isCompleted(habit.id, date)
                      const isToday = date === today
                      const future  = date > today
                      const key     = `${habit.id}__${date}`

                      return (
                        <button
                          key={d}
                          onClick={() => toggle(habit.id, date)}
                          disabled={future || loading === key}
                          className={cn(
                            'habit-tick',
                            done    && 'done',
                            isToday && !done && 'today',
                            future  && 'future'
                          )}
                          title={date}
                        >
                          {done ? '✓' : ''}
                        </button>
                      )
                    })}

                    {/* Completion stats */}
                    <div className="ml-2 w-20 flex-shrink-0 text-right">
                      <span className={cn(
                        'font-mono text-sm font-medium',
                        rate >= 100 ? 'text-done' : rate >= 50 ? 'text-subtle' : 'text-muted'
                      )}>
                        {completed}/{habit.goal}
                      </span>
                      <div className="text-muted text-[10px]">{rate}%</div>
                    </div>

                    {/* Edit / delete (appear on row hover) */}
                    <div className="ml-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => onEdit(habit)}
                        className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-white hover:bg-surface transition-colors text-xs"
                        title="Edit habit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => onDelete(habit)}
                        className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-accent hover:bg-accent/10 transition-colors text-xs"
                        title="Delete habit"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
