'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { getDaysInMonth } from 'date-fns'
import {
  DndContext, PointerSensor, TouchSensor,
  useSensor, useSensors, closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Habit, Completion, HabitType } from '@/types'
import { toISODate, todayISO, pct } from '@/lib/utils'
import HabitModal from './HabitModal'
import { createClient } from '@/lib/supabase/client'
import { Flame, GripVertical, Pencil, Trash2, Plus } from 'lucide-react'

const ACCENT = '#95432f'
const ACCENT_MID = '#cc7055'

// ── Types ─────────────────────────────────────────────────────────────────

interface Props {
  dailyHabits:  Habit[]
  weeklyHabits: Habit[]
  completions:  Completion[]
  month:  number
  year:   number
  userId: string
}
interface ModalState { open: boolean; habit: Habit | null; defaultType: HabitType }

// ── Main component ────────────────────────────────────────────────────────

export default function HabitTracker({
  dailyHabits: initDaily, weeklyHabits: initWeekly,
  completions, month, year, userId,
}: Props) {
  const [dailyHabits,   setDailyHabits]   = useState<Habit[]>(initDaily)
  const [weeklyHabits,  setWeeklyHabits]  = useState<Habit[]>(initWeekly)
  const [completionSet, setCompletionSet] = useState<Set<string>>(
    () => new Set(completions.map(c => `${c.habit_id}__${c.date}`))
  )
  const [loading,      setLoading]      = useState<string | null>(null)
  const [modal,        setModal]        = useState<ModalState>({ open: false, habit: null, defaultType: 'daily' })
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null)

  const today   = todayISO()
  const numDays = getDaysInMonth(new Date(year, month - 1))

  const isCompleted = (habitId: string, date: string) => completionSet.has(`${habitId}__${date}`)

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

  async function confirmDelete() {
    if (!deleteTarget) return
    const habit = deleteTarget
    setDeleteTarget(null)
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
    onEdit: openEdit, onDelete: setDeleteTarget,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <HabitSection
        title="Daily Habits" type="daily" habits={dailyHabits}
        onAdd={() => openAdd('daily')} onReorder={setDailyHabits}
        {...shared}
      />
      <HabitSection
        title="Weekly Habits" type="weekly" habits={weeklyHabits}
        onAdd={() => openAdd('weekly')} onReorder={setWeeklyHabits}
        {...shared}
      />

      {modal.open && (
        <HabitModal
          habit={modal.habit} defaultType={modal.defaultType}
          month={month} year={year}
          onSave={handleSave} onClose={close}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ── HabitSection ──────────────────────────────────────────────────────────

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
  onAdd:     () => void
  onEdit:    (h: Habit) => void
  onDelete:  (h: Habit) => void
  onReorder: (habits: Habit[]) => void
}

function HabitSection({
  title, type, habits, onAdd, onReorder, countDone, ...rest
}: SectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const avgRate = habits.length > 0
    ? Math.round(habits.reduce((s, h) => s + pct(countDone(h.id), h.goal), 0) / habits.length)
    : 0

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx    = habits.findIndex(h => h.id === active.id)
    const newIdx    = habits.findIndex(h => h.id === over.id)
    const reordered = arrayMove(habits, oldIdx, newIdx)
    onReorder(reordered)
    fetch('/api/habits/reorder', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: reordered.map(h => h.id) }),
    })
  }

  return (
    <section>
      {/* ── Section header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Accent bar + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 3, height: 26, borderRadius: 2, background: ACCENT, flexShrink: 0 }} />
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800,
              color: '#1d1b15', margin: 0, letterSpacing: '-0.02em',
            }}>
              {title}
            </h2>
          </div>

          {/* Stats badge */}
          {habits.length > 0 && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9.5, color: '#88726d',
              background: 'rgba(219,193,187,0.2)', borderRadius: 999,
              padding: '4px 11px', border: '1px solid rgba(219,193,187,0.35)',
              letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase',
            }}>
              {habits.length} habit{habits.length !== 1 ? 's' : ''} · {avgRate}% avg
            </span>
          )}

          <div style={{ flex: 1 }} />

          {/* Add button */}
          <button
            onClick={onAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 999,
              background: ACCENT, color: '#fff', border: 'none',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 2px 10px rgba(149,67,47,0.2)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = '#7a2f1c'
              el.style.boxShadow = '0 4px 18px rgba(149,67,47,0.32)'
              el.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = ACCENT
              el.style.boxShadow = '0 2px 10px rgba(149,67,47,0.2)'
              el.style.transform = ''
            }}
          >
            <Plus size={13} />
            Add habit
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {habits.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '56px 24px', borderRadius: 20,
          border: '1.5px dashed rgba(219,193,187,0.55)',
          background: 'rgba(255,255,255,0.4)',
          gap: 12,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(149,67,47,0.06)', border: '1px solid rgba(149,67,47,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Plus size={20} color={ACCENT} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: '#1d1b15', margin: '0 0 4px' }}>
              No {type} habits yet
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#88726d', margin: 0 }}>
              Add your first one to start tracking
            </p>
          </div>
          <button
            onClick={onAdd}
            style={{
              marginTop: 4, padding: '9px 22px', borderRadius: 999,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: '1px solid rgba(149,67,47,0.3)',
              background: 'rgba(149,67,47,0.06)', color: ACCENT,
              fontFamily: 'var(--font-body)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = ACCENT; el.style.color = '#fff'
              el.style.borderColor = ACCENT
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'rgba(149,67,47,0.06)'; el.style.color = ACCENT
              el.style.borderColor = 'rgba(149,67,47,0.3)'
            }}
          >
            Add your first {type} habit →
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={habits.map(h => h.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {habits.map((h, i) => (
                <HabitCard key={h.id} habit={h} type={type} countDone={countDone} index={i} {...rest} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}

// ── HabitCard ─────────────────────────────────────────────────────────────

interface CardProps {
  habit:   Habit
  type:    HabitType
  month:   number
  year:    number
  today:   string
  numDays: number
  index:   number
  isCompleted: (id: string, date: string) => boolean
  countDone:   (id: string) => number
  getStreak:   (id: string) => number
  toggle:      (id: string, date: string) => void
  loading:     string | null
  onEdit:   (h: Habit) => void
  onDelete: (h: Habit) => void
}

function HabitCard({
  habit, type, month, year, today, numDays, index,
  isCompleted, countDone, getStreak, toggle, loading,
  onEdit, onDelete,
}: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: habit.id })

  const done   = countDone(habit.id)
  const rate   = pct(done, habit.goal)
  const streak = getStreak(habit.id)
  const hasStreak = streak > 0

  return (
    <div
      ref={setNodeRef}
      className="group"
      style={{
        transform:  CSS.Transform.toString(transform),
        transition: isDragging ? transition : 'transform 0.2s, box-shadow 0.2s, border-left-color 0.3s',
        opacity:    isDragging ? 0.55 : 1,
        zIndex:     isDragging ? 20 : undefined,
        animationDelay: `${index * 45}ms`,
        // Glass card
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255, 255, 255, 0.92)',
        borderLeft: `3px solid ${hasStreak ? ACCENT : 'rgba(219,193,187,0.45)'}`,
        borderRadius: 16,
        boxShadow: `0 4px 20px rgba(149,67,47,${hasStreak ? '0.07' : '0.03'})`,
        padding: '18px 22px',
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 10px 36px rgba(149,67,47,${hasStreak ? '0.12' : '0.07'})`
        }
      }}
      onMouseLeave={e => {
        if (!isDragging) {
          (e.currentTarget as HTMLDivElement).style.transform = ''
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px rgba(149,67,47,${hasStreak ? '0.07' : '0.03'})`
        }
      }}
    >
      {/* ── Header row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: type === 'daily' ? 14 : 16 }}>

        {/* Drag handle */}
        <button
          {...attributes} {...listeners}
          title="Drag to reorder"
          style={{
            background: 'none', border: 'none', cursor: 'grab',
            padding: '2px 4px', color: 'rgba(219,193,187,0.7)',
            flexShrink: 0, display: 'flex', alignItems: 'center',
            transition: 'color 0.15s',
            touchAction: 'none',
          }}
          className="group-hover:[&]:!text-[rgba(149,67,47,0.4)]"
        >
          <GripVertical size={15} />
        </button>

        {/* Habit name */}
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 600,
          color: '#1d1b15', flex: 1, letterSpacing: '-0.01em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {habit.name}
        </span>

        {/* Streak badge */}
        {hasStreak && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: streak >= 7 ? 'rgba(149,67,47,0.11)' : 'rgba(204,112,85,0.09)',
            color: streak >= 7 ? ACCENT : ACCENT_MID,
            borderRadius: 999, padding: '3px 9px',
            fontSize: 11, fontWeight: 700,
            fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
            border: `1px solid ${streak >= 7 ? 'rgba(149,67,47,0.18)' : 'rgba(204,112,85,0.15)'}`,
            flexShrink: 0,
          }}>
            <Flame size={11} />
            {streak}d
          </span>
        )}

        {/* Edit / Delete — appear on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex gap-1" style={{ flexShrink: 0 }}>
          <IconBtn onClick={() => onEdit(habit)} title="Edit">
            <Pencil size={12} />
          </IconBtn>
          <IconBtn onClick={() => onDelete(habit)} title="Delete" danger>
            <Trash2 size={12} />
          </IconBtn>
        </div>

        {/* Progress ring */}
        <Ring value={done} max={habit.goal} id={habit.id} size={44} />
      </div>

      {/* ── Day grid (daily) ── */}
      {type === 'daily' && (
        <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
          <div style={{ display: 'flex', gap: 3, minWidth: 'max-content' }}>
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
                  title={`${month}/${d}${tick ? ' ✓' : ''}`}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 3, flexShrink: 0,
                    opacity: fut ? 0.18 : 1,
                    cursor: fut ? 'default' : 'pointer',
                    background: 'none', border: 'none', padding: 0,
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={e => { if (!fut) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                  onMouseDown={e => { if (!fut) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.88)' }}
                  onMouseUp={e => { if (!fut) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)' }}
                >
                  {/* Day number */}
                  <span style={{
                    fontSize: 8.5, lineHeight: 1, fontFamily: 'monospace',
                    color: isT ? ACCENT : '#88726d',
                    fontWeight: isT ? 700 : 400,
                  }}>
                    {d}
                  </span>

                  {/* Cell */}
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                    ...(tick
                      ? {
                          background: `linear-gradient(135deg, ${ACCENT_MID} 0%, ${ACCENT} 100%)`,
                          border: 'none',
                          boxShadow: '0 2px 8px rgba(149,67,47,0.3)',
                        }
                      : isT
                      ? {
                          background: 'rgba(149,67,47,0.04)',
                          border: `1.5px dashed ${ACCENT}`,
                        }
                      : {
                          background: 'transparent',
                          border: '1.5px solid rgba(219,193,187,0.6)',
                        }
                    ),
                  }}>
                    {tick && (
                      <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                        <path d="M1 4.5L3.8 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Week indicators (weekly) ── */}
      {type === 'weekly' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          {[1, 2, 3, 4, 5].map(wk => {
            const firstDay = (wk - 1) * 7 + 1
            if (firstDay > numDays) return null
            const lastDay = Math.min(wk * 7, numDays)
            const date    = toISODate(year, month, firstDay)
            const tick    = isCompleted(habit.id, date)
            const fut     = date > today
            const lkey    = `${habit.id}__${date}`

            return (
              <button
                key={wk}
                onClick={() => toggle(habit.id, date)}
                disabled={fut || loading === lkey}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 6, padding: '12px 8px', borderRadius: 12, cursor: fut ? 'default' : 'pointer',
                  border: 'none', transition: 'all 0.18s',
                  opacity: fut ? 0.28 : 1,
                  ...(tick
                    ? {
                        background: `linear-gradient(145deg, ${ACCENT_MID}18, ${ACCENT}14)`,
                        boxShadow: `inset 0 0 0 1.5px ${ACCENT}30`,
                      }
                    : {
                        background: 'rgba(219,193,187,0.12)',
                        boxShadow: 'inset 0 0 0 1.5px rgba(219,193,187,0.4)',
                      }
                  ),
                }}
                onMouseEnter={e => { if (!fut) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
              >
                {/* Week label */}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                  color: tick ? ACCENT : '#88726d', fontWeight: 700, textTransform: 'uppercase',
                }}>
                  W{wk}
                </span>

                {/* Check circle */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.18s',
                  ...(tick
                    ? {
                        background: `linear-gradient(135deg, ${ACCENT_MID} 0%, ${ACCENT} 100%)`,
                        boxShadow: '0 3px 10px rgba(149,67,47,0.32)',
                      }
                    : {
                        background: 'rgba(219,193,187,0.15)',
                        border: '1.5px solid rgba(219,193,187,0.5)',
                      }
                  ),
                }}>
                  {tick && (
                    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                      <path d="M1 5.5L5 9.5L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Date range */}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 8.5, color: '#88726d',
                  letterSpacing: '0.04em',
                }}>
                  {firstDay}–{lastDay}
                </span>
              </button>
            )
          })}

          {/* Monthly tally */}
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            alignItems: 'flex-end', paddingLeft: 16, borderLeft: '1px solid rgba(219,193,187,0.25)',
            minWidth: 72, flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#1d1b15', lineHeight: 1 }}>
              {done}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#88726d', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>
              / {habit.goal} goal
            </span>
          </div>
        </div>
      )}

      {/* ── Monthly progress bar ── */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(219,193,187,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: '#88726d', fontWeight: 700,
          }}>
            Monthly
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: rate >= 80 ? ACCENT : '#88726d', fontWeight: rate >= 80 ? 700 : 400 }}>
            {done} / {habit.goal} · {rate}%
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: 'rgba(219,193,187,0.28)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 999,
            background: rate >= 80
              ? `linear-gradient(90deg, ${ACCENT_MID} 0%, ${ACCENT} 100%)`
              : rate >= 50
              ? `linear-gradient(90deg, rgba(219,193,187,0.8) 0%, ${ACCENT_MID} 100%)`
              : 'rgba(219,193,187,0.55)',
            width: `${Math.min(100, rate)}%`,
            transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
      </div>
    </div>
  )
}

