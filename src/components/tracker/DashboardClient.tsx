'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { getDaysInMonth } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import HabitTracker from '@/components/tracker/HabitTracker'
import CaloriesTab  from '@/components/tracker/CaloriesTab'
import GymTab       from '@/components/tracker/GymTab'
import {
  currentMonth, currentYear, monthName,
  prevMonthYear, nextMonthYear,
  toISODate, todayISO, pct,
} from '@/lib/utils'
import type { Habit, Completion } from '@/types'
import Link from 'next/link'

type Tab = 'habits' | 'calories' | 'gym'

interface Props { month: number; year: number; tab: Tab }

export default function DashboardClient({ month, year, tab }: Props) {
  const [userId,       setUserId]       = useState<string | null>(null)
  const [dailyHabits,  setDailyHabits]  = useState<Habit[]>([])
  const [weeklyHabits, setWeeklyHabits] = useState<Habit[]>([])
  const [completions,  setCompletions]  = useState<Completion[]>([])
  const [ready,        setReady]        = useState(false)
  const [carryingOver, setCarryingOver] = useState(false)

  // ── Auth boot (runs once) ──────────────────────────────────────────
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

  // ── Habit fetch (runs when user or month/year changes) ────────────
  const fetchHabits = useCallback(async () => {
    if (!userId) return
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
  }, [userId, month, year])

  useEffect(() => { fetchHabits() }, [fetchHabits])

  // ── Derived state ──────────────────────────────────────────────────
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

  // Streak computation (≥80% of daily habits = "day done")
  const { currentStreak, bestStreak } = useMemo(() => {
    if (dailyHabits.length === 0) return { currentStreak: 0, bestStreak: 0 }
    const threshold = Math.ceil(dailyHabits.length * 0.8)

    const endDay = isCurrentMonth ? parseInt(today.split('-')[2]) : numDays
    let cur = 0
    for (let d = endDay; d >= 1; d--) {
      const done = dailyHabits.filter(h => completionSet.has(`${h.id}__${toISODate(year, month, d)}`)).length
      if (done >= threshold) cur++
      else break
    }

    let best = 0, run = 0
    for (let d = 1; d <= numDays; d++) {
      const done = dailyHabits.filter(h => completionSet.has(`${h.id}__${toISODate(year, month, d)}`)).length
      if (done >= threshold) { run++; best = Math.max(best, run) }
      else run = 0
    }

    return { currentStreak: cur, bestStreak: best }
  }, [dailyHabits, completionSet, year, month, numDays, today, isCurrentMonth])

  const bestSingleDay = useMemo(() => {
    if (completions.length === 0) return 0
    const counts: Record<string, number> = {}
    completions.forEach(c => { counts[c.date] = (counts[c.date] ?? 0) + 1 })
    return Math.max(...Object.values(counts))
  }, [completions])

  // ── Carry-over ────────────────────────────────────────────────────
  async function handleCarryOver() {
    if (!userId) return
    setCarryingOver(true)
    await fetch('/api/habits/carry-over', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    })
    await fetchHabits()
    setCarryingOver(false)
  }

  // ── Loading state ─────────────────────────────────────────────────
  if (!userId) return <LoadingSkeleton />
  if (tab === 'habits' && !ready) return <LoadingSkeleton />

  const allDailyDone = dailyHabits.length > 0 && dailyDoneToday === dailyHabits.length

  const tabHref = (t: Tab) => `/dashboard?month=${month}&year=${year}&tab=${t}`

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Page header ─────────────────────────────────────────────── */}
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
              href={`/dashboard?month=${prev.month}&year=${prev.year}&tab=${tab}`}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-card transition-all duration-150 text-base"
            >←</Link>
            {!isCurrentMonth && (
              <Link href={`/dashboard?tab=${tab}`}
                className="px-3 h-9 flex items-center text-xs font-mono rounded-lg hover:bg-card transition-all duration-150"
                style={{ color: '#22d3ee', letterSpacing: '0.12em' }}>
                TODAY
              </Link>
            )}
            <Link
              href={`/dashboard?month=${next.month}&year=${next.year}&tab=${tab}`}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-card transition-all duration-150 text-base"
            >→</Link>
          </div>
        </div>
      </div>

      {/* ── Stats panel (6 KPI cards) ──────────────────────────────── */}
      {(ready && allHabits.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="Total Habits"
            value={String(allHabits.length)}
            sub={`${dailyHabits.length}d · ${weeklyHabits.length}w`}
            accent="#22d3ee"
            icon={<TargetIcon />}
          />
          <StatCard
            label={isCurrentMonth ? 'Today' : 'Daily Habits'}
            value={isCurrentMonth ? `${dailyDoneToday}/${dailyHabits.length}` : String(dailyHabits.length)}
            sub={isCurrentMonth
              ? allDailyDone ? '🔥 All done!' : 'completed'
              : 'in this month'}
            accent="#E94560"
            icon={<CheckIcon />}
          />
          <StatCard
            label="Monthly Rate"
            value={`${monthlyRate}%`}
            sub="avg completion"
            accent="#f472b6"
            icon={<MiniRing rate={monthlyRate} />}
          />
          <StatCard
            label="Current Streak"
            value={`${currentStreak}d`}
            sub="consecutive days"
            accent="#4ade80"
            icon={<FlameIcon />}
          />
          <StatCard
            label="Best Streak"
            value={`${bestStreak}d`}
            sub="this month"
            accent="#fb923c"
            icon={<TrophyIcon />}
          />
          <StatCard
            label="Best Day"
            value={String(bestSingleDay)}
            sub={`of ${allHabits.length} habits`}
            accent="#a78bfa"
            icon={<StarIcon />}
          />
        </div>
      )}

      {/* ── Navigation tabs ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-xl p-1 w-fit"
        style={{ background: '#0F1829', border: '1px solid #1E2D4E' }}>
        {([
          { key: 'habits',   label: 'Habits'   },
          { key: 'calories', label: 'Calories' },
          { key: 'gym',      label: 'Gym'      },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <Link key={key} href={tabHref(key)}
            className="px-5 h-9 flex items-center text-sm font-semibold rounded-lg transition-all duration-200"
            style={tab === key
              ? { background: '#E94560', color: '#fff', boxShadow: '0 0 12px rgba(233,69,96,0.35)' }
              : { color: '#4B5563' }
            }>
            {label}
          </Link>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────── */}
      {tab === 'habits' && (
        <>
          {ready && allHabits.length === 0 ? (
            <div className="flex flex-col items-center py-20 border border-dashed border-border rounded-xl gap-4">
              <p className="text-muted text-sm">No habits for {monthName(month)} {year}</p>
              <button
                onClick={handleCarryOver}
                disabled={carryingOver}
                className="px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #E94560, #9b2335)', boxShadow: '0 0 20px rgba(233,69,96,0.3)' }}
              >
                {carryingOver
                  ? 'Carrying over...'
                  : `Carry over from ${monthName(prev.month)} ${prev.year}`}
              </button>
            </div>
          ) : (
            <HabitTracker
              dailyHabits={dailyHabits}
              weeklyHabits={weeklyHabits}
              completions={completions}
              month={month}
              year={year}
              userId={userId!}
            />
          )}
        </>
      )}

      {tab === 'calories' && <CaloriesTab userId={userId!} />}
      {tab === 'gym'      && <GymTab      userId={userId!} />}
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
      <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, background: `radial-gradient(circle at 100% 0%, ${accent}18, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${accent}30, transparent)` }} />

      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#4B5563' }}>{label}</span>
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

function FlameIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2C9 2 13 6 13 10C13 12.761 11.209 15 9 15C6.791 15 5 12.761 5 10C5 8 6 6.5 7 5.5C7 7 8 8 9 8C9 6 8.5 4 9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M5 3h8M5 3C5 3 3 3 3 6c0 2 1.5 3.5 3 4M13 3c0 0 2 0 2 3c0 2-1.5 3.5-3 4M9 13v3M7 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 10c0 0 1 1.5 3 1.5S12 10 12 10V3H6v7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1.5l2.163 4.382 4.837.703-3.5 3.411.826 4.816L9 12.5l-4.326 2.312.826-4.816-3.5-3.411 4.837-.703L9 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
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
      <div className="space-y-3">
        <div className="h-12 w-56 rounded-xl animate-pulse" style={{ background: '#141E33' }} />
        <div className="h-6 w-28 rounded-full animate-pulse" style={{ background: '#141E33' }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: '#141E33', animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
      <div className="space-y-3">
        {[0,1,2,3].map(i => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: '#141E33', animationDelay: `${i * 75}ms` }} />
        ))}
      </div>
    </div>
  )
}
