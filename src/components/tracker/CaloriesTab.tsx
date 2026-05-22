'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { todayISO } from '@/lib/utils'
import type { CalorieEntry, MealType } from '@/types'
import { Plus, Trash2, Sparkles, Flame, Coffee, UtensilsCrossed, Zap, Apple, ShieldAlert } from 'lucide-react'

const ACCENT = '#95432f'

const MEALS: { type: MealType; label: string; icon: React.ReactNode }[] = [
  { type: 'breakfast', label: 'Breakfast', icon: <Coffee size={14} color="#88726d" /> },
  { type: 'lunch',     label: 'Lunch',     icon: <UtensilsCrossed size={14} color="#55443d" /> },
  { type: 'dinner',    label: 'Dinner',    icon: <Zap size={14} color="#95432f" /> },
  { type: 'snack',     label: 'Snack',     icon: <Apple size={14} color="#95432f" /> },
]

const QUICK_FOODS = [
  { name: 'Sourdough Avocado Toast', calories: 280, type: 'breakfast' as MealType },
  { name: 'Steamed Salmon Quinoa Bowl', calories: 540, type: 'lunch' as MealType },
  { name: 'Pure Matcha Protein Shake', calories: 220, type: 'snack' as MealType },
  { name: 'Almond Berry Chia Pudding', calories: 190, type: 'breakfast' as MealType },
  { name: 'Grilled Tempeh & Broccoli', calories: 410, type: 'dinner' as MealType },
  { name: 'Raw Handful Walnuts & Figs', calories: 150, type: 'snack' as MealType },
]

interface Settings { daily_calorie_goal: number; protein_goal: number }

interface Props { userId: string }