// ── DeleteConfirmModal ────────────────────────────────────────────────────

function DeleteConfirmModal({ name, onConfirm, onCancel }: {
  name:      string
  onConfirm: () => void
  onCancel:  () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(29,27,21,0.32)', backdropFilter: 'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="w-full max-w-sm text-center"
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(219,193,187,0.45)', borderRadius: 22, padding: '32px 28px',
          boxShadow: '0 20px 60px rgba(29,27,21,0.12)',
          animation: 'slideUp 0.2s ease',
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          background: 'rgba(149,67,47,0.07)', border: '1px solid rgba(149,67,47,0.18)',
        }}>
          <Trash2 size={18} color={ACCENT} />
        </div>

        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#1d1b15', margin: '0 0 10px' }}>
          Remove habit?
        </h3>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#55443d', lineHeight: 1.6, margin: '0 0 24px' }}>
          <span style={{ color: '#1d1b15', fontWeight: 600 }}>&ldquo;{name}&rdquo;</span> and all its
          completion history will be permanently deleted.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '11px', borderRadius: 999, fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.15s',
              background: 'transparent', border: '1px solid rgba(219,193,187,0.6)', color: '#55443d',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3ede3' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '11px', borderRadius: 999, fontSize: 13, fontWeight: 700,
              fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.2s',
              background: ACCENT, color: '#fff', border: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#7a2f1c' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ACCENT }}
          >
            Yes, remove it
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ring ──────────────────────────────────────────────────────────────────

