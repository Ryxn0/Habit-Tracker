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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13,
    fontFamily: 'var(--font-body)', background: 'rgba(249,243,233,0.8)',
    border: '1px solid rgba(219,193,187,0.4)', outline: 'none',
    color: '#1d1b15', boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(29,27,21,0.3)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg animate-slide-up"
        style={{
          background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(219,193,187,0.45)', borderRadius: 24, padding: '28px 32px',
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#95432f', marginBottom: 20, letterSpacing: '-0.02em' }}>
          {isEditing ? 'Edit Habit' : `Add ${type === 'daily' ? 'Daily' : 'Weekly'} Habit`}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Type toggle — add mode only */}
          {!isEditing && (
            <div style={{ display: 'flex', gap: 8 }}>
              {(['daily', 'weekly'] as HabitType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--font-body)', textTransform: 'capitalize', cursor: 'pointer',
                    background: type === t ? 'rgba(149,67,47,0.1)' : 'transparent',
                    border: `1px solid ${type === t ? '#95432f' : 'rgba(219,193,187,0.5)'}`,
                    color: type === t ? '#95432f' : '#55443d',
                    transition: 'all 0.15s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Preset chips */}
          {!isEditing && (
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#88726d', fontWeight: 700, marginBottom: 10 }}>
                Quick add
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {presets.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => pickPreset(preset)}
                    style={{
                      padding: '5px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                      fontFamily: 'var(--font-body)', fontWeight: 500, transition: 'all 0.15s',
                      background: selected === preset ? 'rgba(149,67,47,0.1)' : 'rgba(249,243,233,0.8)',
                      border: `1px solid ${selected === preset ? '#95432f' : 'rgba(219,193,187,0.4)'}`,
                      color: selected === preset ? '#95432f' : '#55443d',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name input */}
          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#55443d', display: 'block', marginBottom: 8, fontWeight: 600 }}>
              {isEditing ? 'Name' : 'Or type your own'}
            </label>
            <input
              style={inputStyle}
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Read for 10 minutes"
              autoFocus={isEditing}
              required
              maxLength={80}
              onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#95432f' }}
              onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(219,193,187,0.4)' }}
            />
          </div>

          {/* Monthly goal — weekly only */}
          {type === 'weekly' && (
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#55443d', display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Monthly goal <span style={{ color: '#88726d', fontWeight: 400 }}>— times this month</span>
              </label>
              <input
                type="number"
                style={inputStyle}
                min={1}
                max={daysInMonth}
                value={goal}
                onChange={e => setGoal(Math.max(1, Math.min(daysInMonth, Number(e.target.value))))}
                onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#95432f' }}
                onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(219,193,187,0.4)' }}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ fontSize: 13, padding: '10px 14px', borderRadius: 10, background: 'rgba(149,67,47,0.08)', border: '1px solid rgba(149,67,47,0.2)', color: '#95432f' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button" onClick={onClose}
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
              type="submit"
              disabled={!name.trim() || saving}
              style={{
                flex: 1, padding: '11px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--font-body)', cursor: !name.trim() || saving ? 'default' : 'pointer',
                background: '#95432f', color: '#fff', border: 'none', transition: 'all 0.2s',
                opacity: !name.trim() || saving ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (name.trim() && !saving) (e.currentTarget as HTMLButtonElement).style.background = '#7a2f1c' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#95432f' }}
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
