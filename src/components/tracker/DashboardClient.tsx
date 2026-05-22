'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { getDaysInMonth } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import HabitTracker from '@/components/tracker/HabitTracker'
import CaloriesTab  from '@/components/tracker/CaloriesTab'
import GymTab       from '@/components/tracker/GymTab'
import OverviewTab  from '@/components/tracker/OverviewTab'
import {
  currentMonth, currentYear, monthName,
  prevMonthYear, nextMonthYear,
  toISODate, todayISO,
} from '@/lib/utils'
import type { Habit, Completion } from '@/types'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

type Tab = 'overview' | 'habits' | 'calories' | 'gym'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview',  label: 'Overview'  },
  { key: 'habits',    label: 'Habits'    },
  { key: 'calories',  label: 'Calories'  },
  { key: 'gym',       label: 'Gym'       },
]

interface Props { month: number; year: number; tab: Tab }

export default function DashboardClient({ month, year, tab }: Props) {
  const router = useRouter()
  const [userId,       setUserId]       = useState<string | null>(null)
  const [dailyHabits,  setDailyHabits]  = useState<Habit[]>([])
  const [weeklyHabits, setWeeklyHabits] = useState<Habit[]>([])
  const [completions,  setCompletions]  = useState<Completion[]>([])
  const [ready,        setReady]        = useState(false)
  const [carryingOver, setCarryingOver] = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [scrolled,     setScrolled]     = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // ── Scroll detection ─────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Auth boot ────────────────────────────────────────────────────────
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

  // ── Habit fetch ──────────────────────────────────────────────────────
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

  // ── Derived ──────────────────────────────────────────────────────────
  const now  = { month: currentMonth(), year: currentYear() }
  const prev = prevMonthYear(month, year)
  const next = nextMonthYear(month, year)
  const isCurrentMonth = month === now.month && year === now.year
  const allHabits = useMemo(() => [...dailyHabits, ...weeklyHabits], [dailyHabits, weeklyHabits])

  const completionSet = useMemo(
    () => new Set(completions.map(c => `${c.habit_id}__${c.date}`)),
    [completions]
  )

  // ── Actions ──────────────────────────────────────────────────────────
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

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const tabUrl = (t: Tab) => `/dashboard?month=${month}&year=${year}&tab=${t}`
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }).toLowerCase()

  if (!userId) return <LoadingSkeleton />

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Fixed Header ─────────────────────────────────────────────── */}
      <header
        style={{
          position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 40,
          transition: 'all 0.3s',
          background: scrolled ? 'rgba(255,249,238,0.95)' : 'rgba(255,249,238,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(136,114,109,0.1)',
          boxShadow: scrolled ? '0 1px 12px rgba(149,67,47,0.06)' : 'none',
        }}
      >
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: scrolled ? 60 : 72, gap: 16, transition: 'height 0.3s' }}>

            {/* Logo */}
            <Link href="/dashboard" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                fontWeight: 800,
                color: '#1d1b15',
                letterSpacing: '-0.02em',
              }}>
                asiryx<span style={{ color: '#95432f' }}>.</span>
              </span>
            </Link>

            {/* Desktop pill nav */}
            <nav
              className="hidden md:flex"
              style={{
                flex: 1, justifyContent: 'center',
                display: 'flex',
              }}
            >
              <div style={{
                display: 'flex', gap: 2, padding: '4px',
                background: 'rgba(219,193,187,0.25)',
                borderRadius: 999,
                border: '1px solid rgba(219,193,187,0.4)',
              }}>
                {TABS.map(({ key, label }) => (
                  <Link key={key} href={tabUrl(key)} style={{ textDecoration: 'none' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '7px 20px',
                      borderRadius: 999,
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: 'var(--font-body)',
                      transition: 'all 0.2s',
                      background: tab === key ? '#95432f' : 'transparent',
                      color: tab === key ? '#ffffff' : '#55443d',
                      cursor: 'pointer',
                    }}>
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </nav>

            {/* Mobile hamburger */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }} className="md:hidden">
              <button
                onClick={() => setMobileOpen(v => !v)}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: mobileOpen ? 'rgba(149,67,47,0.1)' : 'transparent',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#1d1b15', transition: 'all 0.2s',
                }}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            {/* Desktop: hamburger for sign out */}
            <div style={{ flexShrink: 0 }} className="hidden md:block">
              <button
                onClick={handleSignOut}
                style={{
                  padding: '7px 16px', borderRadius: 999, fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  background: 'transparent',
                  border: '1px solid rgba(136,114,109,0.3)',
                  color: '#88726d', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#f3ede3'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#1d1b15'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#88726d'
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30 }}>
          <div
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,21,0.25)', backdropFilter: 'blur(8px)' }}
          />
          <div
            ref={drawerRef}
            className="animate-slide-left"
            style={{
              position: 'absolute', top: 0, right: 0, bottom: 0,
              width: 280, background: '#fff9ee',
              borderLeft: '1px solid rgba(219,193,187,0.3)',
              boxShadow: '-8px 0 32px rgba(149,67,47,0.1)',
              padding: '80px 24px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#88726d', fontWeight: 700 }}>
                Navigation
              </span>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
                {TABS.map(({ key, label }) => (
                  <Link
                    key={key}
                    href={tabUrl(key)}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      textDecoration: 'none', padding: '12px 16px', borderRadius: 14, fontSize: 18,
                      fontFamily: 'var(--font-display)', fontWeight: 700,
                      background: tab === key ? '#95432f' : 'transparent',
                      color: tab === key ? '#ffffff' : '#55443d',
                      transition: 'all 0.2s',
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <div style={{ borderTop: '1px solid rgba(219,193,187,0.3)', paddingTop: 20, marginBottom: 16 }}>
                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%', padding: '10px 16px', textAlign: 'left',
                    fontFamily: 'var(--font-mono)', fontSize: 13, color: '#88726d',
                    background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3ede3'; (e.currentTarget as HTMLButtonElement).style.color = '#1d1b15' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#88726d' }}
                >
                  Sign out
                </button>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#88726d', opacity: 0.6 }}>
                Asiryx · Continuous Somatic Tracking
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main style={{ flex: 1, maxWidth: 1440, margin: '0 auto', width: '100%', padding: '100px 24px 48px' }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <OverviewTab
            userId={userId!}
            month={month}
            year={year}
            dailyHabits={dailyHabits}
            weeklyHabits={weeklyHabits}
            completionSet={completionSet}
            completions={completions}
            setTab={(t: Tab) => router.push(tabUrl(t))}
          />
        )}

        {/* HABITS */}
        {tab === 'habits' && (
          <div>
            <ViewHeader label="HABIT TRACKER" title="Daily Habits">
              <MonthNav month={month} year={year} prev={prev} next={next} isCurrentMonth={isCurrentMonth} />
            </ViewHeader>

            {ready && allHabits.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '64px 0', border: '1px dashed rgba(219,193,187,0.5)', borderRadius: 20, gap: 12,
                background: 'rgba(255,255,255,0.3)',
              }}>
                <p style={{ color: '#88726d', fontSize: 14, margin: 0 }}>
                  No habits for {monthName(month)} {year}
                </p>
                <button
                  onClick={handleCarryOver}
                  disabled={carryingOver}
                  style={{
                    padding: '10px 24px', borderRadius: 999, fontSize: 14,
                    fontWeight: 600, cursor: carryingOver ? 'default' : 'pointer',
                    border: 'none', background: '#95432f', color: '#fff',
                    opacity: carryingOver ? 0.6 : 1, transition: 'opacity 0.2s',
                  }}
                >
                  {carryingOver ? 'Carrying over...' : `Carry over from ${monthName(prev.month)} ${prev.year}`}
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
          </div>
        )}

        {/* CALORIES */}
        {tab === 'calories' && (
          <div>
            <ViewHeader label="NUTRITION & FUEL" title="Calories" sub={`today · ${todayStr}`} />
            <CaloriesTab userId={userId!} />
          </div>
        )}

        {/* GYM */}
        {tab === 'gym' && (
          <div>
            <ViewHeader label="GYM & MUSCULAR FLOW" title="Workout" sub={`today · ${todayStr}`} />
            <GymTab userId={userId!} />
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(136,114,109,0.12)',
        padding: '20px 24px',
        textAlign: 'center',
        fontSize: 12,
        color: '#88726d',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em',
      }}>
        asiryx · small actions, big results.
      </footer>
    </div>
  )
}

