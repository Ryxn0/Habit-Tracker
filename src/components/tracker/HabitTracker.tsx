'use client'

import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { getDaysInMonth } from 'date-fns'
import type { Habit, Completion, HabitType } from '@/types'
import { toISODate, todayISO, pct } from '@/lib/utils'
import HabitModal from './HabitModal'
import { createClient } from '@/lib/supabase/client'

const ACCENT = '#E94560'
const CYAN   = '#22d3ee'
const PINK   = '#f472b6'

// ── Props / state types ───────────────────────────────────────────────
interface Props {
  dailyHabits:  Habit[]
  weeklyHabits: Habit[]
  completions:  Completion[]
  month:  number
  year:   number
  userId: string
}
interface ModalState { open: boolean; habit: Habit | null; defaultType: HabitType }

// ── Main component ────────────────────────────────────────────────────
export default function HabitTracker({
  dailyHabits: initDaily, weeklyHabits: initWeekly,
  completions, month, year, userId,
}: Props) {
  const [dailyHabits,   setDailyHabits]   = useState<Habit[]>(initDaily)
  const [weeklyHabits,  setWeeklyHabits]  = useState<Habit[]>(initWeekly)
  const [completionSet, setCompletionSet] = useState<Set<string>>(
    () => new Set(completions.map(c => `${c.habit_id}__${c.date}`))
  )
  const [loading, setLoading] = useState<string | null>(null)
  const [modal,   setModal]   = useState<ModalState>({ open: false, habit: null, defaultType: 'daily' })

  const today   = todayISO()
  const numDays = getDaysInMonth(new Date(year, month - 1))

  // ── Completion helpers ────────────────────────────────────────────
  const isCompleted = (habitId: string, date: string) =>
    completionSet.has(`${habitId}__${date}`)

  const toggle = useCallback(async (habitId: string, date: string) => {
    if (date > today) return
    const key    = `${habitId}__${date}`
    const isDone = completionSet.has(key)
    setLoading(key)
    setCompletionSet(prev => {
      const next = new Set(prev)
      isDone ? next.delete(key) : next.add(key)
      return next
    })
    const sb = createClient()
    if (isDone) {
      await sb.from('completions').delete()
        .eq('habit_id', habitId).eq('date', date).eq('user_id', userId)
    } else {
      await sb.from('completions').insert({ habit_id: habitId, user_id: userId, date })
    }
    setLoading(null)
  }, [today, userId, completionSet])

  const countDone = (habitId: string) => {
    let n = 0
    for (let d = 1; d <= numDays; d++) {
      if (isCompleted(habitId, toISODate(year, month, d))) n++
    }
    return n
  }

  const getStreak = (habitId: string): number => {
    const lastDay = toISODate(year, month, numDays)
    const endDate = today > lastDay ? lastDay : today
    const endDay  = parseInt(endDate.split('-')[2])
    let s = 0
    for (let d = endDay; d >= 1; d--) {
      if (isCompleted(habitId, toISODate(year, month, d))) s++
      else break
    }
    return s
  }

  // ── Modal / CRUD ──────────────────────────────────────────────────
  const openAdd  = (t: HabitType) => setModal({ open: true, habit: null, defaultType: t })
  const openEdit = (h: Habit)     => setModal({ open: true, habit: h, defaultType: h.type })
  const close    = ()             => setModal({ open: false, habit: null, defaultType: 'daily' })

  async function handleSave(name: string, type: HabitType, goal: number) {
    const sb = createClient()
    if (modal.habit) {
      const { data: u, error } = await sb.from('habits')
        .update({ name, goal }).eq('id', modal.habit.id).eq('user_id', userId)
        .select().single()
      if (error) throw new Error(error.message)
      const fn = (arr: Habit[]) => arr.map(h => h.id === u!.id ? u! : h)
      setDailyHabits(fn); setWeeklyHabits(fn)
    } else {
      const { data: last } = await sb.from('habits').select('sort_order')
        .eq('user_id', userId).eq('month', month).eq('year', year).eq('type', type)
        .order('sort_order', { ascending: false }).limit(1)
      const sort_order = (last?.[0]?.sort_order ?? -1) + 1
      const finalGoal  = type === 'daily' ? numDays : goal
      const { data: h, error } = await sb.from('habits')
        .insert({ name, type, goal: finalGoal, month, year, user_id: userId, sort_order })
        .select().single()
      if (error) throw new Error(error.message)
      type === 'daily' ? setDailyHabits(p => [...p, h!]) : setWeeklyHabits(p => [...p, h!])
    }
    close()
  }

  async function handleDelete(habit: Habit) {
    if (!window.confirm(`Delete "${habit.name}"?`)) return
    const { error } = await createClient().from('habits')
      .delete().eq('id', habit.id).eq('user_id', userId)
    if (error) return
    const fn = (arr: Habit[]) => arr.filter(h => h.id !== habit.id)
    habit.type === 'daily' ? setDailyHabits(fn) : setWeeklyHabits(fn)
    setCompletionSet(prev => {
      const next = new Set(prev)
      next.forEach(k => { if (k.startsWith(`${habit.id}__`)) next.delete(k) })
      return next
    })
  }

  const shared = {
    month, year, today, numDays,
    isCompleted, countDone, getStreak, toggle, loading,
    onEdit: openEdit, onDelete: handleDelete,
  }

  return (
    <div className="space-y-14">
      <HabitSection title="Daily Habits"  type="daily"  habits={dailyHabits}  onAdd={() => openAdd('daily')}  {...shared} />
      <HabitSection title="Weekly Habits" type="weekly" habits={weeklyHabits} onAdd={() => openAdd('weekly')} {...shared} />

      {modal.open && (
        <HabitModal
          habit={modal.habit} defaultType={modal.defaultType}
          month={month} year={year}
          onSave={handleSave} onClose={close}
        />
      )}
    </div>
  )
}