function Ring({ value, max, id, size = 44 }: {
  value: number; max: number; id: string; size?: number
}) {
  const sw     = 3.5
  const r      = (size - sw * 2) / 2
  const circ   = 2 * Math.PI * r
  const fill   = max > 0 ? Math.min(value / max, 1) : 0
  const rate   = Math.round(fill * 100)
  const cx     = size / 2
  const gradId = `rg-${id}`

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={ACCENT_MID} />
            <stop offset="100%" stopColor={ACCENT}     />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(219,193,187,0.38)" strokeWidth={sw} />
        {fill > 0 && (
          <circle
            cx={cx} cy={cx} r={r} fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={sw}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - fill)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(.4,0,.2,1)' }}
          />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{
          fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
          color: fill > 0 ? ACCENT : '#88726d',
        }}>
          {rate}%
        </span>
      </div>
    </div>
  )
}

// ── IconBtn ───────────────────────────────────────────────────────────────

function IconBtn({ onClick, title, danger, children }: {
  onClick: () => void; title: string; danger?: boolean; children: ReactNode
}) {
  return (
    <button
      onClick={onClick} title={title}
      style={{
        width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer',
        color: '#88726d', transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.color = danger ? '#e05252' : ACCENT
        el.style.background = danger ? 'rgba(224,82,82,0.08)' : 'rgba(149,67,47,0.08)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.color = '#88726d'
        el.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}
