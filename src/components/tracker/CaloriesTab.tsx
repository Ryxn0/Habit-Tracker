'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { todayISO } from '@/lib/utils'
import type { CalorieEntry, MealType } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

const ACCENT = '#E94560'
const CYAN   = '#22d3ee'
const PINK   = '#f472b6'
const ORANGE = '#fb923c'

const MEALS: { type: MealType; label: string; icon: string }[] = [
  { type: 'breakfast', label: 'Breakfast', icon: '☀️'  },
  { type: 'lunch',     label: 'Lunch',     icon: '🍱'  },
  { type: 'dinner',    label: 'Dinner',    icon: '🌙'  },
  { type: 'snack',     label: 'Snack',     icon: '🍎'  },
]

interface ChartDay { day: string; date: string; cals: number }
interface Settings  { daily_calorie_goal: number; protein_goal: number }

interface Props { userId: string }

export default function CaloriesTab({ userId }: Props) {
  const [entries,     setEntries]     = useState<CalorieEntry[]>([])
  const [settings,    setSettings]    = useState<Settings>({ daily_calorie_goal: 2000, protein_goal: 150 })
  const [weekData,    setWeekData]    = useState<{ day: string; cals: number }[]>([])
  const [showForm,    setShowForm]    = useState(false)
  const [editGoal,    setEditGoal]    = useState(false)
  const [goalInput,   setGoalInput]   = useState('2000')
  const [saving,      setSaving]      = useState(false)
  const [form, setForm] = useState({
    meal_type: 'breakfast' as MealType,
    food_name: '',
    calories:  '',
    protein:   '',
    carbs:     '',
    fat:       '',
  })

  const today = todayISO()
  const sb    = createClient()

  useEffect(() => { load() }, [userId])

  async function load() {
    const [entriesRes, settingsRes] = await Promise.all([
      sb.from('calorie_entries').select('*')
        .eq('user_id', userId).eq('date', today).order('created_at'),
      sb.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    ])
    setEntries(entriesRes.data ?? [])
    if (settingsRes.data) {
      setSettings(settingsRes.data)
      setGoalInput(String(settingsRes.data.daily_calorie_goal))
    }

    const days: ChartDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return {
        day:  d.toLocaleDateString('en', { weekday: 'short' }),
        date: d.toISOString().split('T')[0],
        cals: 0,
      }
    })
    const { data: hist } = await sb.from('calorie_entries')
      .select('date, calories')
      .eq('user_id', userId)
      .gte('date', days[0].date)
      .lte('date', today)
    if (hist) {
      hist.forEach((e: { date: string; calories: number }) => {
        const idx = days.findIndex(d => d.date === e.date)
        if (idx >= 0) days[idx].cals += e.calories
      })
    }
    setWeekData(days.map(d => ({ day: d.day, cals: d.cals })))
  }

  async function saveGoal() {
    const goal = Math.max(500, parseInt(goalInput) || 2000)
    await sb.from('user_settings').upsert(
      { user_id: userId, daily_calorie_goal: goal, protein_goal: settings.protein_goal },
      { onConflict: 'user_id' }
    )
    setSettings(s => ({ ...s, daily_calorie_goal: goal }))
    setGoalInput(String(goal))
    setEditGoal(false)
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data } = await sb.from('calorie_entries').insert({
      user_id:   userId,
      date:      today,
      meal_type: form.meal_type,
      food_name: form.food_name,
      calories:  parseInt(form.calories)  || 0,
      protein:   parseFloat(form.protein) || 0,
      carbs:     parseFloat(form.carbs)   || 0,
      fat:       parseFloat(form.fat)     || 0,
    }).select().single()
    if (data) setEntries(prev => [...prev, data as CalorieEntry])
    setForm({ meal_type: 'breakfast', food_name: '', calories: '', protein: '', carbs: '', fat: '' })
    setShowForm(false)
    setSaving(false)
    // Reload chart to reflect new entry
    load()
  }

  async function deleteEntry(id: string) {
    await sb.from('calorie_entries').delete().eq('id', id).eq('user_id', userId)
    setEntries(prev => prev.filter(e => e.id !== id))
    load()
  }

  const totalCals    = entries.reduce((s, e) => s + (e.calories || 0), 0)
  const totalProtein = entries.reduce((s, e) => s + Number(e.protein || 0), 0)
  const totalCarbs   = entries.reduce((s, e) => s + Number(e.carbs   || 0), 0)
  const totalFat     = entries.reduce((s, e) => s + Number(e.fat     || 0), 0)
  const calGoal      = settings.daily_calorie_goal
  const remaining    = Math.max(0, calGoal - totalCals)
  const pctDone      = Math.min(100, Math.round((totalCals / calGoal) * 100))
  const over         = totalCals > calGoal

  const inputCls = 'bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-400/60 text-sm'

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Calorie overview card ──────────────────────────────────── */}
      <div className="rounded-xl p-5" style={{ background: '#141E33', border: '1px solid #1E2D4E' }}>

        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#4B5563' }}>
              Today's Calories
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-4xl text-white">{totalCals.toLocaleString()}</span>
              <span className="text-sm" style={{ color: '#4B5563' }}>/ {calGoal.toLocaleString()}</span>
              {over && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(233,69,96,0.12)', color: ACCENT, border: '1px solid rgba(233,69,96,0.25)' }}>
                  +{(totalCals - calGoal).toLocaleString()} over
                </span>
              )}
            </div>
          </div>

          {editGoal ? (
            <div className="flex items-center gap-2">
              <input
                type="number" value={goalInput} min={500} max={10000}
                onChange={e => setGoalInput(e.target.value)}
                className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-400/60"
              />
              <button onClick={saveGoal}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95"
                style={{ background: ACCENT, color: '#fff' }}>
                Save
              </button>
              <button onClick={() => setEditGoal(false)} className="text-xs transition-colors" style={{ color: '#4B5563' }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setEditGoal(true)}
              className="text-xs transition-colors mt-1" style={{ color: '#4B5563' }}>
              Edit goal
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: '#1E2D4E' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pctDone}%`,
              background: over
                ? ACCENT
                : `linear-gradient(90deg, ${CYAN}, ${ACCENT})`,
            }}
          />
        </div>

        {/* Remaining + macros */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-xs font-mono mb-1" style={{ color: '#4B5563' }}>Remaining</div>
            <div className="font-display text-xl" style={{ color: over ? ACCENT : '#4ade80' }}>
              {remaining.toLocaleString()}
              <span className="text-xs text-muted ml-0.5">kcal</span>
            </div>
          </div>
          {[
            { label: 'Protein', value: totalProtein, color: CYAN   },
            { label: 'Carbs',   value: totalCarbs,   color: PINK   },
            { label: 'Fat',     value: totalFat,     color: ORANGE },
          ].map(m => (
            <div key={m.label} className="text-center">
              <div className="text-xs font-mono mb-1" style={{ color: '#4B5563' }}>{m.label}</div>
              <div className="font-display text-xl" style={{ color: m.color }}>
                {Math.round(m.value)}
                <span className="text-xs text-muted ml-0.5">g</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Weekly bar chart ───────────────────────────────────────── */}
      <div className="rounded-xl p-5" style={{ background: '#141E33', border: '1px solid #1E2D4E' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#4B5563' }}>
            7-Day Overview
          </span>
          <span className="text-xs font-mono" style={{ color: '#4B5563' }}>
            Goal: {calGoal.toLocaleString()} kcal
          </span>
        </div>
        <div style={{ height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} barSize={28} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#4B5563', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#0F1829', border: '1px solid #1E2D4E', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#9CA3AF' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                formatter={(v) => [`${Number(v).toLocaleString()} kcal`, '']}
              />
              <Bar dataKey="cals" radius={[4, 4, 0, 0]}>
                {weekData.map((d, i) => (
                  <Cell key={i} fill={i === weekData.length - 1 ? ACCENT : '#1E2D4E'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Food log ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-xl text-white">Food Log</span>
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            style={{ background: showForm ? '#1E2D4E' : ACCENT, color: '#fff' }}
          >
            {showForm ? 'Cancel' : '+ Add food'}
          </button>
        </div>

        {/* Add food form */}
        {showForm && (
          <form onSubmit={addEntry} className="rounded-xl p-4 mb-4 space-y-3 animate-slide-up"
            style={{ background: '#141E33', border: '1px solid #1E2D4E' }}>

            {/* Meal type pills */}
            <div className="flex gap-2 flex-wrap">
              {MEALS.map(m => (
                <button key={m.type} type="button"
                  onClick={() => setForm(f => ({ ...f, meal_type: m.type }))}
                  className="flex-1 min-w-[80px] py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                  style={{
                    background: form.meal_type === m.type ? ACCENT + '20' : 'transparent',
                    border:     `1px solid ${form.meal_type === m.type ? ACCENT : '#1E2D4E'}`,
                    color:      form.meal_type === m.type ? ACCENT : '#4B5563',
                  }}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            <input
              type="text" placeholder="Food name" required
              value={form.food_name}
              onChange={e => setForm(f => ({ ...f, food_name: e.target.value }))}
              className={`w-full ${inputCls}`}
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['calories', 'protein', 'carbs', 'fat'] as const).map(field => (
                <input key={field} type="number" step="any" min="0"
                  placeholder={{ calories: 'Calories', protein: 'Protein g', carbs: 'Carbs g', fat: 'Fat g' }[field]}
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  className={`${inputCls} text-center`}
                />
              ))}
            </div>

            <button type="submit" disabled={saving}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #9b2335)`, boxShadow: '0 0 20px rgba(233,69,96,0.3)' }}>
              {saving ? 'Adding...' : 'Add to log'}
            </button>
          </form>
        )}

        {/* Entries */}
        {entries.length === 0 ? (
          <div className="flex flex-col items-center py-14 border border-dashed border-border rounded-xl">
            <p className="text-muted text-sm mb-3">Nothing logged yet today</p>
            <button onClick={() => setShowForm(true)} className="text-sm" style={{ color: ACCENT }}>
              Add your first meal →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {MEALS.filter(m => entries.some(e => e.meal_type === m.type)).map(m => {
              const mealEntries = entries.filter(e => e.meal_type === m.type)
              const mealCals    = mealEntries.reduce((s, e) => s + (e.calories || 0), 0)
              return (
                <div key={m.type}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span>{m.icon}</span>
                    <span className="text-sm font-semibold text-white">{m.label}</span>
                    <span className="text-xs font-mono" style={{ color: '#4B5563' }}>
                      {mealCals.toLocaleString()} kcal
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {mealEntries.map(entry => (
                      <div key={entry.id}
                        className="flex items-center justify-between px-4 py-3 rounded-xl group"
                        style={{ background: '#141E33', border: '1px solid #1E2D4E' }}>
                        <div>
                          <span className="text-sm text-gray-200">{entry.food_name}</span>
                          <div className="text-xs mt-0.5" style={{ color: '#4B5563' }}>
                            P:{Math.round(Number(entry.protein))}g &nbsp;
                            C:{Math.round(Number(entry.carbs))}g &nbsp;
                            F:{Math.round(Number(entry.fat))}g
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono" style={{ color: CYAN }}>
                            {entry.calories.toLocaleString()} kcal
                          </span>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all text-base leading-none">
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