// ── HabitSection ──────────────────────────────────────────────────────

interface SectionProps {
  title:   string
  type:    HabitType
  habits:  Habit[]
  month:   number
  year:    number
  today:   string
  numDays: number
  isCompleted: (id: string, date: string) => boolean
  countDone:   (id: string) => number
  getStreak:   (id: string) => number
  toggle:      (id: string, date: string) => void
  loading:     string | null
  onAdd:    () => void
  onEdit:   (h: Habit) => void
  onDelete: (h: Habit) => void
}

function HabitSection({ title, type, habits, onAdd, countDone, ...rest }: SectionProps) {
  const avgRate = habits.length > 0
    ? Math.round(habits.reduce((s, h) => s + pct(countDone(h.id), h.goal), 0) / habits.length)
    : 0

  return (
    <section>
      {/* Section header */}
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="font-display text-2xl text-white">{title}</h2>
        {habits.length > 0 && (
          <span className="text-muted text-xs font-mono">
            {habits.length} habit{habits.length !== 1 ? 's' : ''} · {avgRate}% avg
          </span>
        )}
        <div className="flex-1 h-px bg-border mx-1" style={{ alignSelf: 'center' }} />
        <button
          onClick={onAdd}
          className="text-xs font-mono text-accent hover:text-white border border-border hover:border-accent/40 px-3 py-1.5 rounded-lg transition-all duration-200"
        >
          + Add
        </button>
      </div>

      {/* Empty state */}
      {habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-muted text-sm mb-3">No {type} habits yet</p>
          <button onClick={onAdd} className="text-sm" style={{ color: ACCENT }}>
            Add your first one →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map(h => (
            <HabitCard key={h.id} habit={h} type={type} countDone={countDone} {...rest} />
          ))}
        </div>
      )}
    </section>
  )
}

// ── HabitCard ─────────────────────────────────────────────────────────

interface CardProps {
  habit:   Habit
  type:    HabitType
  month:   number
  year:    number
  today:   string
  numDays: number
  isCompleted: (id: string, date: string) => boolean
  countDone:   (id: string) => number
  getStreak:   (id: string) => number
  toggle:      (id: string, date: string) => void
  loading:     string | null
  onEdit:   (h: Habit) => void
  onDelete: (h: Habit) => void
}

