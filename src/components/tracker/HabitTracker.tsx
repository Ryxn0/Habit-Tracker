'use client'

import { useState, useCallback } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { getDaysInMonth } from 'date-fns'
import type { Habit, Completion, HabitType } from '@/types'
import { toISODate, todayISO, dayAbbr, pct } from '@/lib/utils'
import HabitModal from './HabitModal'
import { createClient } from '@/lib/supabase/client'

// ── Week colour palette (pink · purple · cyan · yellow · green) ──────
const WC = ['#f472b6', '#c084fc', '#22d3ee', '#facc15', '#4ade80']

// ── Layout constants ─────────────────────────────────────────────────
const CELL   = 28   // day-tick cell width & height (px)
const GAP    = 3    // gap between cells (px)
const NAME_W = 164  // habit name column width (px)
const GOAL_W = 46   // goal column width (px)
const PROG_W = 300  // progress sidebar min-width (px)
const BD     = '1px solid #1E2D4E'  // shared border style

/** Returns day numbers [start..end] for a zero-based week index */
function wkDays(wi: number, maxDay: number): number[] {
  const start = wi * 7 + 1
  const end   = Math.min(wi * 7 + 7, maxDay)
  if (start > maxDay) return []
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

/** Width of one week column in the table */
function wkW(wi: number, days: number[], type: HabitType): number {
  return type === 'daily' ? days.length * (CELL + GAP) + 10 : 70
}

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
  const weeks   = [0, 1, 2, 3, 4].map(i => wkDays(i, numDays))

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
    const lastDay   = toISODate(year, month, numDays)
    const endDate   = today > lastDay ? lastDay : today
    const endDay    = parseInt(endDate.split('-')[2])
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
      if (error || !u) return
      const fn = (arr: Habit[]) => arr.map(h => h.id === u.id ? u : h)
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
      if (error || !h) return
      type === 'daily' ? setDailyHabits(p => [...p, h]) : setWeeklyHabits(p => [...p, h])
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

  // Top lists sorted by completion %
  const topDaily  = [...dailyHabits]
    .sort((a, b) => pct(countDone(b.id), b.goal) - pct(countDone(a.id), a.goal))
    .slice(0, 10)
  const topWeekly = [...weeklyHabits]
    .sort((a, b) => pct(countDone(b.id), b.goal) - pct(countDone(a.id), a.goal))
    .slice(0, 3)

  const shared = { weeks, month, year, today, isCompleted, countDone, getStreak, toggle, loading }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

      <TrackerGrid
        title="DAILY HABITS" type="daily" habits={dailyHabits}
        {...shared}
        onAdd={() => openAdd('daily')} onEdit={openEdit} onDelete={handleDelete}
      />

      <TrackerGrid
        title="WEEKLY HABITS" type="weekly" habits={weeklyHabits}
        {...shared}
        onAdd={() => openAdd('weekly')} onEdit={openEdit} onDelete={handleDelete}
      />

      {(topDaily.length > 0 || topWeekly.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {topDaily.length  > 0 && <TopPanel title="TOP 10 DAILY HABITS"  habits={topDaily}  countDone={countDone} />}
          {topWeekly.length > 0 && <TopPanel title="TOP 3 WEEKLY HABITS"  habits={topWeekly} countDone={countDone} />}
        </div>
      )}

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

// ── TrackerGrid ───────────────────────────────────────────────────────

interface GridProps {
  title:   string
  type:    HabitType
  habits:  Habit[]
  weeks:   number[][]
  month:   number
  year:    number
  today:   string
  isCompleted: (id: string, date: string) => boolean
  countDone:   (id: string) => number
  getStreak:   (id: string) => number
  toggle:      (id: string, date: string) => void
  loading:     string | null
  onAdd:    () => void
  onEdit:   (h: Habit) => void
  onDelete: (h: Habit) => void
}

function TrackerGrid({
  title, type, habits, weeks, month, year, today,
  isCompleted, countDone, getStreak, toggle, loading,
  onAdd, onEdit, onDelete,
}: GridProps) {
  // First day of each week used as the anchor date for weekly habits
  const anchor = weeks.map(w => w[0] ?? 0)

  const colW = (wi: number) => wkW(wi, weeks[wi], type)

  const totalW = NAME_W + GOAL_W +
    weeks.reduce((s, days, wi) => s + (days.length ? colW(wi) : 0), 0) +
    PROG_W

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#fff', fontFamily: 'monospace' }}>
          {title}
        </span>
        <div style={{ flex: 1, height: 1, background: '#1E2D4E' }} />
        <button
          onClick={onAdd}
          style={{ fontSize: 11, color: '#22d3ee', fontFamily: 'monospace', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
        >
          + Add
        </button>
      </div>

      {/* Scrollable table */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: BD }}>
        <div style={{ background: '#09101E', minWidth: totalW }}>

          {/* ── Row 1: WEEK headers ── */}
          <div style={{ display: 'flex', background: '#0F1829', borderBottom: BD }}>
            <Td w={NAME_W} style={{ padding: '6px 12px', fontSize: 10, letterSpacing: '0.15em', color: '#4B5563', fontWeight: 700 }}>
              HABIT
            </Td>
            <Td w={GOAL_W} style={{ justifyContent: 'center', fontSize: 10, letterSpacing: '0.15em', color: '#4B5563', fontWeight: 700 }}>
              GOAL
            </Td>
            {weeks.map((days, wi) => !days.length ? null : (
              <Td key={wi} w={colW(wi)} style={{ justifyContent: 'center', fontSize: 10, letterSpacing: '0.2em', fontWeight: 700, color: WC[wi] }}>
                WEEK {wi + 1}
              </Td>
            ))}
            <div style={{ flex: 1, minWidth: PROG_W, padding: '6px 12px', fontSize: 10, letterSpacing: '0.15em', color: '#22d3ee', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
              PROGRESS
            </div>
          </div>

          {/* ── Row 2: Day sub-headers (daily only) ── */}
          {type === 'daily' && (
            <div style={{ display: 'flex', background: '#0D1525', borderBottom: BD }}>
              <Td w={NAME_W} />
              <Td w={GOAL_W} />
              {weeks.map((days, wi) => !days.length ? null : (
                <Td key={wi} w={colW(wi)} style={{ padding: '4px 5px' }}>
                  <div style={{ display: 'flex', gap: GAP }}>
                    {days.map(d => {
                      const isT = toISODate(year, month, d) === today
                      return (
                        <div key={d} style={{ width: CELL, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: 8, color: isT ? WC[wi] : '#374151', textTransform: 'uppercase' }}>
                            {dayAbbr(year, month, d).slice(0, 2)}
                          </span>
                          <span style={{
                            fontSize: 9, width: 18, height: 18, borderRadius: 3,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            ...(isT
                              ? { background: WC[wi], color: '#000', fontWeight: 700 }
                              : { color: '#6B7280' }),
                          }}>
                            {d}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </Td>
              ))}
              {/* Progress column labels (rotated) */}
              <div style={{ flex: 1, minWidth: PROG_W, display: 'flex', alignItems: 'flex-end', padding: '4px 8px' }}>
                {(['CMPL', 'LEFT', '%'] as const).map(lbl => (
                  <div key={lbl} style={{ width: 52, display: 'flex', justifyContent: 'center' }}>
                    <span style={{ fontSize: 8, color: '#374151', letterSpacing: '0.1em', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      {lbl}
                    </span>
                  </div>
                ))}
                <div style={{ flex: 1 }} />
                <div style={{ width: 60, display: 'flex', justifyContent: 'center' }}>
                  <span style={{ fontSize: 8, color: '#22d3ee', letterSpacing: '0.1em', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    STREAK
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {habits.length === 0 && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#374151', fontSize: 12, borderTop: BD }}>
              No habits yet —{' '}
              <button onClick={onAdd} style={{ color: '#22d3ee', background: 'none', border: 'none', cursor: 'pointer' }}>
                add one
              </button>
            </div>
          )}

          {/* ── Habit rows ── */}
          {habits.map((habit, idx) => {
            const done = countDone(habit.id)
            const rate = pct(done, habit.goal)
            const s    = getStreak(habit.id)
            const bg   = idx % 2 === 0 ? '#0F1829' : '#09101E'

            return (
              <div key={habit.id} style={{ display: 'flex', background: bg, borderTop: BD }} className="group">
                {/* Name + edit/delete */}
                <Td w={NAME_W} style={{ padding: '0 8px', minHeight: 36 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
                    <span style={{ fontSize: 12, color: '#D1D5DB', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {habit.name}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100" style={{ display: 'flex', gap: 2, transition: 'opacity 0.15s', flexShrink: 0 }}>
                      <Btn onClick={() => onEdit(habit)}   title="Edit">✎</Btn>
                      <Btn onClick={() => onDelete(habit)} title="Delete" danger>✕</Btn>
                    </span>
                  </div>
                </Td>

                {/* Goal */}
                <Td w={GOAL_W} style={{ justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>{habit.goal}</span>
                </Td>

                {/* Week cells */}
                {weeks.map((days, wi) => {
                  if (!days.length) return null
                  const wc = WC[wi]
                  if (type === 'daily') {
                    return (
                      <Td key={wi} w={colW(wi)} style={{ padding: '3px 5px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: GAP }}>
                          {days.map(d => {
                            const date  = toISODate(year, month, d)
                            const tick  = isCompleted(habit.id, date)
                            const isT   = date === today
                            const fut   = date > today
                            const lkey  = `${habit.id}__${date}`
                            return (
                              <button
                                key={d}
                                onClick={() => toggle(habit.id, date)}
                                disabled={fut || loading === lkey}
                                style={{
                                  width: CELL, height: CELL, flexShrink: 0,
                                  border: `1px solid ${tick ? wc : isT ? wc + '55' : '#1E2D4E'}`,
                                  background: tick ? wc + '28' : 'transparent',
                                  color: tick ? wc : 'transparent',
                                  borderRadius: 4, fontSize: 12, fontWeight: 700,
                                  opacity: fut ? 0.2 : 1,
                                  cursor: fut ? 'default' : 'pointer',
                                  transition: 'all 0.15s',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                              >
                                {tick ? '✓' : ''}
                              </button>
                            )
                          })}
                        </div>
                      </Td>
                    )
                  } else {
                    // Weekly: single checkbox per week
                    const fd   = anchor[wi]
                    if (!fd) return null
                    const date = toISODate(year, month, fd)
                    const tick = isCompleted(habit.id, date)
                    const fut  = date > today
                    const lkey = `${habit.id}__${date}`
                    return (
                      <Td key={wi} w={colW(wi)} style={{ justifyContent: 'center' }}>
                        <button
                          onClick={() => toggle(habit.id, date)}
                          disabled={fut || loading === lkey}
                          style={{
                            width: 34, height: 34,
                            border: `1px solid ${tick ? wc : '#1E2D4E'}`,
                            background: tick ? wc + '28' : 'transparent',
                            color: tick ? wc : 'transparent',
                            borderRadius: 6, fontSize: 14, fontWeight: 700,
                            opacity: fut ? 0.2 : 1,
                            cursor: fut ? 'default' : 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {tick ? '✓' : ''}
                        </button>
                      </Td>
                    )
                  }
                })}

                {/* Progress sidebar */}
                <div style={{ flex: 1, minWidth: PROG_W, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                  <div style={{ width: 52, textAlign: 'center' }}>
                    <span style={{ fontSize: 12, color: '#D1D5DB', fontFamily: 'monospace' }}>{done}</span>
                  </div>
                  <div style={{ width: 52, textAlign: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>{Math.max(0, habit.goal - done)}</span>
                  </div>
                  <div style={{ width: 44, textAlign: 'right', paddingRight: 6 }}>
                    <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{rate}%</span>
                  </div>
                  <div style={{ flex: 1, padding: '0 6px', maxWidth: 110 }}>
                    <div style={{ height: 6, borderRadius: 3, background: '#1E2D4E', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(rate, 100)}%`, background: '#22d3ee', borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                  <div style={{ width: 60, textAlign: 'center' }}>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: s > 0 ? '#f472b6' : '#1E2D4E' }}>
                      {s > 0 ? `${s}d` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* ── Footer rows ── */}
          {habits.length > 0 && (
            <>
              {/* COMPLETED */}
              <FooterRow label="COMPLETED" weeks={weeks} wi_anchor={anchor} type={type}
                colW={colW} month={month} year={year}
                getValue={(days, wi) => type === 'daily'
                  ? days.map(d => habits.filter(h => isCompleted(h.id, toISODate(year, month, d))).length)
                  : [anchor[wi] ? habits.filter(h => isCompleted(h.id, toISODate(year, month, anchor[wi]))).length : 0]
                }
              />
              {/* GOAL */}
              <FooterRow label="GOAL" weeks={weeks} wi_anchor={anchor} type={type}
                colW={colW} month={month} year={year}
                getValue={days => type === 'daily' ? days.map(() => habits.length) : [habits.length]}
              />
              {/* LEFT */}
              <FooterRow label="LEFT" weeks={weeks} wi_anchor={anchor} type={type}
                colW={colW} month={month} year={year}
                getValue={(days, wi) => type === 'daily'
                  ? days.map(d => {
                      const done = habits.filter(h => isCompleted(h.id, toISODate(year, month, d))).length
                      return habits.length - done
                    })
                  : [anchor[wi]
                      ? habits.length - habits.filter(h => isCompleted(h.id, toISODate(year, month, anchor[wi]))).length
                      : habits.length]
                }
              />
              {/* WEEKLY PROGRESS bars */}
              <div style={{ display: 'flex', borderTop: BD, background: '#080D1A' }}>
                <Td w={NAME_W} style={{ padding: '6px 12px', fontSize: 10, color: '#4B5563', fontWeight: 700, letterSpacing: '0.1em' }}>
                  WEEKLY PROGRESS
                </Td>
                <Td w={GOAL_W} />
                {weeks.map((days, wi) => {
                  if (!days.length) return null
                  const wc = WC[wi]
                  let rate = 0
                  if (type === 'daily') {
                    let done = 0
                    days.forEach(d => {
                      const dt = toISODate(year, month, d)
                      habits.forEach(h => { if (isCompleted(h.id, dt)) done++ })
                    })
                    const total = habits.length * days.length
                    rate = total > 0 ? Math.round((done / total) * 100) : 0
                  } else {
                    const fd = anchor[wi]
                    if (fd) {
                      const done = habits.filter(h => isCompleted(h.id, toISODate(year, month, fd))).length
                      rate = habits.length > 0 ? Math.round((done / habits.length) * 100) : 0
                    }
                  }
                  return (
                    <Td key={wi} w={colW(wi)} style={{ flexDirection: 'column', justifyContent: 'center', padding: '6px 8px', gap: 3 }}>
                      <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#1E2D4E', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${rate}%`, background: wc, borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 9, color: wc, fontFamily: 'monospace', textAlign: 'center' }}>{rate}%</span>
                    </Td>
                  )
                })}
                <div style={{ flex: 1, minWidth: PROG_W }} />
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

// ── FooterRow ─────────────────────────────────────────────────────────

interface FooterRowProps {
  label:     string
  weeks:     number[][]
  wi_anchor: number[]
  type:      HabitType
  colW:      (wi: number) => number
  month:     number
  year:      number
  getValue:  (days: number[], wi: number) => number[]
}

function FooterRow({ label, weeks, type, colW, getValue }: FooterRowProps) {
  return (
    <div style={{ display: 'flex', borderTop: BD, background: '#080D1A' }}>
      <Td w={NAME_W} style={{ padding: '4px 12px', fontSize: 10, color: '#4B5563', fontWeight: 700, letterSpacing: '0.1em' }}>
        {label}
      </Td>
      <Td w={GOAL_W} />
      {weeks.map((days, wi) => {
        if (!days.length) return null
        const values = getValue(days, wi)
        return (
          <Td key={wi} w={colW(wi)} style={{ padding: '4px 5px' }}>
            {type === 'daily' ? (
              <div style={{ display: 'flex', gap: GAP }}>
                {values.map((v, i) => (
                  <div key={i} style={{ width: CELL, textAlign: 'center' }}>
                    <span style={{ fontSize: 9, color: '#4B5563', fontFamily: 'monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ width: '100%', textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: '#4B5563', fontFamily: 'monospace' }}>{values[0]}</span>
              </div>
            )}
          </Td>
        )
      })}
      <div style={{ flex: 1, minWidth: PROG_W }} />
    </div>
  )
}

// ── TopPanel ──────────────────────────────────────────────────────────

function TopPanel({ title, habits, countDone }: {
  title:     string
  habits:    Habit[]
  countDone: (id: string) => number
}) {
  return (
    <div style={{ background: '#141E33', border: BD, borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 11, color: '#22d3ee', fontWeight: 700, letterSpacing: '0.15em', marginBottom: 16, fontFamily: 'monospace', margin: '0 0 16px 0' }}>
        {title}
      </h3>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {habits.map((h, i) => (
          <li key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#1E2D4E', fontFamily: 'monospace', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: 12, color: '#D1D5DB', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {h.name}
            </span>
            <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace', flexShrink: 0 }}>
              {pct(countDone(h.id), h.goal)}%
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── Td — flex table cell ──────────────────────────────────────────────

function Td({ w, children, style, className }: {
  w:          number
  children?:  ReactNode
  style?:     CSSProperties
  className?: string
}) {
  return (
    <div
      style={{ width: w, flexShrink: 0, borderRight: BD, display: 'flex', alignItems: 'center', ...style }}
      className={className}
    >
      {children}
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
      style={{
        fontSize: 11, background: 'none', border: 'none', cursor: 'pointer',
        color: '#4B5563', width: 16, height: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = danger ? '#f87171' : '#fff' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#4B5563' }}
    >
      {children}
    </button>
  )
}
