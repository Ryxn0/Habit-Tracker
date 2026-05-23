'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import HabitTracker from '@/components/tracker/HabitTracker'
import CaloriesTab  from '@/components/tracker/CaloriesTab'
import GymTab       from '@/components/tracker/GymTab'
import OverviewTab  from '@/components/tracker/OverviewTab'
import {
  currentMonth, currentYear, monthName,
  prevMonthYear, nextMonthYear,
} from '@/lib/utils'
import type { Habit, Completion } from '@/types'
import Link from 'next/link'
import {
  Menu, X, LayoutDashboard, CheckSquare,
  Flame, Activity, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react'

type Tab = 'overview' | 'habits' | 'calories' | 'gym'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'overview',  label: 'Overview',  icon: LayoutDashboard },
  { key: 'habits',    label: 'Habits',    icon: CheckSquare },
  { key: 'calories',  label: 'Calories',  icon: Flame },
  { key: 'gym',       label: 'Workout',   icon: Activity },
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
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close mobile drawer on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node))
        setMobileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Auth boot
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

  // Habit fetch
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

  const now  = { month: currentMonth(), year: currentYear() }
  const prev = prevMonthYear(month, year)
  const next = nextMonthYear(month, year)
  const isCurrentMonth = month === now.month && year === now.year
  const allHabits = useMemo(() => [...dailyHabits, ...weeklyHabits], [dailyHabits, weeklyHabits])

  const completionSet = useMemo(
    () => new Set(completions.map(c => `${c.habit_id}__${c.date}`)),
    [completions]
  )

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

  // ── Sidebar contents (shared between desktop & mobile) ───────────────
  function SidebarBody({ onNav }: { onNav?: () => void }) {
    return (
      <>
        {/* Logo */}
        <div style={{ padding: '28px 20px 16px' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }} onClick={onNav}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800,
              color: '#F1F5F9', letterSpacing: '-0.02em',
            }}>
              asiryx<span style={{ color: '#818CF8' }}>.</span>
            </span>
          </Link>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 9.5, color: '#94A3B8',
            marginTop: 4, letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            Kinetic Serenity
          </p>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 0 8px' }} />

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '4px 12px', overflowY: 'auto' }}>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
            letterSpacing: '0.15em', color: '#94A3B8',
            padding: '6px 10px', marginBottom: 4, fontWeight: 700,
          }}>
            Menu
          </p>
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key
            return (
              <Link
                key={key} href={tabUrl(key)} onClick={onNav}
                style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}
              >
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 11, cursor: 'pointer',
                    background: active ? '#6366F1' : 'transparent',
                    color: active ? '#fff' : '#CBD5E1',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)'
                  }}
                  onMouseLeave={e => {
                    if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.15s',
                  }}>
                    <Icon size={14} />
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, fontFamily: 'var(--font-body)' }}>
                    {label}
                  </span>
                  {active && (
                    <div style={{
                      marginLeft: 'auto', width: 5, height: 5,
                      borderRadius: '50%', background: 'rgba(255,255,255,0.6)',
                    }} />
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Bottom panel */}
        <div style={{ padding: '12px', margin: '8px 12px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {tab === 'habits' && (
            <div style={{ marginBottom: 12 }}>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
                letterSpacing: '0.15em', color: '#94A3B8', marginBottom: 8, fontWeight: 700,
              }}>
                Period
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href={`/dashboard?month=${prev.month}&year=${prev.year}&tab=habits`} style={{ textDecoration: 'none' }}>
                  <button style={{
                    width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.07)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8',
                  }}>
                    <ChevronLeft size={13} />
                  </button>
                </Link>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#E2E8F0', fontWeight: 600, letterSpacing: '0.04em' }}>
                  {monthName(month)} {year}
                </span>
                <Link href={`/dashboard?month=${next.month}&year=${next.year}&tab=habits`} style={{ textDecoration: 'none' }}>
                  <button style={{
                    width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.07)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8',
                  }}>
                    <ChevronRight size={13} />
                  </button>
                </Link>
              </div>
              {!isCurrentMonth && (
                <Link href="/dashboard?tab=habits" style={{ textDecoration: 'none', display: 'block', marginTop: 8, textAlign: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, color: '#818CF8',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    background: 'rgba(99,102,241,0.15)', padding: '4px 10px', borderRadius: 999,
                  }}>
                    Today
                  </span>
                </Link>
              )}
            </div>
          )}

          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '8px 10px', borderRadius: 9, border: 'none',
              background: 'transparent', cursor: 'pointer',
              color: '#94A3B8', fontSize: 13, fontFamily: 'var(--font-body)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'rgba(255,255,255,0.08)'
              el.style.color = '#A5B4FC'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'transparent'
              el.style.color = '#94A3B8'
            }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside
        className="hidden md:flex"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 240,
          background: '#1E293B',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(148,163,184,0.1)',
          flexDirection: 'column', zIndex: 40,
        }}
      >
        <SidebarBody />
      </aside>

      {/* ── Mobile Top Bar ───────────────────────────────────────────── */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, height: 54,
          background: 'rgba(248,250,252,0.97)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(100,116,139,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800,
            color: '#0F172A', letterSpacing: '-0.02em',
          }}>
            asiryx<span style={{ color: '#6366F1' }}>.</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(v => !v)}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: mobileOpen ? 'rgba(99,102,241,0.1)' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0F172A', transition: 'all 0.2s',
          }}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* ── Mobile Drawer ────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden" style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)',
            }}
          />
          <div
            ref={drawerRef}
            style={{
              position: 'absolute', top: 0, left: 0, bottom: 0, width: 264,
              background: '#1E293B',
              borderRight: '1px solid rgba(148,163,184,0.1)',
              boxShadow: '8px 0 48px rgba(0,0,0,0.3)',
              display: 'flex', flexDirection: 'column',
              paddingTop: 54,
            }}
          >
            <SidebarBody onNav={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main
        className="md:ml-60"
        style={{ flex: 1, padding: '70px 28px 52px 28px' }}
      >
        {/* Desktop removes the top padding for the mobile top bar */}
        <style>{`@media (min-width: 768px) { .dashboard-main-inner { padding-top: 40px !important; } }`}</style>
        <div
          className="dashboard-main-inner"
          style={{ maxWidth: 1100, margin: '0 auto', paddingTop: 70 }}
        >

          {/* Section header for non-overview tabs */}
          {tab !== 'overview' && (
            <ViewHeader
              label={
                tab === 'habits'   ? 'HABIT TRACKER'      :
                tab === 'calories' ? 'NUTRITION & FUEL'   : 'GYM & MUSCULAR FLOW'
              }
              title={
                tab === 'habits'   ? 'Daily Habits' :
                tab === 'calories' ? 'Calories'     : 'Workout'
              }
              sub={tab !== 'habits' ? `today · ${todayStr}` : undefined}
            />
          )}

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <OverviewTab
              userId={userId!} month={month} year={year}
              dailyHabits={dailyHabits} weeklyHabits={weeklyHabits}
              completionSet={completionSet} completions={completions}
              setTab={(t: Tab) => router.push(tabUrl(t))}
            />
          )}

          {/* HABITS */}
          {tab === 'habits' && (
            <div>
              {ready && allHabits.length === 0 ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '64px 0', border: '1px dashed rgba(100,116,139,0.5)',
                  borderRadius: 20, gap: 12, background: 'rgba(255,255,255,0.3)',
                }}>
                  <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>
                    No habits for {monthName(month)} {year}
                  </p>
                  <button
                    onClick={handleCarryOver}
                    disabled={carryingOver}
                    style={{
                      padding: '10px 24px', borderRadius: 999, fontSize: 14,
                      fontWeight: 600, cursor: carryingOver ? 'default' : 'pointer',
                      border: 'none', background: '#6366F1', color: '#fff',
                      opacity: carryingOver ? 0.6 : 1, transition: 'opacity 0.2s',
                    }}
                  >
                    {carryingOver ? 'Carrying over…' : `Carry over from ${monthName(prev.month)} ${prev.year}`}
                  </button>
                </div>
              ) : (
                <HabitTracker
                  dailyHabits={dailyHabits} weeklyHabits={weeklyHabits}
                  completions={completions} month={month} year={year} userId={userId!}
                />
              )}
            </div>
          )}

          {/* CALORIES */}
          {tab === 'calories' && <CaloriesTab userId={userId!} />}

          {/* GYM */}
          {tab === 'gym' && <GymTab userId={userId!} />}
        </div>
      </main>
    </div>
  )
}

// ── ViewHeader ────────────────────────────────────────────────────────────

function ViewHeader({
  label, title, sub,
}: {
  label: string
  title: string
  sub?: string
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      <p style={{
        fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em',
        color: '#64748B', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700,
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800,
          color: '#0F172A', lineHeight: 1, margin: 0, letterSpacing: '-0.02em',
        }}>
          {title}
        </h1>
        {sub && (
          <span style={{ fontSize: 13, color: '#64748B', fontFamily: 'var(--font-mono)' }}>{sub}</span>
        )}
      </div>
    </div>
  )
}

// ── LoadingSkeleton ───────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 10,
      background: '#F8FAFC',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '2px solid rgba(100,116,139,0.4)', borderTopColor: '#6366F1',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#64748B', fontSize: 13, fontFamily: 'monospace' }}>loading…</p>
    </div>
  )
}
