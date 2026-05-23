'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { todayISO } from '@/lib/utils'
import type { WorkoutSession, WorkoutExercise } from '@/types'
import { Play, RotateCcw, Plus, Award, Trash2, VolumeX, Volume2 } from 'lucide-react'

const ACCENT = '#6366F1'

const PRESET_ROUTINES = [
  {
    name: 'Serene Sculpt (Upper Body)',
    difficulty: 'Balanced',
    duration: '45 mins',
    exercises: ['Somatic DB Incline Press', 'Scapular Dumbbell Row', 'Lateral Raise Flyes', 'Mindful Pushups'],
  },
  {
    name: 'Kinetic Core (Abs & Conditioning)',
    difficulty: 'Moderate',
    duration: '30 mins',
    exercises: ['Breathing Planks', 'Decline Core Crunches', 'Subtle Russian Twists', 'Somatic Leg Raises'],
  },
  {
    name: 'Earth Foundations (Lower Body)',
    difficulty: 'Deep',
    duration: '50 mins',
    exercises: ['Goblet Squats (Controlled)', 'Split Romanian Deadlifts', 'Earth Grounded Calf Raises'],
  },
]

interface Props { userId: string }

export default function GymTab({ userId }: Props) {
  const [session,     setSession]     = useState<WorkoutSession | null>(null)
  const [exercises,   setExercises]   = useState<WorkoutExercise[]>([])
  const [sessionName, setSessionName] = useState('')
  const [starting,    setStarting]    = useState(false)
  const [showExForm,  setShowExForm]  = useState(false)
  const [savingEx,    setSavingEx]    = useState(false)
  const [exForm, setExForm] = useState({ name: '', sets: '3', reps: '10', weight_kg: '0' })

  // Rest timer
  const [timerSecs, setTimerSecs] = useState(60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerMuted, setTimerMuted] = useState(false)

  const today = todayISO()
  const sb    = createClient()

  useEffect(() => { load() }, [userId])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (timerRunning && timerSecs > 0) {
      interval = setInterval(() => setTimerSecs(s => s - 1), 1000)
    } else if (timerSecs === 0) {
      setTimerRunning(false)
      if (!timerMuted) alert('Rest finished. Proceed with meditative awareness.')
      setTimerSecs(60)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [timerRunning, timerSecs, timerMuted])

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
  }

  async function startSession(name?: string) {
    setStarting(true)
    const finalName = name || sessionName.trim() || 'Workout'
    const { data } = await sb.from('workout_sessions')
      .insert({ user_id: userId, date: today, name: finalName, notes: '' })
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
      session_id: session.id, user_id: userId,
      name: exForm.name,
      sets: parseInt(exForm.sets) || 1,
      reps: parseInt(exForm.reps) || 0,
      weight_kg: parseFloat(exForm.weight_kg) || 0,
    }).select().single()
    if (data) {
      setExercises(prev => [...prev, data as WorkoutExercise])
      setTimerSecs(60)
      setTimerRunning(true)
    }
    setExForm({ name: '', sets: '3', reps: '10', weight_kg: '0' })
    setShowExForm(false)
    setSavingEx(false)
    load()
  }

  async function deleteExercise(id: string) {
    await sb.from('workout_exercises').delete().eq('id', id).eq('user_id', userId)
    setExercises(prev => prev.filter(e => e.id !== id))
    load()
  }

  const totalVolume = exercises.reduce((s, e) => s + e.sets * e.reps * Number(e.weight_kg), 0)
  const totalSets   = exercises.reduce((s, e) => s + e.sets, 0)

  const card: React.CSSProperties = {
    background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(99,102,241,0.12)', borderRadius: 22, padding: '24px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 13px', borderRadius: 12, fontSize: 13,
    fontFamily: 'var(--font-body)', background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(148,163,184,0.2)', outline: 'none', color: '#F1F5F9',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {!session ? (
        /* ── No session: pick routine or start custom ─────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#64748B', fontWeight: 700 }}>Select a Companion Routine</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PRESET_ROUTINES.map(routine => (
                <div
                  key={routine.name}
                  style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 220, cursor: 'default', padding: '22px' }}
                >
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8', background: 'rgba(30,41,59,0.7)', padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(99,102,241,0.15)', display: 'inline-block', marginBottom: 12 }}>
                      {routine.difficulty}
                    </span>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: '#F1F5F9', lineHeight: 1.2, margin: '0 0 8px' }}>{routine.name}</h4>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#64748B', margin: 0 }}>{routine.exercises.length} key exercises · {routine.duration}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                    <button
                      onClick={() => startSession(routine.name)}
                      disabled={starting}
                      style={{
                        width: 38, height: 38, borderRadius: '50%', background: ACCENT, border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: starting ? 'default' : 'pointer', transition: 'all 0.2s',
                        opacity: starting ? 0.6 : 1,
                      }}
                      onMouseEnter={e => { if (!starting) { (e.currentTarget as HTMLButtonElement).style.background = '#4F46E5'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' } }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ACCENT; (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                    >
                      <Play size={14} color="white" fill="white" style={{ marginLeft: 2 }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom session start */}
            <div style={{ ...card, padding: '20px' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#475569', marginBottom: 12 }}>Or start a custom session:</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text" placeholder="Session name (e.g. Pull day)"
                  value={sessionName}
                  onChange={e => setSessionName(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); startSession() } }}
                  onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = ACCENT }}
                  onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(100,116,139,0.4)' }}
                />
                <button
                  onClick={() => startSession()} disabled={starting}
                  style={{
                    padding: '9px 20px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                    fontFamily: 'var(--font-body)', background: ACCENT, color: '#fff',
                    border: 'none', cursor: starting ? 'default' : 'pointer', flexShrink: 0,
                    opacity: starting ? 0.6 : 1, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!starting) (e.currentTarget as HTMLButtonElement).style.background = '#4F46E5' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ACCENT }}
                >
                  {starting ? 'Starting...' : 'Start'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4" style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={24} color={ACCENT} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#F1F5F9', fontSize: 18, margin: 0 }}>Continuous Sculpt</h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#94A3B8', lineHeight: 1.65, margin: 0 }}>
              Every somatic rep checked primes down tension, increases muscular alignment, and reinforces clean, intentional energy flow.
            </p>
          </div>
        </div>
      ) : (
        /* ── Active session ───────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-scale-up">
          <div className="lg:col-span-8 space-y-5">
            {/* Session header */}
            <div style={{ ...card, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: ACCENT, fontWeight: 700 }}>Active Session</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: '#F1F5F9', margin: '4px 0 0', letterSpacing: '-0.02em' }}>{session.name}</h3>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { if (confirm('End this session?')) { setSession(null); setExercises([]) } }}
                  style={{ padding: '8px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', background: 'none', border: '1px solid rgba(148,163,184,0.25)', color: '#94A3B8', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(148,163,184,0.25)'; (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8' }}
                >
                  End
                </button>
                <button
                  onClick={() => setShowExForm(v => !v)}
                  style={{ padding: '8px 20px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-body)', background: showExForm ? 'rgba(99,102,241,0.1)' : ACCENT, color: showExForm ? '#94A3B8' : '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  {showExForm ? 'Cancel' : '+ Add exercise'}
                </button>
              </div>
            </div>

            {/* Add exercise form */}
            {showExForm && (
              <form
                onSubmit={addExercise}
                className="animate-slide-up"
                style={{ ...card, padding: '20px' }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', display: 'block', marginBottom: 5, fontWeight: 600 }}>Exercise</label>
                    <input
                      type="text" required placeholder="e.g. Somatic cable flyes"
                      value={exForm.name}
                      onChange={e => setExForm(f => ({ ...f, name: e.target.value }))}
                      style={inputStyle}
                      onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = ACCENT }}
                      onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(100,116,139,0.4)' }}
                    />
                  </div>
                  {([['sets', 'Sets'], ['reps', 'Reps'], ['weight_kg', 'Weight kg']] as const).map(([field, label]) => (
                    <div key={field}>
                      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', display: 'block', marginBottom: 5, fontWeight: 600 }}>{label}</label>
                      <input
                        type="number" min="0" value={exForm[field]}
                        onChange={e => setExForm(f => ({ ...f, [field]: e.target.value }))}
                        style={{ ...inputStyle, textAlign: 'center' }}
                        onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = ACCENT }}
                        onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(100,116,139,0.4)' }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="submit" disabled={savingEx}
                  style={{
                    width: '100%', marginTop: 12, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                    fontFamily: 'var(--font-body)', background: ACCENT, color: '#fff', border: 'none',
                    cursor: savingEx ? 'default' : 'pointer', opacity: savingEx ? 0.6 : 1, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!savingEx) (e.currentTarget as HTMLButtonElement).style.background = '#4F46E5' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ACCENT }}
                >
                  {savingEx ? 'Logging...' : 'Log exercise'}
                </button>
              </form>
            )}

            {/* Exercise list */}
            {exercises.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: 'rgba(30,41,59,0.3)', borderRadius: 16, border: '1px dashed rgba(99,102,241,0.2)' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#64748B', margin: '0 0 12px' }}>No exercises yet</p>
                <button onClick={() => setShowExForm(true)} style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Add your first exercise →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {exercises.map((ex, i) => {
                  const vol = ex.sets * ex.reps * Number(ex.weight_kg)
                  return (
                    <div
                      key={ex.id}
                      className="animate-slide-up group"
                      style={{ padding: '14px 18px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animationDelay: `${i * 40}ms` }}
                    >
                      <div>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>{ex.name}</span>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          {ex.sets} × {ex.reps} @ {Number(ex.weight_kg)}kg
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#64748B' }}>
                          {Math.round(vol).toLocaleString()} kg
                        </span>
                        <button
                          onClick={() => deleteExercise(ex.id)}
                          style={{ padding: 6, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', transition: 'all 0.15s', opacity: 0 }}
                          className="group-hover:opacity-100"
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#64748B' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, paddingTop: 4, paddingRight: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748B' }}>{exercises.length} exercise{exercises.length !== 1 ? 's' : ''}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#475569', fontWeight: 700 }}>{totalSets} total sets</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: ACCENT, fontWeight: 700 }}>{Math.round(totalVolume).toLocaleString()} kg volume</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Rest timer ──────────────────────────────────────────── */}
          <div className="lg:col-span-4">
            <div
              style={{ ...card, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, position: 'relative', overflow: 'hidden', padding: '32px 24px' }}
            >
              {timerRunning && (
                <div style={{ position: 'absolute', width: 140, height: 140, border: '1px solid rgba(99,102,241,0.15)', borderRadius: '50%', animation: 'ping 1.5s ease-in-out infinite', pointerEvents: 'none', opacity: 0.3 }} />
              )}

              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#64748B', fontWeight: 700, display: 'block', marginBottom: 4 }}>Somatic Rest Interval</span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#475569', margin: 0 }}>Recommended recovery between sets</p>
              </div>

              <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.03em', lineHeight: 1 }}>
                00:{String(timerSecs).padStart(2, '0')}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setTimerRunning(v => !v)}
                  style={{ padding: '10px 22px', borderRadius: 999, fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-body)', background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#4F46E5' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ACCENT }}
                >
                  {timerRunning ? 'Pause' : 'Start rest'}
                </button>
                <button
                  onClick={() => { setTimerRunning(false); setTimerSecs(60) }}
                  style={{ padding: 10, borderRadius: '50%', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.2)', cursor: 'pointer', color: '#94A3B8', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,41,59,0.7)' }}
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              <button
                onClick={() => setTimerMuted(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748B', transition: 'color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#0F172A' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#64748B' }}
              >
                {timerMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                {timerMuted ? 'Muted' : 'Alert active'}
              </button>

              <div style={{ width: '100%', borderTop: '1px solid rgba(100,116,139,0.3)', paddingTop: 16, textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: ACCENT, fontWeight: 700, display: 'block', marginBottom: 6 }}>Pacing Cadence</span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#475569', fontStyle: 'italic', margin: 0 }}>
                  "Exhale slowly during contraction, inhale deeply upon releasing the weight."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