export default function CaloriesTab({ userId }: Props) {
  const [entries,   setEntries]   = useState<CalorieEntry[]>([])
  const [settings,  setSettings]  = useState<Settings>({ daily_calorie_goal: 2000, protein_goal: 150 })
  const [editGoal,  setEditGoal]  = useState(false)
  const [goalInput, setGoalInput] = useState('2000')
  const [saving,    setSaving]    = useState(false)
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
      sb.from('calorie_entries').select('*').eq('user_id', userId).eq('date', today).order('created_at'),
      sb.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    ])
    setEntries(entriesRes.data ?? [])
    if (settingsRes.data) {
      setSettings(settingsRes.data)
      setGoalInput(String(settingsRes.data.daily_calorie_goal))
    }
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault()
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
      user_id:   userId, date: today,
      meal_type: form.meal_type, food_name: form.food_name,
      calories:  parseInt(form.calories)  || 0,
      protein:   parseFloat(form.protein) || 0,
      carbs:     parseFloat(form.carbs)   || 0,
      fat:       parseFloat(form.fat)     || 0,
    }).select().single()
    if (data) setEntries(prev => [...prev, data as CalorieEntry])
    setForm({ meal_type: 'breakfast', food_name: '', calories: '', protein: '', carbs: '', fat: '' })
    setSaving(false)
    load()
  }

  async function quickAdd(food: typeof QUICK_FOODS[0]) {
    const { data } = await sb.from('calorie_entries').insert({
      user_id:   userId, date: today,
      meal_type: food.type, food_name: food.name,
      calories: food.calories, protein: 0, carbs: 0, fat: 0,
    }).select().single()
    if (data) setEntries(prev => [...prev, data as CalorieEntry])
    load()
  }

  async function deleteEntry(id: string) {
    await sb.from('calorie_entries').delete().eq('id', id).eq('user_id', userId)
    setEntries(prev => prev.filter(e => e.id !== id))
    load()
  }

  const totalCals = entries.reduce((s, e) => s + (e.calories || 0), 0)
  const calGoal   = settings.daily_calorie_goal
  const remaining = Math.max(0, calGoal - totalCals)
  const pctDone   = Math.min(100, Math.round((totalCals / calGoal) * 100))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 13px', borderRadius: 12, fontSize: 13,
    fontFamily: 'var(--font-body)', background: 'rgba(255,255,255,0.8)',
    border: '1px solid rgba(219,193,187,0.4)', outline: 'none', color: '#1d1b15',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.55)', borderRadius: 22, padding: '28px',
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Progress panel ─────────────────────────────────────────── */}
      <div style={{ ...card, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: -32, left: -32, width: 140, height: 140, background: 'rgba(249,243,233,0.6)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Flame size={16} color={ACCENT} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#88726d', fontWeight: 700 }}>Today's Balance</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Consumed', value: totalCals.toLocaleString(), color: '#1d1b15' },
                { label: 'Daily Goal', value: calGoal.toLocaleString(), color: '#1d1b15' },
                { label: 'Remaining', value: remaining.toLocaleString(), color: ACCENT },
              ].map(m => (
                <div key={m.label}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#88726d', marginBottom: 4 }}>{m.label}</p>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: m.color, margin: 0, lineHeight: 1 }}>{m.value}</h3>
                </div>
              ))}
            </div>

            <div>
              <div style={{ width: '100%', height: 10, background: 'rgba(219,193,187,0.3)', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', background: ACCENT, width: `${pctDone}%`, borderRadius: 999, transition: 'width 0.7s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, color: '#88726d' }}>
                <span>0% baseline</span>
                <span>{pctDone}% consumed</span>
                <span>100% threshold</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-4" style={{ padding: '20px', background: 'rgba(249,243,233,0.6)', borderRadius: 16, border: '1px solid rgba(219,193,187,0.2)', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#55443d', lineHeight: 1.6, marginBottom: 10 }}>
              {pctDone >= 100
                ? 'Caloric threshold saturated. Metabolic engine fully stoked for cellular rest.'
                : 'Sub-metabolic state active. Autodynamic energy flow in process.'}
            </p>
            {editGoal ? (
              <form onSubmit={saveGoal} style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                <input
                  type="number" value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  style={{ ...inputStyle, width: 90, textAlign: 'center' }}
                />
                <button type="submit" style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 999, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Set
                </button>
              </form>
            ) : (
              <button
                onClick={() => { setGoalInput(String(calGoal)); setEditGoal(true) }}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(149,67,47,0.08)', border: 'none', borderRadius: 999, padding: '6px 14px', cursor: 'pointer' }}
              >
                {remaining > 0 ? `${remaining} cals left` : 'Optimal limit reached'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Left: Quick-add + Log ───────────────────────────────── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Quick foods */}
          <div style={{ ...card, padding: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#1d1b15', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Sparkles size={16} color={ACCENT} />
              Somatic Quick-Logs
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#55443d', marginBottom: 16 }}>
              Tap any nutrient-dense item below to instantly log it:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {QUICK_FOODS.map(food => (
                <button
                  key={food.name}
                  onClick={() => quickAdd(food)}
                  style={{
                    padding: '14px', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(219,193,187,0.3)',
                    borderRadius: 16, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 96,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.95)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.7)'; (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                >
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, color: '#1d1b15', margin: 0, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{food.name}</p>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: ACCENT }}>{food.calories} cals</span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', color: '#88726d', letterSpacing: '0.06em' }}>{food.type}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Food log */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#88726d', fontWeight: 700, marginBottom: 14 }}>Today's Logs</h3>

            {entries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', background: 'rgba(255,255,255,0.3)', borderRadius: 16, border: '1px dashed rgba(219,193,187,0.5)' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#88726d', margin: 0 }}>No fuel tracked yet. Use quick-logs or add a custom entry.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {MEALS.filter(m => entries.some(e => e.meal_type === m.type)).map(m => {
                  const mealEntries = entries.filter(e => e.meal_type === m.type)
                  const mealCals    = mealEntries.reduce((s, e) => s + (e.calories || 0), 0)
                  return (
                    <div key={m.type}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        {m.icon}
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: '#1d1b15' }}>{m.label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#88726d' }}>{mealCals.toLocaleString()} cals</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {mealEntries.map(entry => (
                          <div
                            key={entry.id}
                            style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(219,193,187,0.2)', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#1d1b15' }}>{entry.food_name}</span>
                              {(Number(entry.protein) > 0 || Number(entry.carbs) > 0 || Number(entry.fat) > 0) && (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#88726d' }}>
                                  P:{Math.round(Number(entry.protein))}g C:{Math.round(Number(entry.carbs))}g F:{Math.round(Number(entry.fat))}g
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#88726d' }}>{entry.calories} cals</span>
                              <button
                                onClick={() => deleteEntry(entry.id)}
                                style={{ padding: 6, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: '#88726d', transition: 'all 0.15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#88726d' }}
                              >
                                <Trash2 size={13} />
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

        {/* ── Right: Custom form ──────────────────────────────────── */}
        <div className="lg:col-span-4">
          <div style={{ ...card, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#1d1b15', margin: 0 }}>Custom Food Entry</h3>

            <form onSubmit={addEntry} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#55443d', fontWeight: 600 }}>Food Name</label>
                <input
                  type="text" required value={form.food_name}
                  onChange={e => setForm(f => ({ ...f, food_name: e.target.value }))}
                  placeholder="e.g. Scrambled organic eggs"
                  style={inputStyle}
                  onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = ACCENT }}
                  onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(219,193,187,0.4)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#55443d', fontWeight: 600 }}>Calories</label>
                <input
                  type="number" required min="0" value={form.calories}
                  onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
                  placeholder="e.g. 140"
                  style={inputStyle}
                  onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = ACCENT }}
                  onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(219,193,187,0.4)' }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['protein', 'carbs', 'fat'] as const).map(field => (
                  <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#55443d', fontWeight: 600 }}>{field}</label>
                    <input
                      type="number" step="any" min="0" placeholder="0g"
                      value={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      style={{ ...inputStyle, textAlign: 'center' }}
                      onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = ACCENT }}
                      onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(219,193,187,0.4)' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#55443d', fontWeight: 600 }}>Meal Type</label>
                <select
                  value={form.meal_type}
                  onChange={e => setForm(f => ({ ...f, meal_type: e.target.value as MealType }))}
                  style={inputStyle}
                  onFocus={e => { (e.currentTarget as HTMLSelectElement).style.borderColor = ACCENT }}
                  onBlur={e => { (e.currentTarget as HTMLSelectElement).style.borderColor = 'rgba(219,193,187,0.4)' }}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <button
                type="submit" disabled={saving}
                style={{
                  width: '100%', padding: '11px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                  fontFamily: 'var(--font-body)', background: ACCENT, color: '#fff',
                  border: 'none', cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.6 : 1, transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#7a2f1c' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ACCENT }}
              >
                {saving ? 'Adding...' : 'Log Custom Food'}
              </button>
            </form>

            <div style={{ borderTop: '1px solid rgba(219,193,187,0.3)', paddingTop: 16, display: 'flex', gap: 10, background: 'rgba(237,231,221,0.2)', padding: '14px', borderRadius: 12 }}>
              <ShieldAlert size={18} color={ACCENT} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#55443d', lineHeight: 1.6, margin: 0 }}>
                Aim for unrefined whole macronutrients for optimal recovery results.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