// ── ViewHeader ────────────────────────────────────────────────────────

function ViewHeader({
  label, title, sub, children,
}: {
  label: string
  title: string
  sub?: string
  children?: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <p style={{
        fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em',
        color: '#88726d', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700,
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800,
            color: '#1d1b15', lineHeight: 1, margin: 0, letterSpacing: '-0.02em',
          }}>
            {title}
          </h1>
          {sub && (
            <span style={{ fontSize: 13, color: '#88726d', fontFamily: 'var(--font-mono)' }}>{sub}</span>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

// ── MonthNav ──────────────────────────────────────────────────────────

function MonthNav({
  month, year, prev, next, isCurrentMonth,
}: {
  month: number; year: number
  prev: { month: number; year: number }
  next: { month: number; year: number }
  isCurrentMonth: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <Link
        href={`/dashboard?month=${prev.month}&year=${prev.year}&tab=habits`}
        style={{
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, border: '1px solid rgba(219,193,187,0.5)', color: '#88726d',
          textDecoration: 'none', fontSize: 14, background: 'rgba(255,255,255,0.6)',
          transition: 'all 0.15s',
        }}
      >
        ←
      </Link>

      <span style={{
        padding: '5px 12px', borderRadius: 999, fontSize: 12,
        fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
        background: isCurrentMonth ? 'rgba(149,67,47,0.08)' : 'rgba(255,255,255,0.6)',
        color: isCurrentMonth ? '#95432f' : '#88726d',
        border: `1px solid ${isCurrentMonth ? 'rgba(149,67,47,0.25)' : 'rgba(219,193,187,0.5)'}`,
      }}>
        {monthName(month)} {year}
      </span>

      {!isCurrentMonth && (
        <Link
          href="/dashboard?tab=habits"
          style={{
            padding: '5px 10px', borderRadius: 999, fontSize: 11,
            fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
            color: '#95432f', textDecoration: 'none',
            border: '1px solid rgba(149,67,47,0.3)', background: 'rgba(149,67,47,0.06)',
          }}
        >
          TODAY
        </Link>
      )}

      <Link
        href={`/dashboard?month=${next.month}&year=${next.year}&tab=habits`}
        style={{
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, border: '1px solid rgba(219,193,187,0.5)', color: '#88726d',
          textDecoration: 'none', fontSize: 14, background: 'rgba(255,255,255,0.6)',
          transition: 'all 0.15s',
        }}
      >
        →
      </Link>
    </div>
  )
}

// ── LoadingSkeleton ───────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 10,
      background: '#fff9ee',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '2px solid rgba(219,193,187,0.4)', borderTopColor: '#95432f',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#88726d', fontSize: 13, fontFamily: 'monospace' }}>loading...</p>
    </div>
  )
}
