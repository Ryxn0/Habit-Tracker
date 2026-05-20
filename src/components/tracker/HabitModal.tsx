'use client'

import { useState } from 'react'
import { getDaysInMonth } from 'date-fns'
import type { Habit, HabitType } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  habit: Habit | null        // null = adding new
  defaultType: HabitType     // pre-selected type when adding
  month: number
  year: number
  onSave: (name: string, type: HabitType, goal: number) => Promise<void>
  onClose: () => void
}

export default function HabitModal({ habit, defaultType, month, year, onSave, onClose }: Props) {
  const isEditing = !!habit
  const daysInMonth = getDaysInMonth(new Date(year, month - 1))

  const [name, setName]   = useState(habit?.name ?? '')
  const [type, setType]   = useState<HabitType>(habit?.type ?? defaultType)
  const [goal, setGoal]   = useState(habit?.goal ?? 4)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    // For daily habits the goal is always the days in the month
    await onSave(name.trim(), type, type === 'daily' ? daysInMonth : goal)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card w-full max-w-md animate-slide-up">
        <h2 className="font-display text-xl text-white mb-6">
          {isEditing ? 'Edit Habit' : 'New Habit'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-subtle text-sm block mb-1.5">Name</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Read for 10 minutes"
              autoFocus
              required
              maxLength={80}
            />
          </div>

          {/* Type selector — add mode only */}
          {!isEditing && (
            <div>
              <label className="text-subtle text-sm block mb-2">Type</label>
              <div className="flex gap-2">
                {(['daily', 'weekly'] as HabitType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-sm capitalize transition-colors',
                      type === t
                        ? 'bg-accent/20 border-accent text-white'
                        : 'border-border text-muted hover:border-subtle hover:text-subtle'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly goal — weekly habits only */}
          {type === 'weekly' && (
            <div>
              <label className="text-subtle text-sm block mb-1.5">
                Monthly goal
                <span className="text-muted ml-1 text-xs">times this month</span>
              </label>
              <input
                type="number"
                className="input"
                min={1}
                max={daysInMonth}
                value={goal}
                onChange={e => setGoal(Math.max(1, Math.min(daysInMonth, Number(e.target.value))))}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
