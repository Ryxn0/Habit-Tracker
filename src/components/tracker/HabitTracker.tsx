'use client'

import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
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
  const [loading,      setLoading]      = useState<string | null>(null)
  const [modal,        setModal]        = useState<ModalState>({ open: false, habit: null, defaultType: 'daily' })
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null)

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
    <div className="space-y-14">
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
    const oldIdx   = habits.findIndex(h => h.id === active.id)
    const newIdx   = habits.findIndex(h => h.id === over.id)
    const reordered = arrayMove(habits, oldIdx, newIdx)
    onReorder(reordered)
    fetch('/api/habits/reorder', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ids: reordered.map(h => h.id) }),
    })
  }

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
        <button onClick={onAdd} className="btn-primary text-sm px-5 py-2">
          + Add habit
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={habits.map(h => h.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
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

// ── HabitCard ─────────────────────────────────────────────────────────

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

  const cardStyle = {
    transform:      CSS.Transform.toString(transform),
    transition,
    opacity:        isDragging ? 0.5 : 1,
    zIndex:         isDragging ? 20 : undefined,
    animationDelay: `${index * 55}ms`,
  }

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      className="group habit-card animate-slide-up"
    >
      {/* ── Header row ── */}
      <div className="flex items-center gap-3 mb-3">

        {/* Drag handle */}
        <button
          {...attributes} {...listeners}
          title="Drag to reorder"
          className="flex-shrink-0 text-muted opacity-30 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none', padding: '2px 4px', background: 'none', border: 'none' }}
        >
          <DragIcon />
        </button>

        {/* Habit name */}
        <span className="text-sm text-gray-200 font-medium flex-1 truncate">{habit.name}</span>

        {/* Edit / delete — visible on hover */}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity duration-150 flex-shrink-0">
          <Btn onClick={() => onEdit(habit)}   title="Edit">✎</Btn>
          <Btn onClick={() => onDelete(habit)} title="Delete" danger>✕</Btn>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {streak > 0 ? (
            <span className="text-xs font-mono" style={{ color: PINK }}>{streak}d 🔥</span>
          ) : (
            <span className="text-xs font-mono text-muted">—</span>
          )}
        </div>

        {/* Progress ring */}
        <Ring value={done} max={habit.goal} id={habit.id} />
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
                className="flex flex-col items-center flex-shrink-0 active:scale-90 transition-transform duration-100"
                style={{ gap: 2, opacity: fut ? 0.2 : 1, cursor: fut ? 'default' : 'pointer' }}
              >
                <span style={{ fontSize: 8, lineHeight: 1, fontFamily: 'monospace', color: isT ? CYAN : '#374151' }}>
                  {d}
                </span>
                <div style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  border:     `1px solid ${tick ? ACCENT : isT ? CYAN + '55' : '#1E2D4E'}`,
                  background: tick ? ACCENT + '22' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {tick && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="animate-pop">
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
                    border:     `1px solid ${tick ? ACCENT : '#1E2D4E'}`,
                    background: tick ? ACCENT + '20' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: fut ? 'default' : 'pointer',
                    opacity: fut ? 0.2 : 1,
                    transition: 'all 0.15s',
                    transform: 'scale(1)',
                  }}
                  onMouseEnter={e => { if (!fut) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
                  onMouseDown={e =>  { if (!fut) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)' }}
                  onMouseUp={e =>    { if (!fut) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
                >
                  {tick && (
                    <svg width="14" height="11" viewBox="0 0 14 11" fill="none" className="animate-pop">
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

// ── DeleteConfirmModal ────────────────────────────────────────────────

function DeleteConfirmModal({ name, onConfirm, onCancel }: {
  name:      string
  onConfirm: () => void
  onCancel:  () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="card w-full max-w-sm animate-slide-up text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: '#E9456015', border: '1px solid #E9456030' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M8.5 4h3M3 6h14M5.5 6l.9 10.1A1 1 0 007.4 17h5.2a1 1 0 001-.9L14.5 6"
              stroke="#E94560" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h3 className="font-display text-xl text-white mb-2">Remove habit?</h3>
        <p className="text-muted text-sm mb-6 leading-relaxed">
          <span className="text-subtle font-medium">&ldquo;{name}&rdquo;</span> and all its
          completion history will be permanently deleted.
        </p>

        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{ background: '#E94560', color: '#fff' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#d63b54' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E94560' }}
          >
            Yes, remove it
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ring ──────────────────────────────────────────────────────────────

function Ring({ value, max, id, size = 44 }: {
  value: number; max: number; id: string; size?: number
}) {
  const sw     = 4
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
            <stop offset="0%"   stopColor={ACCENT} />
            <stop offset="100%" stopColor={PINK}   />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1E2D4E" strokeWidth={sw} />
        {fill > 0 && (
          <circle
            cx={cx} cy={cx} r={r} fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={sw}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - fill)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 600, color: fill > 0 ? CYAN : '#374151' }}>
          {rate}%
        </span>
      </div>
    </div>
  )
}

// ── Btn ───────────────────────────────────────────────────────────────

function Btn({ onClick, title, danger, children }: {
  onClick: () => void; title: string; danger?: boolean; children: ReactNode
}) {
  return (
    <button
      onClick={onClick} title={title}
      className="w-9 h-9 flex items-center justify-center rounded text-muted hover:text-white transition-all duration-150 hover:scale-125 active:scale-95"
      style={{ fontSize: 17, background: 'none', border: 'none', cursor: 'pointer' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = danger ? '#f87171' : '#fff' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '' }}
    >
      {children}
    </button>
  )
}

// ── DragIcon ──────────────────────────────────────────────────────────

function DragIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="3" cy="2.5" r="1.2" />
      <circle cx="7" cy="2.5" r="1.2" />
      <circle cx="3" cy="7"   r="1.2" />
      <circle cx="7" cy="7"   r="1.2" />
      <circle cx="3" cy="11.5" r="1.2" />
      <circle cx="7" cy="11.5" r="1.2" />
    </svg>
  )
}
