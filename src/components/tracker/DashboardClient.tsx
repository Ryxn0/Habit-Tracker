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

type Tab = 'overview' | 'habits' | 'calories' | 'gym'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview',  label: 'Overview'  },
  { key: 'habits',    label: 'Habits'    },
  { key: 'calories',  label: 'Calories'  },
  { key: 'gym',       label: 'Gym'       },
]

const ACCENT = '#c4573d'

interface Props { month: number; year: number; tab: Tab }

export default function DashboardClient({ month, year, tab }: Props) {
  const router = useRouter()
  const [userId,       setUserId]       = useState<string | null>(null)
  const [dailyHabits,  setDailyHabits]  = useState<Habit[]>([])
  const [weeklyHabits, setWeeklyHabits] = useState<Habit[]>([])
  const [completions,  setCompletions]  = useState<Completion[]>([])
  const [ready,        setReady]        = useState(false)
  const [carryingOver, setCarryingOver] = useState(false)
  const [menuOpen,     setMenuOpen]     = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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

      {/* ── Top nav ──────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(6,9,16,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 56, gap: 16 }}>

            {/* Logo */}
            <Link href="/dashboard" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 400,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}>
                asiryx<span style={{ color: ACCENT }}>.</span>
              </span>
            </Link>

            {/* Tab pills */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{
                display: 'flex', gap: 2, padding: 3,
                background: 'rgba(255,255,255,0.04)', borderRadius: 999,
              }}>
                {TABS.map(({ key, label }) => (
                  <Link key={key} href={tabUrl(key)} style={{ textDecoration: 'none' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '5px 14px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 500,
                      transition: 'all 0.15s',
                      background: tab === key ? '#E94560' : 'transparent',
                      color: tab === key ? '#ffffff' : 'rgba(255,255,255,0.4)',
                      boxShadow: tab === key ? '0 0 12px rgba(233,69,96,0.35)' : 'none',
                      cursor: 'pointer',
                    }}>
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Hamburger */}
            <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: menuOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 4,
                  transition: 'background 0.15s',
                }}
              >
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: 15, height: 1.5, background: 'rgba(255,255,255,0.5)',
                    borderRadius: 1, display: 'block',
                  }} />
                ))}
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 44, right: 0,
                  background: '#0F1829', border: '1px solid #1E2D4E',
                  borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  minWidth: 140, zIndex: 100, overflow: 'hidden',
                }}>
                  <button
                    onClick={handleSignOut}
                    style={{
                      width: '100%', padding: '10px 16px', textAlign: 'left',
                      fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'block',
                      background: 'none', border: 'none', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#141E33'
                      ;(e.currentTarget as HTMLButtonElement).style.color = '#ffffff'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'none'
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', width: '100%', padding: '32px 20px' }}>

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
          />
        )}

        {/* HABITS */}
        {tab === 'habits' && (
          <div>
            <ViewHeader label="TRACKER" title="Habits">
              <MonthNav
                month={month} year={year}
                prev={prev} next={next}
                isCurrentMonth={isCurrentMonth}
              />
            </ViewHeader>

            {ready && allHabits.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '64px 0', border: '1px dashed #1E2D4E', borderRadius: 16, gap: 12,
              }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: 0 }}>
                  No habits for {monthName(month)} {year}
                </p>
                <button
                  onClick={handleCarryOver}
                  disabled={carryingOver}
                  style={{
                    padding: '10px 24px', borderRadius: 12, fontSize: 14,
                    fontWeight: 600, cursor: carryingOver ? 'default' : 'pointer',
                    border: 'none', background: ACCENT, color: '#fff',
                    opacity: carryingOver ? 0.6 : 1, transition: 'opacity 0.2s',
                  }}
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
          </div>
        )}

        {/* CALORIES */}
        {tab === 'calories' && (
          <div>
            <ViewHeader label="TRACKER" title="Calories" sub={`today · ${todayStr}`} />
            <CaloriesTab userId={userId!} />
          </div>
        )}

        {/* GYM */}
        {tab === 'gym' && (
          <div>
            <ViewHeader label="TRACKER" title="Gym" sub={`today · ${todayStr}`} />
            <GymTab userId={userId!} />
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 20px',
        textAlign: 'center',
        fontSize: 12,
        color: 'rgba(255,255,255,0.25)',
        fontFamily: 'monospace',
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
    <div style={{ marginBottom: 28 }}>
      <p style={{
        fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.12em',
        color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 8,
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400,
            color: '#ffffff', lineHeight: 1, margin: 0,
          }}>
            {title}
          </h1>
          {sub && (
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{sub}</span>
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
  const ACCENT = '#E94560'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <Link
        href={`/dashboard?month=${prev.month}&year=${prev.year}&tab=habits`}
        style={{
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, border: '1px solid #1E2D4E', color: 'rgba(255,255,255,0.5)',
          textDecoration: 'none', fontSize: 14, background: '#0F1829',
        }}
      >
        ←
      </Link>

      <span style={{
        padding: '5px 12px', borderRadius: 999, fontSize: 12,
        fontFamily: 'monospace', letterSpacing: '0.06em',
        background: isCurrentMonth ? `${ACCENT}15` : 'rgba(255,255,255,0.04)',
        color: isCurrentMonth ? ACCENT : 'rgba(255,255,255,0.5)',
        border: `1px solid ${isCurrentMonth ? `${ACCENT}30` : '#1E2D4E'}`,
      }}>
        {monthName(month)} {year}
      </span>

      {!isCurrentMonth && (
        <Link
          href="/dashboard?tab=habits"
          style={{
            padding: '5px 10px', borderRadius: 999, fontSize: 11,
            fontFamily: 'monospace', letterSpacing: '0.1em',
            color: ACCENT, textDecoration: 'none',
            border: `1px solid ${ACCENT}40`, background: `${ACCENT}15`,
          }}
        >
          TODAY
        </Link>
      )}

      <Link
        href={`/dashboard?month=${next.month}&year=${next.year}&tab=habits`}
        style={{
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, border: '1px solid #1E2D4E', color: 'rgba(255,255,255,0.5)',
          textDecoration: 'none', fontSize: 14, background: '#0F1829',
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
      alignItems: 'center', justifyContent: 'center', gap: 8,
      background: '#f0ebe4',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '2px solid #e5ddd4', borderTopColor: '#c4573d',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#a8a29e', fontSize: 13, fontFamily: 'monospace' }}>loading...</p>
    </div>
  )
}
