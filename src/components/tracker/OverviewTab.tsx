'use client'

import { useState, useEffect, useMemo } from 'react'
import { getDaysInMonth } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { todayISO, toISODate, pct, monthName } from '@/lib/utils'
import type { Habit, Completion } from '@/types'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import Link from 'next/link'

type Tab = 'overview' | 'habits' | 'calories' | 'gym'

const ACCENT  = '#E94560'
const TEXT    = '#ffffff'
const SUBTLE  = '#9CA3AF'
const MUTED   = '#4B5563'
const BORDER  = '#1E2D4E'
const CARD    = '#0F1829'

interface HeatDay  { date: string; pct: number }
interface CalDay   { day: string; protein: number; carbs: number; fat: number }
interface VolDay   { day: string; volume: number }

interface Props {
  userId: string
  month: number
  year: number
  dailyHabits: Habit[]
  weeklyHabits: Habit[]
  completionSet: Set<string>
  completions: Completion[]
}

export default function OverviewTab({
  userId, month, year,
  dailyHabits, weeklyHabits, completionSet, completions,
}: Props) {
  const [heatmap,         setHeatmap]         = useState<HeatDay[]>([])
  const [calChart,        setCalChart]        = useState<CalDay[]>([])
  const [volChart,        setVolChart]        = useState<VolDay[]>([])
  const [todayCals,       setTodayCals]       = useState(0)
  const [calGoal,         setCalGoal]         = useState(2000)
  const [todayEntryCount, setTodayEntryCount] = useState(0)
  const [todaySession,    setTodaySession]    = useState<string | null>(null)

  const today = todayISO()
  const sb    = createClient()
  const allHabits = useMemo(() => [...dailyHabits, ...weeklyHabits], [dailyHabits, weeklyHabits])

  useEffect(() => { if (userId) load() }, [userId, dailyHabits.length])

  async function load() {
    const d30 = new Date(); d30.setDate(d30.getDate() - 29)
    const from30 = d30.toISOString().split('T')[0]

    const [comp30, calRes, sessRes, settingsRes] = await Promise.all([
      sb.from('completions').select('habit_id, date').eq('user_id', userId).gte('date', from30).lte('date', today),
      sb.from('calorie_entries').select('date, calories, protein, carbs, fat').eq('user_id', userId).gte('date', from30).lte('date', today),
      sb.from('workout_sessions').select('id, date, name').eq('user_id', userId).gte('date', from30).lte('date', today),
      sb.from('user_settings').select('daily_calorie_goal').eq('user_id', userId).maybeSingle(),
    ])

    // Heatmap
    const compSet30 = new Set((comp30.data ?? []).map((c: any) => `${c.habit_id}__${c.date}`))
    setHeatmap(Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i))
      const iso = d.toISOString().split('T')[0]
      const done = dailyHabits.filter(h => compSet30.has(`${h.id}__${iso}`)).length
      return { date: iso, pct: dailyHabits.length > 0 ? done / dailyHabits.length : 0 }
    }))

    // Calorie chart (last 7 days)
    const last7Base = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      return { day: d.toLocaleDateString('en', { weekday: 'short' }), date: d.toISOString().split('T')[0], cals: 0, protein: 0, carbs: 0, fat: 0 }
    })
    ;(calRes.data ?? []).forEach((e: any) => {
      const idx = last7Base.findIndex(d => d.date === e.date)
      if (idx >= 0) {
        last7Base[idx].cals    += e.calories
        last7Base[idx].protein += Number(e.protein)
        last7Base[idx].carbs   += Number(e.carbs)
        last7Base[idx].fat     += Number(e.fat)
      }
    })
    setCalChart(last7Base.map(d => ({ day: d.day, protein: Math.round(d.protein), carbs: Math.round(d.carbs), fat: Math.round(d.fat) })))
    setTodayCals(last7Base[6].cals)
    setCalGoal(settingsRes.data?.daily_calorie_goal ?? 2000)
    setTodayEntryCount((calRes.data ?? []).filter((e: any) => e.date === today).length)

    // Workout volume (last 7 days)
    const sessions = sessRes.data ?? []
    setTodaySession(sessions.find((s: any) => s.date === today)?.name ?? null)

    const vol7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      return { day: d.toLocaleDateString('en', { weekday: 'short' }), date: d.toISOString().split('T')[0], volume: 0 }
    })
    if (sessions.length > 0) {
      const ids = sessions.map((s: any) => s.id)
      const { data: exs } = await sb.from('workout_exercises').select('session_id, sets, reps, weight_kg').in('session_id', ids)
      ;(exs ?? []).forEach((e: any) => {
        const sess = sessions.find((s: any) => s.id === e.session_id) as any
        if (!sess) return
        const idx = vol7.findIndex(d => (d as any).date === sess.date)
        if (idx >= 0) vol7[idx].volume += e.sets * e.reps * Number(e.weight_kg)
      })
    }
    setVolChart(vol7.map(d => ({ day: d.day, volume: Math.round(d.volume) })))
  }

  // Streak from heatmap (≥80% of daily habits = day done)
  const { currentStreak, bestStreak } = useMemo(() => {
    if (!heatmap.length) return { currentStreak: 0, bestStreak: 0 }
    let cur = 0, best = 0, run = 0
    for (let i = heatmap.length - 1; i >= 0; i--) {
      if (heatmap[i].pct >= 0.8) cur++; else break
    }
    for (const d of heatmap) {
      if (d.pct >= 0.8) { run++; best = Math.max(best, run) } else run = 0
    }
    return { currentStreak: cur, bestStreak: best }
  }, [heatmap])

  // Monthly completion rate
  const monthlyRate = useMemo(() => {
    if (!allHabits.length) return 0
    const numDays = getDaysInMonth(new Date(year, month - 1))
    const rates = allHabits.map(h => {
      let done = 0
      if (h.type === 'daily') {
        for (let d = 1; d <= numDays; d++)
          if (completionSet.has(`${h.id}__${toISODate(year, month, d)}`)) done++
      } else {
        for (let wk = 0; wk < 5; wk++) {
          const fd = wk * 7 + 1
          if (fd <= numDays && completionSet.has(`${h.id}__${toISODate(year, month, fd)}`)) done++
        }
      }
      return pct(done, h.goal)
    })
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
  }, [allHabits, completionSet, year, month])

  const dailyDoneToday = dailyHabits.filter(h => completionSet.has(`${h.id}__${today}`)).length
  const todayCompletions = completions.filter(c => c.date === today)

  // Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : hour < 22 ? 'Good evening.' : 'Good night.'
  const dateStr  = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()

  // Heatmap
  const heatFrom = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }).toUpperCase() })()
  const heatTo   = new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' }).toUpperCase()

  function heatColor(p: number): string {
    if (p === 0)   return '#1E2D4E'
    if (p < 0.25)  return '#3b1d2e'
    if (p < 0.5)   return '#6b2540'
    if (p < 0.75)  return '#a02040'
    return '#E94560'
  }

  function tabUrl(t: Tab) { return `/dashboard?month=${month}&year=${year}&tab=${t}` }

  const C = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }
  const lbl = 'text-xs font-mono uppercase tracking-[0.15em]'

  return (
    <div className="space-y-4 pb-4">

      {/* ── Greeting card ────────────────────────────────────────────── */}
      <div style={{ ...C, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 320, height: 220, background: 'radial-gradient(ellipse at 80% 10%, rgba(233,69,96,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <p className={lbl} style={{ color: MUTED }}>{dateStr}</p>
        <h1 className="font-display mt-2" style={{ fontSize: 56, lineHeight: 1.05, color: TEXT }}>{greeting}</h1>
        <p className="text-sm mt-2 max-w-sm" style={{ color: SUBTLE }}>
          Here's how today is shaping up. Small actions compound — keep going.
        </p>
      </div>

      {/* ── 3 main stat cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard dot="#E94560" label="Habits Today"
          value={`${dailyDoneToday}/${dailyHabits.length}`} sub="completed" />
        <StatCard dot="#E94560" label="Calories"
          value={`${todayCals.toLocaleString()}/${calGoal.toLocaleString()}`}
          sub={`${Math.round(Math.min(100, (todayCals / calGoal) * 100))}% of daily goal`} />
        <StatCard dot="#22d3ee" label="Workout"
          value={todaySession ?? '—'} sub={todaySession ? 'logged today' : 'not logged'} />
      </div>

      {/* ── 4 metric cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard dot="#4ade80" label="Current Streak" value={`${currentStreak}d`} sub="consecutive days" />
        <MetricCard dot="#E94560" label="Best Streak"    value={`${bestStreak}d`}    sub={`in ${monthName(month)}`} />
        <MetricCard dot="#f472b6" label="Monthly Rate"   value={`${monthlyRate}%`}   sub={`avg across ${allHabits.length} habits`} />
        <MetricCard dot="#22d3ee" label="Cals Remaining" value={Math.max(0, calGoal - todayCals).toLocaleString()} sub="until daily goal" />
      </div>

      {/* ── Heatmap + Jump in ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_280px] gap-3">
        <div style={C}>
          <p className={lbl} style={{ color: MUTED }}>Consistency</p>
          <div className="flex items-center justify-between mt-1 mb-4">
            <h3 className="font-display text-2xl" style={{ color: TEXT }}>Last 30 days</h3>
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono mr-1" style={{ color: MUTED }}>LESS</span>
              {[0, 0.2, 0.5, 0.75, 1].map((p, i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: heatColor(p) }} />
              ))}
              <span className="text-xs font-mono ml-1" style={{ color: MUTED }}>MORE</span>
            </div>
          </div>
          <div className="flex gap-[3px] flex-wrap">
            {heatmap.map((d, i) => (
              <div key={i} title={`${d.date}: ${Math.round(d.pct * 100)}%`}
                style={{ width: 16, height: 16, borderRadius: 3, background: heatColor(d.pct), flexShrink: 0 }} />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs font-mono" style={{ color: MUTED }}>{heatFrom}</span>
            <span className="text-xs font-mono" style={{ color: MUTED }}>{heatTo}</span>
          </div>
        </div>

        <div style={C}>
          <p className={lbl} style={{ color: MUTED }}>Jump in</p>
          <h3 className="font-display text-2xl mt-1 mb-4" style={{ color: TEXT }}>Track now</h3>
          <div className="space-y-2">
            <JumpItem href={tabUrl('habits')}
              label="Tick off habits" sub={`${dailyDoneToday}/${dailyHabits.length} today`} />
            <JumpItem href={tabUrl('calories')}
              label="Log a meal" sub={`${todayCals.toLocaleString()} kcal so far`} />
            <JumpItem href={tabUrl('gym')}
              label="Start workout" sub={todaySession ?? 'no session yet'} />
          </div>
        </div>
      </div>

      {/* ── 7-day charts ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div style={C}>
          <p className={lbl} style={{ color: MUTED }}>Last 7 days</p>
          <div className="flex items-center justify-between mt-1 mb-3">
            <h3 className="font-display text-xl" style={{ color: TEXT }}>Calories & macros</h3>
            <div className="flex gap-3">
              {[{ l: 'PROTEIN', c: '#22d3ee' }, { l: 'CARBS', c: '#f472b6' }, { l: 'FAT', c: '#fb923c' }].map(m => (
                <span key={m.l} className="flex items-center gap-1">
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.c, display: 'inline-block' }} />
                  <span className="text-xs font-mono" style={{ color: MUTED }}>{m.l}</span>
                </span>
              ))}
            </div>
          </div>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={calChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: SUBTLE }} cursor={{ stroke: BORDER }} />
                <Line type="monotone" dataKey="protein" stroke="#22d3ee" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="carbs"   stroke="#f472b6" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="fat"     stroke="#fb923c" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={C}>
          <p className={lbl} style={{ color: MUTED }}>Last 7 days</p>
          <div className="flex items-center justify-between mt-1 mb-3">
            <h3 className="font-display text-xl" style={{ color: TEXT }}>Workout volume</h3>
            <span className="flex items-center gap-1">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, display: 'inline-block' }} />
              <span className="text-xs font-mono" style={{ color: MUTED }}>KG TOTAL</span>
            </span>
          </div>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volChart} barSize={24} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: SUBTLE }} cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  formatter={(v) => [`${Number(v).toLocaleString()} kg`, 'Volume']} />
                <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                  {volChart.map((_, i) => (
                    <Cell key={i} fill={i === volChart.length - 1 ? ACCENT : '#1E2D4E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Habits at a glance + Activity feed ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div style={C}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className={lbl} style={{ color: MUTED }}>Today</p>
              <h3 className="font-display text-xl mt-0.5" style={{ color: TEXT }}>Habits at a glance</h3>
            </div>
            <Link href={tabUrl('habits')}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-all hover:-translate-y-0.5"
              style={{ border: `1px solid ${BORDER}`, color: SUBTLE }}>
              Open tracker →
            </Link>
          </div>
          {dailyHabits.length === 0 ? (
            <p className="text-sm" style={{ color: MUTED }}>
              No habits yet.{' '}
              <Link href={tabUrl('habits')} style={{ color: ACCENT }}>Add some →</Link>
            </p>
          ) : (
            <div className="space-y-2.5">
              {dailyHabits.slice(0, 6).map(h => {
                const done = completionSet.has(`${h.id}__${today}`)
                return (
                  <div key={h.id} className="flex items-center gap-3">
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: `1.5px solid ${done ? ACCENT : BORDER}`,
                      background: done ? ACCENT + '18' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm" style={{ color: done ? MUTED : TEXT, textDecoration: done ? 'line-through' : 'none' }}>
                      {h.name}
                    </span>
                  </div>
                )
              })}
              {dailyHabits.length > 6 && (
                <p className="text-xs" style={{ color: MUTED }}>+{dailyHabits.length - 6} more</p>
              )}
            </div>
          )}
        </div>

        <div style={C}>
          <p className={lbl} style={{ color: MUTED }}>Recent</p>
          <h3 className="font-display text-xl mt-0.5 mb-4" style={{ color: TEXT }}>Activity feed</h3>
          {todayCompletions.length === 0 ? (
            <p className="text-sm" style={{ color: MUTED }}>Nothing logged yet today. Start small.</p>
          ) : (
            <div className="space-y-2">
              {todayCompletions.slice(0, 7).map(c => {
                const habit = allHabits.find(h => h.id === c.habit_id)
                if (!habit) return null
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <span style={{ color: ACCENT, fontSize: 8 }}>●</span>
                    <span className="text-sm" style={{ color: SUBTLE }}>
                      Completed{' '}
                      <span style={{ color: TEXT, fontWeight: 500 }}>{habit.name}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick links ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <QuickLink href={tabUrl('habits')}   label="Habits"   sub={`${allHabits.length} active`} />
        <QuickLink href={tabUrl('calories')} label="Calories" sub={`${todayEntryCount} entries today`} />
        <QuickLink href={tabUrl('gym')}      label="Gym"      sub={todaySession ?? 'no session'} />
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────

function StatCard({ dot, label, value, sub }: { dot: string; label: string; value: string; sub: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '18px 20px' }}>
      <div className="flex items-center gap-1.5 mb-3">
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span className="text-xs font-mono uppercase tracking-[0.12em]" style={{ color: MUTED }}>{label}</span>
      </div>
      <div className="font-display" style={{ fontSize: 38, lineHeight: 1.05, color: TEXT }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: MUTED }}>{sub}</div>
    </div>
  )
}

function MetricCard({ dot, label, value, sub }: { dot: string; label: string; value: string; sub: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 20px' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span className="text-xs font-mono uppercase tracking-[0.12em]" style={{ color: MUTED }}>{label}</span>
      </div>
      <div className="font-display text-3xl" style={{ color: TEXT, lineHeight: 1.1 }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: MUTED }}>{sub}</div>
    </div>
  )
}

function JumpItem({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link href={href}
      className="flex items-center justify-between p-3 rounded-xl transition-all duration-150 group"
      style={{ border: `1px solid ${BORDER}` }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#141E33' }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '' }}>
      <div>
        <div className="text-sm font-medium" style={{ color: TEXT }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: MUTED }}>{sub}</div>
      </div>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1E2D4E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SUBTLE, fontSize: 14 }}>
        →
      </div>
    </Link>
  )
}

function QuickLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link href={href}
      className="flex items-center justify-between p-4 rounded-xl transition-all duration-150 hover:-translate-y-0.5"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div>
        <div className="text-sm font-semibold" style={{ color: TEXT }}>{label}</div>
        <div className="text-xs mt-0.5 font-mono" style={{ color: MUTED }}>{sub}</div>
      </div>
      <span style={{ color: MUTED }}>→</span>
    </Link>
  )
}
