'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { todayISO } from '@/lib/utils'
import type { WorkoutSession, WorkoutExercise } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

const ACCENT = '#c4573d'
const CYAN   = '#2563eb'
const PINK   = '#b45309'

interface ChartDay { day: string; date: string; volume: number }

interface Props { userId: string }

export default function GymTab({ userId }: Props) {
  const [session,       setSession]       = useState<WorkoutSession | null>(null)
  const [exercises,     setExercises]     = useState<WorkoutExercise[]>([])
  const [weekData,      setWeekData]      = useState<{ day: string; volume: number }[]>([])
  const [sessionName,   setSessionName]   = useState('')
  const [starting,      setStarting]      = useState(false)
  const [showExForm,    setShowExForm]    = useState(false)
  const [savingEx,      setSavingEx]      = useState(false)
  const [exForm, setExForm] = useState({ name: '', sets: '3', reps: '10', weight_kg: '0' })

  const today = todayISO()
  const sb    = createClient()

  useEffect(() => { load() }, [userId])

  async function load() {
    const { data: sessions } = await sb.from('workout_sessions').select('*')
      .eq('user_id', userId).eq('date', today).order('created_at').limit(1)
    const todaySess = sessions?.[0] as WorkoutSession | undefined ?? null
    setSession(todaySess)

    if (todaySess) {
      const { data: exs } = await sb.from('workout_exercises').select('*')
        .eq('session_id', todaySess.id).order('created_at')
      setExercises((exs ?? []) as WorkoutExercise[])
    }

    // Build 7-day volume chart
    const days: ChartDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return {
        day:    d.toLocaleDateString('en', { weekday: 'short' }),
        date:   d.toISOString().split('T')[0],
        volume: 0,
      }
    })

    const { data: sessions7 } = await sb.from('workout_sessions')
      .select('id, date')
      .eq('user_id', userId)
      .gte('date', days[0].date)
      .lte('date', today)

    if (sessions7 && sessions7.length > 0) {
      const ids = sessions7.map((s: { id: string }) => s.id)
      const { data: exs7 } = await sb.from('workout_exercises')
        .select('session_id, sets, reps, weight_kg')
        .in('session_id', ids)

      if (exs7) {
        exs7.forEach((e: { session_id: string; sets: number; reps: number; weight_kg: number }) => {
          const sess = sessions7.find((s: { id: string }) => s.id === e.session_id) as { id: string; date: string } | undefined
          if (!sess) return
          const idx = days.findIndex(d => d.date === sess.date)
          if (idx >= 0) days[idx].volume += e.sets * e.reps * Number(e.weight_kg)
        })
      }
    }
    setWeekData(days.map(d => ({ day: d.day, volume: Math.round(d.volume) })))
  }

  async function startSession() {
    setStarting(true)
    const name = sessionName.trim() || 'Workout'
    const { data } = await sb.from('workout_sessions')
      .insert({ user_id: userId, date: today, name, notes: '' })
      .select().single()
    if (data) { setSession(data as WorkoutSession); setExercises([]) }
    setSessionName('')
    setStarting(false)
  }

  async function addExercise(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    setSavingEx(true)
    const { data } = await sb.from('workout_exercises').insert({
      session_id: session.id,
      user_id:    userId,
      name:       exForm.name,
      sets:       parseInt(exForm.sets)        || 1,
      reps:       parseInt(exForm.reps)        || 0,
      weight_kg:  parseFloat(exForm.weight_kg) || 0,
    }).select().single()
    if (data) setExercises(prev => [...prev, data as WorkoutExercise])
    setExForm({ name: '', sets: '3', reps: '10', weight_kg: '0' })
    setShowExForm(false)
    setSavingEx(false)
    load() // refresh chart
  }

  async function deleteExercise(id: string) {
    await sb.from('workout_exercises').delete().eq('id', id).eq('user_id', userId)
    setExercises(prev => prev.filter(e => e.id !== id))
    load()
  }

  const totalVolume  = exercises.reduce((s, e) => s + e.sets * e.reps * Number(e.weight_kg), 0)
  const totalSets    = exercises.reduce((s, e) => s + e.sets, 0)

  const inputCls = 'bg-white border border-[#e5ddd4] rounded-xl px-4 py-2.5 text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#c4573d]/60 text-sm'

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Weekly volume chart ────────────────────────────────────── */}
      <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid #e5ddd4' }}>
        <div className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: '#a8a29e' }}>
          Weekly Volume (sets × reps × kg)
        </div>
        <div style={{ height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} barSize={28} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#a8a29e', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e5ddd4', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#78716c' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                formatter={(v) => [`${Number(v).toLocaleString()} kg`, 'Volume']}
              />
              <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                {weekData.map((d, i) => (
                  <Cell key={i} fill={i === weekData.length - 1 ? CYAN : '#e5ddd4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Today's session ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-xl" style={{ color: '#1c1917' }}>
            {session ? session.name : "Today's Workout"}
          </span>
          {session && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono" style={{ color: '#a8a29e' }}>
                {totalSets} sets · {Math.round(totalVolume).toLocaleString()} kg volume
              </span>
              <button
                onClick={() => setShowExForm(v => !v)}
                className="text-sm px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                style={{ background: showExForm ? '#e5ddd4' : ACCENT, color: showExForm ? '#78716c' : '#fff' }}>
                {showExForm ? 'Cancel' : '+ Add exercise'}
              </button>
            </div>
          )}
        </div>

        {/* No session yet */}
        {!session ? (
          <div className="rounded-xl p-6 border border-dashed border-border text-center">
            <p className="text-muted text-sm mb-4">No workout logged today</p>
            <div className="flex items-center justify-center gap-3 max-w-xs mx-auto">
              <input
                type="text"
                placeholder="Session name (e.g. Pull day)"
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                className={`flex-1 ${inputCls}`}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); startSession() } }}
              />
              <button
                onClick={startSession} disabled={starting}
                className="text-sm px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #9b2335)`, color: '#fff', boxShadow: '0 0 20px rgba(233,69,96,0.3)' }}>
                {starting ? 'Starting...' : 'Start'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Add exercise form */}
            {showExForm && (
              <form onSubmit={addExercise}
                className="rounded-xl p-4 mb-4 space-y-3 animate-slide-up"
                style={{ background: '#ffffff', border: '1px solid #e5ddd4' }}>

                <input type="text" placeholder="Exercise name (e.g. Bench Press)" required
                  value={exForm.name}
                  onChange={e => setExForm(f => ({ ...f, name: e.target.value }))}
                  className={`w-full ${inputCls}`}
                />

                <div className="grid grid-cols-3 gap-2">
                  {([
                    { field: 'sets',      label: 'Sets'   },
                    { field: 'reps',      label: 'Reps'   },
                    { field: 'weight_kg', label: 'Weight (kg)' },
                  ] as const).map(({ field, label }) => (
                    <div key={field}>
                      <label className="block text-xs text-muted mb-1">{label}</label>
                      <input type="number" step="any" min="0"
                        value={exForm[field]}
                        onChange={e => setExForm(f => ({ ...f, [field]: e.target.value }))}
                        className={`${inputCls} w-full text-center`}
                      />
                    </div>
                  ))}
                </div>

                <button type="submit" disabled={savingEx}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${CYAN}88, ${CYAN}55)`, border: `1px solid ${CYAN}44`, color: CYAN }}>
                  {savingEx ? 'Logging...' : 'Log exercise'}
                </button>
              </form>
            )}

            {/* Exercise list */}
            {exercises.length === 0 ? (
              <div className="flex flex-col items-center py-10 border border-dashed border-border rounded-xl">
                <p className="text-muted text-sm mb-3">No exercises yet</p>
                <button onClick={() => setShowExForm(true)} className="text-sm" style={{ color: ACCENT }}>
                  Add your first exercise →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {exercises.map((ex, i) => {
                  const vol = ex.sets * ex.reps * Number(ex.weight_kg)
                  return (
                    <div key={ex.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl group animate-slide-up"
                      style={{ background: '#ffffff', border: '1px solid #e5ddd4', animationDelay: `${i * 40}ms` }}>
                      <div>
                        <span className="text-sm font-medium" style={{ color: '#1c1917' }}>{ex.name}</span>
                        <div className="text-xs mt-0.5 font-mono" style={{ color: '#a8a29e' }}>
                          {ex.sets} × {ex.reps} @ {Number(ex.weight_kg)}kg
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono" style={{ color: CYAN }}>
                          {Math.round(vol).toLocaleString()} kg
                        </span>
                        <button
                          onClick={() => deleteExercise(ex.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all text-base leading-none">
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Session totals */}
                <div className="flex justify-end gap-6 pt-2 px-1">
                  <span className="text-xs font-mono" style={{ color: '#a8a29e' }}>
                    {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-mono" style={{ color: PINK }}>
                    {totalSets} total sets
                  </span>
                  <span className="text-xs font-mono" style={{ color: CYAN }}>
                    {Math.round(totalVolume).toLocaleString()} kg volume
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
