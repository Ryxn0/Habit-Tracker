'use client'

import { useState } from 'react'
import { getDaysInMonth } from 'date-fns'
import type { Habit, HabitType } from '@/types'
import { cn } from '@/lib/utils'

const PRESETS: Record<HabitType, string[]> = {
  daily: [
    'Exercise', 'Meditate', 'Read', 'Journal',
    'Drink water', 'Walk 10k steps', 'Sleep by 10pm', 'Cold shower',
    'No social media', 'Stretch / Yoga', 'Cook at home', 'Practice gratitude',
    'Study', 'No sugar', 'No alcohol', 'Skincare routine',
  ],
  weekly: [
    'Review goals', 'Meal prep', 'Call family', 'Deep clean',
    'Weekly review', 'Long walk / hike', 'Date night', 'Social outing',
    'Batch cook', 'Practice a skill', 'Plan next week', 'Read a chapter',
  ],
}

interface Props {
  habit:       Habit | null
  defaultType: HabitType
  month:       number
  year:        number
  onSave:  (name: string, type: HabitType, goal: number) => Promise<void>
  onClose: () => void
}

export default function HabitModal({ habit, defaultType, month, year, onSave, onClose }: Props) {
  const isEditing   = !!habit
  const daysInMonth = getDaysInMonth(new Date(year, month - 1))

  const [name,     setName]     = useState(habit?.name ?? '')
  const [type,     setType]     = useState<HabitType>(habit?.type ?? defaultType)
  const [goal,     setGoal]     = useState(habit?.goal ?? 4)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(isEditing ? (habit?.name ?? null) : null)

  const presets = PRESETS[type]

  function pickPreset(preset: string) {
    setName(preset)
    setSelected(preset)
  }

  function handleTypeChange(t: HabitType) {
    setType(t)
    setSelected(null)
    setName('')
  }

  function handleNameChange(val: string) {
    setName(val)
    setSelected(presets.includes(val) ? val : null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave(name.trim(), type, type === 'daily' ? daysInMonth : goal)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card w-full max-w-lg animate-slide-up">
        <h2 className="font-display text-xl text-white mb-5">
          {isEditing ? 'Edit Habit' : `Add ${type === 'daily' ? 'Daily' : 'Weekly'} Habit`}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Type toggle — add mode only */}
          {!isEditing && (
            <div className="flex gap-2">
              {(['daily', 'weekly'] as HabitType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
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
          )}

          {/* Preset chips — add mode only */}
          {!isEditing && (
            <div>
              <p className="text-muted text-xs font-mono uppercase tracking-widest mb-3">
                Quick add
              </p>
              <div className="flex flex-wrap gap-2">
                {presets.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => pickPreset(preset)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm border transition-all duration-150',
                      selected === preset
                        ? 'bg-accent/20 border-accent text-white'
                        : 'border-border text-muted hover:border-subtle hover:text-white'
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name input */}
          <div>
            <label className="text-subtle text-sm block mb-1.5">
              {isEditing ? 'Name' : 'Or type your own'}
            </label>
            <input
              className="input"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Read for 10 minutes"
              autoFocus={isEditing}
              required
              maxLength={80}
            />
          </div>

          {/* Monthly goal — weekly only */}
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

          {/* Error */}
          {error && (
            <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#f4725620', border: '1px solid #f47256', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
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
