'use client'

import { useState, useEffect, useMemo } from 'react'
import { getDaysInMonth } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { todayISO, toISODate, pct } from '@/lib/utils'
import type { Habit, Completion } from '@/types'
import Link from 'next/link'
import Modal from './Modal'
import {
  ArrowRight, BookOpen, Edit3, Flame, Sparkles, Calendar,
  Trophy, TrendingUp, Zap, Activity,
} from 'lucide-react'

type Tab = 'overview' | 'habits' | 'calories' | 'gym'

interface JournalEntry {
  id: string
  date: string
  mood: 'peaceful' | 'focused' | 'restless' | 'inspired' | 'tired'
  text: string
  reflection: string
}

interface Props {
  userId: string
  month: number
  year: number
  dailyHabits: Habit[]
  weeklyHabits: Habit[]
  completionSet: Set<string>
  completions: Completion[]
  setTab: (t: Tab) => void
}

export default function OverviewTab({
  userId, month, year,
  dailyHabits, weeklyHabits, completionSet, completions,
  setTab,
}: Props) {
  const [todayCals,    setTodayCals]    = useState(0)
  const [calGoal,      setCalGoal]      = useState(2000)
  const [todaySession, setTodaySession] = useState<string | null>(null)
  const [heatmap,      setHeatmap]      = useState<{ date: string; pct: number }[]>([])
  const [scienceOpen,  setScienceOpen]  = useState(false)
  const [journalOpen,  setJournalOpen]  = useState(false)
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [newMood,      setNewMood]      = useState<JournalEntry['mood']>('peaceful')
  const [newText,      setNewText]      = useState('')
  const [newReflection, setNewReflection] = useState('')

  const today = todayISO()
  const sb    = createClient()
  const allHabits = useMemo(() => [...dailyHabits, ...weeklyHabits], [dailyHabits, weeklyHabits])

  // Load journal from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('asiryx_journal_entries')
      if (saved) setJournalEntries(JSON.parse(saved))
    } catch {}
  }, [])

  // Load Supabase data
  useEffect(() => { if (userId) load() }, [userId, dailyHabits.length])

  async function load() {
    const d30 = new Date(); d30.setDate(d30.getDate() - 29)
    const from30 = d30.toISOString().split('T')[0]

    const [comp30, calRes, sessRes, settingsRes] = await Promise.all([
      sb.from('completions').select('habit_id, date').eq('user_id', userId).gte('date', from30).lte('date', today),
      sb.from('calorie_entries').select('date, calories').eq('user_id', userId).eq('date', today),
      sb.from('workout_sessions').select('id, date, name').eq('user_id', userId).eq('date', today),
      sb.from('user_settings').select('daily_calorie_goal').eq('user_id', userId).maybeSingle(),
    ])

    const compSet30 = new Set((comp30.data ?? []).map((c: any) => `${c.habit_id}__${c.date}`))
    setHeatmap(Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i))
      const iso = d.toISOString().split('T')[0]
      const done = dailyHabits.filter(h => compSet30.has(`${h.id}__${iso}`)).length
      return { date: iso, pct: dailyHabits.length > 0 ? done / dailyHabits.length : 0 }
    }))

    setTodayCals((calRes.data ?? []).reduce((s: number, e: any) => s + (e.calories || 0), 0))
    setCalGoal(settingsRes.data?.daily_calorie_goal ?? 2000)
    setTodaySession((sessRes.data ?? [])[0]?.name ?? null)
  }

  // Streak from heatmap
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
  const caloriesRemaining = Math.max(0, calGoal - todayCals)
  const calPct = Math.min(100, Math.round((todayCals / calGoal) * 100))

  // Greeting & date
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning.' : hour < 17 ? 'Good afternoon.' : hour < 22 ? 'Good evening.' : 'Good night.'
  const days   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const now    = new Date()
  const dateStr = `${days[now.getDay()]} · ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`

  function tabUrl(t: Tab) { return `/dashboard?month=${month}&year=${year}&tab=${t}` }

  function heatColor(p: number): string {
    if (p === 0)   return 'rgba(219,193,187,0.22)'
    if (p < 0.25)  return '#ffdad2'
    if (p < 0.5)   return '#f4b8a8'
    if (p < 0.75)  return '#cc7055'
    return '#95432f'
  }

  function addJournalEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!newText.trim()) return
    const entry: JournalEntry = {
      id: `j-${Date.now()}`, date: today, mood: newMood, text: newText, reflection: newReflection,
    }
    const updated = [entry, ...journalEntries]
    setJournalEntries(updated)
    localStorage.setItem('asiryx_journal_entries', JSON.stringify(updated))
    setNewText(''); setNewReflection(''); setJournalOpen(false)
  }

  // ── Bento card styles ────────────────────────────────────────────────
  const bentoCard: React.CSSProperties = {
    padding: '26px', borderRadius: 22, cursor: 'pointer',
    background: 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    boxShadow: '0 4px 24px rgba(149, 67, 47, 0.05), 0 1px 4px rgba(0,0,0,0.04)',
    position: 'relative', overflow: 'hidden', display: 'block',
    transition: 'transform 0.25s, box-shadow 0.25s',
  }

  function liftCard(e: React.MouseEvent) {
    const el = e.currentTarget as HTMLElement
    el.style.transform = 'translateY(-5px)'
    el.style.boxShadow = '0 18px 48px rgba(149, 67, 47, 0.12), 0 4px 12px rgba(0,0,0,0.06)'
  }
  function dropCard(e: React.MouseEvent) {
    const el = e.currentTarget as HTMLElement
    el.style.transform = ''
    el.style.boxShadow = '0 4px 24px rgba(149, 67, 47, 0.05), 0 1px 4px rgba(0,0,0,0.04)'
  }

  return (
    <div className="space-y-10 animate-fade-in">

      {/* ── Hero + Bento ─────────────────────────────────────────────── */}
      <section
        style={{
          borderRadius: 28,
          background: 'linear-gradient(145deg, rgba(255,252,245,0.95) 0%, rgba(255,245,232,0.8) 100%)',
          border: '1px solid rgba(219, 193, 187, 0.22)',
          padding: '44px 44px 52px',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(149,67,47,0.06)',
        }}
      >
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(149,67,47,0.09) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: '25%', width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(204,112,85,0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Date badge */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(149,67,47,0.07)', borderRadius: 999,
            padding: '6px 14px', border: '1px solid rgba(149,67,47,0.14)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#95432f',
              display: 'inline-block', animation: 'pulse 2s infinite', flexShrink: 0,
            }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#95432f', letterSpacing: '0.1em', fontWeight: 700 }}>
              {dateStr}
            </span>
          </span>
        </div>

        {/* Greeting */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 560 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5vw, 62px)',
            fontWeight: 800, color: '#1d1b15', lineHeight: 1.05,
            letterSpacing: '-0.03em', marginBottom: 14,
          }}>
            {greeting}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: '#55443d', lineHeight: 1.65, margin: 0 }}>
            Here&rsquo;s how today is shaping up. Small actions compound — keep going.
          </p>
        </div>

        {/* ── Bento cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12" style={{ position: 'relative', zIndex: 1 }}>

          {/* Habits card */}
          <Link href={tabUrl('habits')} style={{ textDecoration: 'none' }}>
            <div style={bentoCard} onMouseEnter={liftCard} onMouseLeave={dropCard}>
              {/* Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(149,67,47,0.08)', padding: '5px 11px', borderRadius: 999,
                  fontFamily: 'var(--font-mono)', fontSize: 9.5, color: '#95432f', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  <CheckSquareIcon size={10} /> Habits Today
                </span>
                <ArrowRight size={14} color="#88726d" />
              </div>

              {/* Stat + Ring */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 50, fontWeight: 800, color: '#1d1b15', lineHeight: 1 }}>
                      {dailyDoneToday}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'rgba(29,27,21,0.22)', lineHeight: 1 }}>
                      / {dailyHabits.length}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#55443d', margin: 0 }}>
                    {Math.round(dailyHabits.length > 0 ? (dailyDoneToday / dailyHabits.length) * 100 : 0)}% completed today
                  </p>
                </div>
                <MiniRing value={dailyDoneToday} max={dailyHabits.length} color="#95432f" />
              </div>

              {/* Subtle corner glow */}
              <div style={{
                position: 'absolute', bottom: -24, right: -24, width: 80, height: 80, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(149,67,47,0.07) 0%, transparent 70%)', pointerEvents: 'none',
              }} />
            </div>
          </Link>

          {/* Calories card */}
          <Link href={tabUrl('calories')} style={{ textDecoration: 'none' }}>
            <div style={bentoCard} onMouseEnter={liftCard} onMouseLeave={dropCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(136,114,109,0.08)', padding: '5px 11px', borderRadius: 999,
                  fontFamily: 'var(--font-mono)', fontSize: 9.5, color: '#55443d', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  <Flame size={10} /> Calories
                </span>
                <ArrowRight size={14} color="#88726d" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 50, fontWeight: 800, color: '#1d1b15', lineHeight: 1 }}>
                      {todayCals.toLocaleString()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'rgba(29,27,21,0.22)', lineHeight: 1 }}>
                      / {calGoal.toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#55443d', margin: 0 }}>
                    {calPct}% of daily goal
                  </p>
                </div>
                <MiniRing value={todayCals} max={calGoal} color="#88726d" />
              </div>

              <div style={{
                position: 'absolute', bottom: -24, right: -24, width: 80, height: 80, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(136,114,109,0.06) 0%, transparent 70%)', pointerEvents: 'none',
              }} />
            </div>
          </Link>

          {/* Workout card */}
          <Link href={tabUrl('gym')} style={{ textDecoration: 'none' }}>
            <div style={bentoCard} onMouseEnter={liftCard} onMouseLeave={dropCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: todaySession ? 'rgba(149,67,47,0.08)' : 'rgba(219,193,187,0.25)',
                  padding: '5px 11px', borderRadius: 999,
                  fontFamily: 'var(--font-mono)', fontSize: 9.5,
                  color: todaySession ? '#95432f' : '#88726d',
                  fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  <Activity size={10} /> Workout
                </span>
                <ArrowRight size={14} color="#88726d" />
              </div>

              {todaySession ? (
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: '#1d1b15', marginBottom: 6, lineHeight: 1.2 }}>
                    {todaySession}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#95432f' }} />
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#95432f', margin: 0 }}>
                      Completed today
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{ height: 32, flex: 1, borderRadius: 6, background: 'rgba(219,193,187,0.25)', opacity: 0.4 + i * 0.1 }} />
                    ))}
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#55443d', display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                    Not logged yet <ArrowRight size={12} />
                  </p>
                </div>
              )}
            </div>
          </Link>
        </div>
      </section>

      {/* ── Metric cards ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            icon: Flame,
            iconColor: '#95432f', iconBg: 'rgba(149,67,47,0.08)',
            label: 'Current Streak', value: `${currentStreak}d`, sub: 'consecutive days',
          },
          {
            icon: Trophy,
            iconColor: '#cc7055', iconBg: 'rgba(204,112,85,0.08)',
            label: 'Best Streak', value: `${bestStreak}d`, sub: 'personal record',
          },
          {
            icon: TrendingUp,
            iconColor: '#88726d', iconBg: 'rgba(136,114,109,0.08)',
            label: 'Completion Rate', value: `${monthlyRate}%`, sub: `${allHabits.length} habits tracked`,
          },
          {
            icon: Zap,
            iconColor: '#55443d', iconBg: 'rgba(85,68,61,0.07)',
            label: 'Cals Remaining', value: caloriesRemaining.toLocaleString(), sub: 'kcal until goal',
          },
        ].map(m => (
          <div
            key={m.label}
            style={{
              background: 'rgba(255, 255, 255, 0.72)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              borderRadius: 20, padding: '22px',
              border: '1px solid rgba(255, 255, 255, 0.88)',
              boxShadow: '0 4px 20px rgba(149,67,47,0.04)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'default',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 36px rgba(149,67,47,0.1)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.transform = ''
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(149,67,47,0.04)'
            }}
          >
            {/* Icon */}
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: m.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <m.icon size={17} color={m.iconColor} />
            </div>

            {/* Value */}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: '#1d1b15', lineHeight: 1, marginBottom: 6 }}>
              {m.value}
            </div>

            {/* Label */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#88726d', fontWeight: 700, marginBottom: 3 }}>
              {m.label}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#88726d' }}>
              {m.sub}
            </div>
          </div>
        ))}
      </section>

      {/* ── Heatmap ───────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 24, padding: '28px 32px',
          border: '1px solid rgba(255, 255, 255, 0.88)',
          boxShadow: '0 4px 20px rgba(149,67,47,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#88726d', fontWeight: 700, marginBottom: 4 }}>
              Consistency
            </p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#1d1b15', margin: 0 }}>
              Last 30 days
            </h3>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: '#88726d', marginRight: 2 }}>Less</span>
            {[0, 0.2, 0.5, 0.75, 1].map((p, i) => (
              <div key={i} style={{ width: 14, height: 14, borderRadius: 4, background: heatColor(p) }} />
            ))}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: '#88726d', marginLeft: 2 }}>More</span>
          </div>
        </div>

        {/* Heatmap grid — 5 rows of 6 days */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Week rows */}
          {Array.from({ length: 5 }, (_, wk) => (
            <div key={wk} style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: 6 }, (_, dy) => {
                const idx = wk * 6 + dy
                if (idx >= heatmap.length) return <div key={dy} style={{ width: 22, height: 22 }} />
                const d = heatmap[idx]
                return (
                  <div
                    key={dy}
                    title={`${d.date}: ${Math.round(d.pct * 100)}%`}
                    style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: heatColor(d.pct), flexShrink: 0,
                      cursor: 'default',
                      transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.25)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)' }}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* Summary line */}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#88726d', marginTop: 16, margin: '16px 0 0' }}>
          {heatmap.filter(d => d.pct >= 0.8).length} high-performance days in the last 30
        </p>
      </section>

      {/* ── Editorial / Science ───────────────────────────────────────── */}
      <section
        style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40,
          alignItems: 'center',
        }}
        className="grid-cols-1 md:grid-cols-2"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#88726d', fontWeight: 700, marginBottom: 10 }}>
              Philosophy
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.5vw, 44px)',
              fontWeight: 800, color: '#1d1b15', lineHeight: 1.1,
              letterSpacing: '-0.03em', margin: 0,
            }}>
              A Holistic Approach to Data.
            </h2>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: '#55443d', lineHeight: 1.65, margin: 0 }}>
            Wellness is the synthesis of your movement, your rest, and your nutrition. Asiryx brings these elements together in a calm, focused environment designed for clarity and growth.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button
              onClick={() => setScienceOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#95432f', color: '#fff',
                border: 'none', borderRadius: 999, padding: '13px 26px',
                fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = '#7a2f1c'
                el.style.boxShadow = '0 8px 24px rgba(149,67,47,0.28)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = '#95432f'
                el.style.boxShadow = 'none'
              }}
            >
              <BookOpen size={15} />
              View Science
            </button>
            <button
              onClick={() => setJournalOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'transparent', color: '#1d1b15',
                border: '1px solid rgba(219,193,187,0.6)', borderRadius: 999, padding: '13px 26px',
                fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = '#95432f'; el.style.color = '#95432f'
                el.style.background = 'rgba(149,67,47,0.04)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = 'rgba(219,193,187,0.6)'; el.style.color = '#1d1b15'
                el.style.background = 'transparent'
              }}
            >
              <Edit3 size={15} />
              Journal
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', height: 360, borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(219,193,187,0.18)', boxShadow: '0 8px 32px rgba(149,67,47,0.07)' }}>
          <img
            src="https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80"
            alt="Wellness aesthetic"
            referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.8s ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(255,249,238,0.18), transparent)', pointerEvents: 'none' }} />
        </div>
      </section>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <Modal isOpen={scienceOpen} onClose={() => setScienceOpen(false)} title="Science of Kinetic Serenity">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#55443d', lineHeight: 1.65, margin: 0 }}>
            Kinetic Serenity is a physiological framework based on compounding small mindful efforts. Instead of stressing over rigid fitness regimes, our focus centers on consistency.
          </p>

          {[
            { icon: <Sparkles size={15} color="#95432f" />, title: '1. Compounding Streaks', body: 'Neuroplasticity studies show that completing simple, daily health triggers builds stable visual reinforcement loops, making long-term lifestyle adjustment 3.8× easier than high-intensity bursts.' },
            { icon: <Flame size={15} color="#95432f" />, title: '2. Non-Adrenaline Movement', body: 'Calibrating physical weights in the Gym tab allows active recovery. Lifting with deliberate speed downregulates serum cortisol levels, promoting heart rate variability (HRV) recovery.' },
            { icon: <Calendar size={15} color="#95432f" />, title: '3. Nutrition Rhythms', body: 'Logging dietary fuels sequentially stabilizes systemic energy spikes. Remaining slightly below or right at base metabolic benchmarks permits gentle cellular autophagy and mental alertness.' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(249,243,233,0.6)', border: '1px solid rgba(219,193,187,0.2)' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#95432f', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
                {item.icon} {item.title}
              </h4>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#55443d', lineHeight: 1.65, margin: 0 }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </Modal>

      <Modal isOpen={journalOpen} onClose={() => setJournalOpen(false)} title="Gratitude & Serenity Journal">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 16 }}>
          {journalEntries.length > 0 && (
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#88726d', fontWeight: 700, marginBottom: 12 }}>
                Recent Reflections ({journalEntries.length})
              </p>
              <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {journalEntries.slice(0, 5).map(entry => (
                  <div key={entry.id} style={{ padding: '12px 14px', background: 'rgba(252,249,242,0.8)', borderRadius: 12, border: '1px solid rgba(219,193,187,0.15)', fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#88726d', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{entry.date}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(237,231,221,0.8)', padding: '1px 8px', borderRadius: 999, fontWeight: 700, textTransform: 'capitalize' }}>{entry.mood}</span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, color: '#1d1b15', margin: '0 0 4px' }}>{entry.text}</p>
                    {entry.reflection && (
                      <p style={{ fontFamily: 'var(--font-body)', color: '#55443d', fontStyle: 'italic', margin: 0, paddingLeft: 8, borderLeft: '2px solid rgba(219,193,187,0.6)' }}>{entry.reflection}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={addJournalEntry} style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: journalEntries.length > 0 ? 4 : 0, borderTop: journalEntries.length > 0 ? '1px solid rgba(219,193,187,0.3)' : 'none' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#1d1b15', margin: 0 }}>
              How are you feeling right now?
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {(['peaceful', 'focused', 'restless', 'inspired', 'tired'] as const).map(mood => (
                <button
                  type="button" key={mood} onClick={() => setNewMood(mood)}
                  style={{
                    padding: '8px 4px', textAlign: 'center', borderRadius: 10,
                    fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, textTransform: 'capitalize',
                    background: newMood === mood ? '#95432f' : '#f9f3e9',
                    color: newMood === mood ? '#fff' : '#55443d',
                    border: newMood === mood ? '1px solid #95432f' : '1px solid transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {mood}
                </button>
              ))}
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#55443d', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Today&apos;s Focus
              </label>
              <input
                type="text" required value={newText} onChange={e => setNewText(e.target.value)}
                placeholder="e.g. Cleared my headspace on an evening walk"
                className="input"
                style={{ boxSizing: 'border-box' }}
                onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#95432f' }}
                onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(219,193,187,0.4)' }}
              />
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#55443d', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Gratitude (optional)
              </label>
              <textarea
                value={newReflection} onChange={e => setNewReflection(e.target.value)}
                placeholder="e.g. Grateful for the subtle morning light and my resilient body."
                rows={3} className="input"
                style={{ resize: 'none', boxSizing: 'border-box' }}
                onFocus={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#95432f' }}
                onBlur={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'rgba(219,193,187,0.4)' }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%', padding: '12px', borderRadius: 999, fontSize: 14, fontWeight: 600,
                fontFamily: 'var(--font-body)', background: '#95432f', color: '#fff',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#7a2f1c' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#95432f' }}
            >
              Record Reflection
            </button>
          </form>
        </div>
      </Modal>
    </div>
  )
}

// ── MiniRing ──────────────────────────────────────────────────────────────

function MiniRing({ value, max, color = '#95432f', size = 68 }: {
  value: number; max: number; color?: string; size?: number
}) {
  const sw   = 5.5
  const r    = (size - sw * 2) / 2
  const circ = 2 * Math.PI * r
  const fill = max > 0 ? Math.min(value / max, 1) : 0
  const cx   = size / 2

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(219,193,187,0.35)" strokeWidth={sw} />
        {fill > 0 && (
          <circle
            cx={cx} cy={cx} r={r} fill="none"
            stroke={color} strokeWidth={sw}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - fill)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)' }}
          />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 10.5, fontFamily: 'monospace', fontWeight: 700, color: fill > 0 ? color : '#88726d' }}>
          {Math.round(fill * 100)}%
        </span>
      </div>
    </div>
  )
}

// ── Inline icon for CheckSquare (avoids import collision) ─────────────────

function CheckSquareIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}
