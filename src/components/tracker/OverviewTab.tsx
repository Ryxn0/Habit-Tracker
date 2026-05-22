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

    // Heatmap (30 days)
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

  // Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning.' : hour < 17 ? 'Good afternoon.' : hour < 22 ? 'Good evening.' : 'Good night.'
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const now = new Date()
  const dateStr = `${days[now.getDay()]} • ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`

  function tabUrl(t: Tab) { return `/dashboard?month=${month}&year=${year}&tab=${t}` }

  function heatColor(p: number): string {
    if (p === 0)   return 'rgba(219,193,187,0.25)'
    if (p < 0.25)  return '#ffdad2'
    if (p < 0.5)   return '#f4b8a8'
    if (p < 0.75)  return '#cc7055'
    return '#95432f'
  }

  function addJournalEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!newText.trim()) return
    const entry: JournalEntry = {
      id: `j-${Date.now()}`,
      date: today,
      mood: newMood,
      text: newText,
      reflection: newReflection,
    }
    const updated = [entry, ...journalEntries]
    setJournalEntries(updated)
    localStorage.setItem('asiryx_journal_entries', JSON.stringify(updated))
    setNewText('')
    setNewReflection('')
    setJournalOpen(false)
  }

  return (
    <div className="space-y-12 animate-fade-in">

      {/* ── Hero welcome + bento grid ─────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          borderRadius: 28,
          background: '#fffaf2',
          border: '1px solid rgba(219,193,187,0.2)',
          padding: '40px 40px 48px',
        }}
      >
        {/* Decorative blur */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 480, height: 380,
          background: 'radial-gradient(ellipse, rgba(149,67,47,0.07) 0%, transparent 65%)',
          pointerEvents: 'none', translate: '30% -20%',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 600 }}>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: '#88726d', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#95432f', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            {dateStr}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5vw, 64px)',
            fontWeight: 800, color: '#1d1b15', lineHeight: 1.05,
            letterSpacing: '-0.03em', marginBottom: 16,
          }}>
            {greeting}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, color: '#55443d', lineHeight: 1.6, maxWidth: 440 }}>
            Here's how today is shaping up. Small actions compound — keep going.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12" style={{ position: 'relative', zIndex: 1 }}>
          {/* Habits card */}
          <Link href={tabUrl('habits')} style={{ textDecoration: 'none' }}>
            <div
              className="glass-card group"
              style={{ padding: '28px', borderRadius: 22, cursor: 'pointer', transition: 'all 0.3s', display: 'block' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 40px rgba(149,67,47,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#95432f', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#88726d', fontWeight: 700 }}>Habits Today</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 800, color: '#1d1b15', lineHeight: 1 }}>{dailyDoneToday}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'rgba(29,27,21,0.3)' }}>/ {dailyHabits.length}</span>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#55443d', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{Math.round(dailyHabits.length > 0 ? (dailyDoneToday / dailyHabits.length) * 100 : 0)}% completed today</span>
              </p>
              <div style={{ marginTop: 14, width: '100%', height: 4, background: 'rgba(219,193,187,0.4)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#95432f', width: `${dailyHabits.length > 0 ? (dailyDoneToday / dailyHabits.length) * 100 : 0}%`, borderRadius: 999, transition: 'width 0.5s' }} />
              </div>
            </div>
          </Link>

          {/* Calories card */}
          <Link href={tabUrl('calories')} style={{ textDecoration: 'none' }}>
            <div
              className="glass-card"
              style={{ padding: '28px', borderRadius: 22, cursor: 'pointer', transition: 'all 0.3s', display: 'block' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 40px rgba(149,67,47,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#88726d', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#88726d', fontWeight: 700 }}>Calories</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 800, color: '#1d1b15', lineHeight: 1 }}>{todayCals.toLocaleString()}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'rgba(29,27,21,0.3)' }}>/ {calGoal.toLocaleString()}</span>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#55443d' }}>{calPct}% of daily goal</p>
              <div style={{ marginTop: 14, width: '100%', height: 4, background: 'rgba(219,193,187,0.4)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#88726d', width: `${calPct}%`, borderRadius: 999, transition: 'width 0.5s' }} />
              </div>
            </div>
          </Link>

          {/* Workout card */}
          <Link href={tabUrl('gym')} style={{ textDecoration: 'none' }}>
            <div
              className="glass-card"
              style={{ padding: '28px', borderRadius: 22, cursor: 'pointer', transition: 'all 0.3s', display: 'block' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 40px rgba(149,67,47,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: todaySession ? '#95432f' : 'rgba(219,193,187,0.8)', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#88726d', fontWeight: 700 }}>Workout</span>
              </div>
              {todaySession ? (
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#1d1b15', marginBottom: 6, lineHeight: 1.2 }}>{todaySession}</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#95432f' }}>Completed today</p>
                </div>
              ) : (
                <div>
                  <div style={{ height: 48, display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ width: 64, height: 4, background: 'rgba(29,27,21,0.1)', borderRadius: 999 }} />
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#55443d', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Not logged yet <ArrowRight size={13} />
                  </p>
                </div>
              )}
            </div>
          </Link>
        </div>
      </section>

      {/* ── Metrics row ───────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { dot: 'rgba(219,193,187,0.8)', label: 'Current Streak', value: `${currentStreak}d`, sub: 'consecutive days' },
          { dot: '#95432f',               label: 'Best Streak',    value: `${bestStreak}d`,    sub: 'personal record'  },
          { dot: '#88726d',               label: 'Completion Rate', value: `${monthlyRate}%`,  sub: `avg across ${allHabits.length} habits` },
          { dot: '#1d1b15',               label: 'Cals Remaining',  value: caloriesRemaining.toLocaleString(), sub: 'until daily goal' },
        ].map(m => (
          <div
            key={m.label}
            style={{
              background: '#f9f3e9', borderRadius: 22, padding: '28px',
              border: '1px solid rgba(219,193,187,0.15)', transition: 'background 0.3s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f3ede3' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#f9f3e9' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#88726d', fontWeight: 700 }}>{m.label}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: '#1d1b15', lineHeight: 1, marginBottom: 6 }}>{m.value}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#88726d' }}>{m.sub}</div>
          </div>
        ))}
      </section>

      {/* ── Heatmap ───────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'rgba(255,255,255,0.6)', borderRadius: 22, padding: '28px 32px',
          border: '1px solid rgba(219,193,187,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#88726d', fontWeight: 700, marginBottom: 4 }}>Consistency</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#1d1b15', margin: 0 }}>Last 30 days</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#88726d', marginRight: 4 }}>LESS</span>
            {[0, 0.2, 0.5, 0.75, 1].map((p, i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: heatColor(p) }} />
            ))}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#88726d', marginLeft: 4 }}>MORE</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {heatmap.map((d, i) => (
            <div
              key={i}
              title={`${d.date}: ${Math.round(d.pct * 100)}%`}
              style={{ width: 18, height: 18, borderRadius: 4, background: heatColor(d.pct), flexShrink: 0 }}
            />
          ))}
        </div>
      </section>

      {/* ── Editorial section ─────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mt-8">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 48px)',
            fontWeight: 800, color: '#1d1b15', lineHeight: 1.1,
            letterSpacing: '-0.03em', margin: 0,
          }}>
            A Holistic Approach to Data.
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, color: '#55443d', lineHeight: 1.6, margin: 0 }}>
            Wellness is the synthesis of your movement, your rest, and your nutrition. Asiryx brings these elements together in a calm, focused environment designed for clarity and growth.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button
              onClick={() => setScienceOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#95432f', color: '#fff',
                border: 'none', borderRadius: 999, padding: '14px 28px',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#7a2f1c'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(149,67,47,0.25)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#95432f'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}
            >
              <BookOpen size={16} />
              View Science
            </button>
            <button
              onClick={() => setJournalOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'transparent', color: '#1d1b15',
                border: '1px solid rgba(219,193,187,0.6)', borderRadius: 999, padding: '14px 28px',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#95432f'; (e.currentTarget as HTMLButtonElement).style.color = '#95432f'; (e.currentTarget as HTMLButtonElement).style.background = '#fff9ee' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(219,193,187,0.6)'; (e.currentTarget as HTMLButtonElement).style.color = '#1d1b15'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <Edit3 size={16} />
              Journal
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', height: 380, borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(219,193,187,0.2)' }}>
          <img
            src="https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80"
            alt="Wellness aesthetic"
            referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 1s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(255,249,238,0.2), transparent)', pointerEvents: 'none' }} />
        </div>
      </section>

      {/* ── Science Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={scienceOpen} onClose={() => setScienceOpen(false)} title="Science of Kinetic Serenity">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#55443d', lineHeight: 1.65, margin: 0 }}>
            Kinetic Serenity is a physiological framework based on compounding small mindful efforts. Instead of stressing over rigid fitness regimes, our focus centers on consistency.
          </p>

          {[
            {
              icon: <Sparkles size={16} color="#95432f" />,
              title: '1. Compounding Streaks',
              body: 'Neuroplasticity studies show that completing simple, daily health triggers builds stable visual reinforcement loops, making long-term lifestyle adjustment 3.8× easier than high-intensity bursts.',
            },
            {
              icon: <Flame size={16} color="#95432f" />,
              title: '2. Non-Adrenaline Movement',
              body: 'Calibrating physical weights in the Gym tab allows active recovery. Lifting with deliberate speed downregulates serum cortisol levels, promoting heart rate variability (HRV) recovery.',
            },
            {
              icon: <Calendar size={16} color="#95432f" />,
              title: '3. Nutrition Rhythms',
              body: 'Logging dietary fuels sequentially stabilizes systemic energy spikes. Remaining slightly below or right at base metabolic benchmarks permits gentle cellular autophagy and mental alertness.',
            },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '18px 20px', borderRadius: 16,
              background: 'rgba(249,243,233,0.6)', border: '1px solid rgba(219,193,187,0.2)',
            }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#95432f', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
                {item.icon}
                {item.title}
              </h4>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#55443d', lineHeight: 1.65, margin: 0 }}>
                {item.body}
              </p>
            </div>
          ))}

          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#88726d', textAlign: 'center', fontStyle: 'italic', margin: 0 }}>
            Asiryx wellness modules are validated with data & design clarity.
          </p>
        </div>
      </Modal>

      {/* ── Journal Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={journalOpen} onClose={() => setJournalOpen(false)} title="Gratitude & Serenity Journal">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 16 }}>
          {journalEntries.length > 0 && (
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#88726d', fontWeight: 700, marginBottom: 12 }}>
                Recent Reflections ({journalEntries.length})
              </p>
              <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {journalEntries.slice(0, 5).map(entry => (
                  <div key={entry.id} style={{
                    padding: '12px 14px', background: 'rgba(252,249,242,0.8)', borderRadius: 12,
                    border: '1px solid rgba(219,193,187,0.15)', fontSize: 12,
                  }}>
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

          <form onSubmit={addJournalEntry} style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4, borderTop: journalEntries.length > 0 ? '1px solid rgba(219,193,187,0.3)' : 'none' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#1d1b15', margin: 0 }}>How are you feeling right now?</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {(['peaceful', 'focused', 'restless', 'inspired', 'tired'] as const).map(mood => (
                <button
                  type="button"
                  key={mood}
                  onClick={() => setNewMood(mood)}
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
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#55443d', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Today's Focus</label>
              <input
                type="text" required value={newText}
                onChange={e => setNewText(e.target.value)}
                placeholder="e.g. Cleared my headspace on an evening walk"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13,
                  fontFamily: 'var(--font-body)', background: 'rgba(249,243,233,0.8)',
                  border: '1px solid rgba(219,193,187,0.4)', outline: 'none',
                  color: '#1d1b15',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = '#95432f' }}
                onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(219,193,187,0.4)' }}
              />
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#55443d', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gratitude (optional)</label>
              <textarea
                value={newReflection}
                onChange={e => setNewReflection(e.target.value)}
                placeholder="e.g. Grateful for the subtle morning light and my resilient body."
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13,
                  fontFamily: 'var(--font-body)', background: 'rgba(249,243,233,0.8)',
                  border: '1px solid rgba(219,193,187,0.4)', outline: 'none',
                  color: '#1d1b15', resize: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
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