function HabitCard({
  habit, type, month, year, today, numDays,
  isCompleted, countDone, getStreak, toggle, loading,
  onEdit, onDelete,
}: CardProps) {
  const done   = countDone(habit.id)
  const rate   = pct(done, habit.goal)
  const streak = getStreak(habit.id)

  return (
    <div className="group rounded-xl border border-border bg-card hover:bg-surface px-4 py-3.5 transition-colors duration-200">

      {/* ── Header row ── */}
      <div className="flex items-center gap-3 mb-3">
        {/* Habit name */}
        <span className="text-sm text-gray-200 font-medium flex-1 truncate">{habit.name}</span>

        {/* Edit / delete — visible on hover */}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity duration-150 flex-shrink-0">
          <Btn onClick={() => onEdit(habit)}   title="Edit">✎</Btn>
          <Btn onClick={() => onDelete(habit)} title="Delete" danger>✕</Btn>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2D4E' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${rate}%`,
                background: `linear-gradient(90deg, ${ACCENT}, ${PINK})`,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <span className="text-xs font-mono w-7 text-right" style={{ color: CYAN }}>
            {rate}%
          </span>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-1 flex-shrink-0 w-10 justify-end">
          {streak > 0 ? (
            <span className="text-xs font-mono" style={{ color: PINK }}>
              {streak}d 🔥
            </span>
          ) : (
            <span className="text-xs font-mono text-muted">—</span>
          )}
        </div>
      </div>

      {/* ── Day grid (daily) ── */}
      {type === 'daily' && (
        <div className="flex gap-[3px]" style={{ overflowX: 'auto', paddingBottom: 2 }}>
          {Array.from({ length: numDays }, (_, i) => i + 1).map(d => {
            const date = toISODate(year, month, d)
            const tick = isCompleted(habit.id, date)
            const isT  = date === today
            const fut  = date > today
            const lkey = `${habit.id}__${date}`
            return (
              <button
                key={d}
                onClick={() => toggle(habit.id, date)}
                disabled={fut || loading === lkey}
                title={`${month}/${d}`}
                className="flex flex-col items-center flex-shrink-0"
                style={{ gap: 2, opacity: fut ? 0.2 : 1, cursor: fut ? 'default' : 'pointer' }}
              >
                <span style={{
                  fontSize: 8, lineHeight: 1, fontFamily: 'monospace',
                  color: isT ? CYAN : '#374151',
                }}>
                  {d}
                </span>
                <div style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  border: `1px solid ${tick ? ACCENT : isT ? CYAN + '55' : '#1E2D4E'}`,
                  background: tick ? ACCENT + '22' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {tick && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Week indicators (weekly) ── */}
      {type === 'weekly' && (
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4, 5].map(wk => {
            const firstDay = (wk - 1) * 7 + 1
            if (firstDay > numDays) return null
            const date = toISODate(year, month, firstDay)
            const tick = isCompleted(habit.id, date)
            const fut  = date > today
            const lkey = `${habit.id}__${date}`
            return (
              <div key={wk} className="flex flex-col items-center gap-1.5">
                <span style={{ fontSize: 9, color: '#4B5563', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                  W{wk}
                </span>
                <button
                  onClick={() => toggle(habit.id, date)}
                  disabled={fut || loading === lkey}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    border: `1px solid ${tick ? ACCENT : '#1E2D4E'}`,
                    background: tick ? ACCENT + '20' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: fut ? 'default' : 'pointer',
                    opacity: fut ? 0.2 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {tick && (
                    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                      <path d="M1 5.5L5 9.5L13 1" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            )
          })}

          <div className="ml-auto text-xs font-mono" style={{ color: '#4B5563' }}>
            {done}/{habit.goal} this month
          </div>
        </div>
      )}
    </div>
  )
}

// ── Btn — small icon button ───────────────────────────────────────────

function Btn({ onClick, title, danger, children }: {
  onClick:  () => void
  title:    string
  danger?:  boolean
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-5 h-5 flex items-center justify-center rounded text-muted hover:text-white transition-colors duration-150"
      style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = danger ? '#f87171' : '#fff' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '' }}
    >
      {children}
    </button>
  )
}
