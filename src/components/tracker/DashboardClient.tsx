'use client'

import { useState, useEffect, useMemo } from 'react'
import { getDaysInMonth } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import HabitTracker from '@/components/tracker/HabitTracker'
import {
  currentMonth, currentYear, monthName,
  prevMonthYear, nextMonthYear,
  toISODate, todayISO, pct,
} from '@/lib/utils'
import type { Habit, Completion } from '@/types'
import Link from 'next/link'

interface Props { month: number; year: number }

export default function DashboardClient({ month, year }: Props) {
  const [userId,       setUserId]       = useState<string | null>(null)
  const [dailyHabits,  setDailyHabits]  = useState<Habit[]>([])
  const [weeklyHabits, setWeeklyHabits] = useState<Habit[]>([])
  const [completions,  setCompletions]  = useState<Completion[]>([])
  const [ready,        setReady]        = useState(false)

  useEffect(() => {
    async function boot() {
      const supabase = createClient()
      let { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error || !data.session) { window.location.href = '/auth/login'; return }
        session = data.session
      }
      const uid = session.user.id
      setUserId(uid)
      const { count } = await supabase
        .from('habits').select('*', { count: 'exact', head: true }).eq('user_id', uid)
      if ((count ?? 0) === 0) {
        await fetch('/api/habits/seed', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month: currentMonth(), year: currentYear() }),
        })
      }
    }
    boot()
  }, [])

  useEffect(() => {
    if (!userId) return
    async function fetchData() {
      setReady(false)
      const supabase = createClient()
      const pad = (n: number) => String(n).padStart(2, '0')
      const [habitsRes, completionsRes] = await Promise.all([
        supabase.from('habits').select('*')
          .eq('user_id', userId).eq('month', month).eq('year', year).order('sort_order'),
        supabase.from('completions').select('*')
          .eq('user_id', userId)
          .gte('date', `${year}-${pad(month)}-01`)
          .lte('date', `${year}-${pad(month)}-31`),
      ])
      const habits = habitsRes.data ?? []
      setDailyHabits(habits.filter((h: Habit) => h.type === 'daily'))
      setWeeklyHabits(habits.filter((h: Habit) => h.type === 'weekly'))
      setCompletions(completionsRes.data ?? [])
      setReady(true)
    }
    fetchData()
  }, [userId, month, year])

  const now  = { month: currentMonth(), year: currentYear() }
  const prev = prevMonthYear(month, year)
  const next = nextMonthYear(month, year)
  const isCurrentMonth = month === now.month && year === now.year

  const today   = todayISO()
  const numDays = getDaysInMonth(new Date(year, month - 1))
  const allHabits = useMemo(() => [...dailyHabits, ...weeklyHabits], [dailyHabits, weeklyHabits])

  const completionSet = useMemo(
    () => new Set(completions.map(c => `${c.habit_id}__${c.date}`)),
    [completions]
  )

  const dailyDoneToday = useMemo(
    () => dailyHabits.filter(h => completionSet.has(`${h.id}__${today}`)).length,
    [dailyHabits, completionSet, today]
  )

  const monthlyRate = useMemo(() => {
    if (allHabits.length === 0) return 0
    const rates = allHabits.map(h => {
      let done = 0
      if (h.type === 'daily') {
        for (let d = 1; d <= numDays; d++)
          if (completionSet.has(`${h.id}__${toISODate(year, month, d)}`)) done++
      } else {
        for (let wk = 0; wk < 5; wk++) {
          const firstDay = wk * 7 + 1
          if (firstDay <= numDays && completionSet.has(`${h.id}__${toISODate(year, month, firstDay)}`)) done++
        }
      }
      return pct(done, h.goal)
    })
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
  }, [allHabits, completionSet, year, month, numDays])

  if (!ready) return <LoadingSkeleton />

  const allDailyDone = dailyHabits.length > 0 && dailyDoneToday === dailyHabits.length

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="relative">
        <div style={{
          position: 'absolute', top: -100, left: -100,
          width: 500, height: 350,
          background: 'radial-gradient(ellipse, rgba(233,69,96,0.07) 0%, transparent 65%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl md:text-5xl text-white leading-none tracking-tight">
              Habit Tracker
            </h1>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs font-mono px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.18)' }}>
                {monthName(month)} {year}
              </span>
              {isCurrentMonth && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-full animate-pulse-soft"
                  style={{ background: 'rgba(233,69,96,0.08)', color: '#E94560', border: '1px solid rgba(233,69,96,0.2)' }}>
                  ● LIVE
                </span>
              )}
            </div>
          </div>

          {/* Month nav pill */}
          <div className="flex items-center gap-1 rounded-xl p-1 flex-shrink-0"
            style={{ background: '#0F1829', border: '1px solid #1E2D4E' }}>
            <Link
              href={`/dashboard?month=${prev.month}&year=${prev.year}`}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-card transition-all duration-150 text-base"
            >←</Link>
            {!isCurrentMonth && (
              <Link href="/dashboard"
                className="px-3 h-9 flex items-center text-xs font-mono rounded-lg hover:bg-card transition-all duration-150"
                style={{ color: '#22d3ee', letterSpacing: '0.12em' }}>
                TODAY
              </Link>
            )}
            <Link
              href={`/dashboard?month=${next.month}&year=${next.year}`}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-card transition-all duration-150 text-base"
            >→</Link>
          </div>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────── */}
      {allHabits.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Total Habits"
            value={String(allHabits.length)}
            sub={`${dailyHabits.length} daily · ${weeklyHabits.length} weekly`}
            accent="#22d3ee"
            icon={<TargetIcon />}
          />
          <StatCard
            label={isCurrentMonth ? 'Today' : 'Daily Habits'}
            value={isCurrentMonth ? `${dailyDoneToday} / ${dailyHabits.length}` : String(dailyHabits.length)}
            sub={isCurrentMonth
              ? allDailyDone ? 'All done! Keep it up 🔥' : 'completed today'
              : 'in this month'}
            accent="#E94560"
            icon={<CheckIcon />}
          />
          <StatCard
            label="Monthly Rate"
            value={`${monthlyRate}%`}
            sub="average completion"
            accent="#f472b6"
            icon={<MiniRing rate={monthlyRate} />}
          />
        </div>
      )}

      {/* ── Habit tracker ────────────────────────────────────────── */}
      <HabitTracker
        dailyHabits={dailyHabits}
        weeklyHabits={weeklyHabits}
        completions={completions}
        month={month}
        year={year}
        userId={userId!}
      />
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent, icon }: {
  label:  string
  value:  string
  sub:    string
  accent: string
  icon:   React.ReactNode
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-5 animate-fade-in group"
      style={{ background: '#141E33', border: '1px solid #1E2D4E', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-3px)'
        el.style.boxShadow = `0 12px 40px ${accent}12, 0 2px 8px rgba(0,0,0,0.4)`
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ''
        el.style.boxShadow = ''
      }}
    >
      {/* Corner gradient */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 100, height: 100,
        background: `radial-gradient(circle at 100% 0%, ${accent}18, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      {/* Bottom line accent */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${accent}30, transparent)`,
      }} />

      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#4B5563' }}>
          {label}
        </span>
        <span style={{ color: accent, opacity: 0.75 }}>{icon}</span>
      </div>

      <div className="font-display text-3xl text-white leading-none mb-1.5">{value}</div>
      <div className="text-xs text-muted leading-relaxed">{sub}</div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────

function TargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1.5" y="1.5" width="15" height="15" rx="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 9l2.5 2.5L12.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MiniRing({ rate }: { rate: number }) {
  const r = 7, circ = 2 * Math.PI * r
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="9" cy="9" r={r} fill="none" stroke="currentColor" strokeWidth="2" opacity={0.2} />
      <circle cx="9" cy="9" r={r} fill="none" stroke="currentColor" strokeWidth="2"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - rate / 100)}
        strokeLinecap="round" />
    </svg>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-12 w-56 rounded-xl animate-pulse" style={{ background: '#141E33' }} />
        <div className="h-6 w-28 rounded-full animate-pulse" style={{ background: '#141E33' }} />
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: '#141E33', animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
      {/* Card skeletons */}
      <div className="space-y-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: '#141E33', animationDelay: `${i * 75}ms` }} />
        ))}
      </div>
    </div>
  )
}
