'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import HabitTracker from '@/components/tracker/HabitTracker'
import { currentMonth, currentYear, monthName, prevMonthYear, nextMonthYear } from '@/lib/utils'
import type { Habit, Completion } from '@/types'
import Link from 'next/link'

interface Props {
  month: number
  year: number
}

export default function DashboardClient({ month, year }: Props) {
  const [userId, setUserId]         = useState<string | null>(null)
  const [dailyHabits, setDailyHabits]   = useState<Habit[]>([])
  const [weeklyHabits, setWeeklyHabits] = useState<Habit[]>([])
  const [completions, setCompletions]   = useState<Completion[]>([])
  const [ready, setReady]           = useState(false)

  // ── Step 1: authenticate once on mount ────────────────────────
  useEffect(() => {
    async function boot() {
      const supabase = createClient()
      let { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // Try anonymous sign-in so the user reaches the tracker without an account
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error || !data.session) {
          // Anonymous auth not enabled in Supabase — redirect to login
          window.location.href = '/auth/login'
          return
        }
        session = data.session
      }

      const uid = session.user.id
      setUserId(uid)

      // Seed default habits if this user has none yet (new sign-up or anonymous)
      const { count } = await supabase
        .from('habits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)

      if ((count ?? 0) === 0) {
        await fetch('/api/habits/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month: currentMonth(), year: currentYear() }),
        })
      }
    }
    boot()
  }, [])

  // ── Step 2: fetch data for the viewed month ────────────────────
  useEffect(() => {
    if (!userId) return

    async function fetchData() {
      setReady(false)
      const supabase = createClient()
      const pad = (n: number) => String(n).padStart(2, '0')

      const [habitsRes, completionsRes] = await Promise.all([
        supabase
          .from('habits')
          .select('*')
          .eq('user_id', userId)
          .eq('month', month)
          .eq('year', year)
          .order('sort_order'),
        supabase
          .from('completions')
          .select('*')
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

  // ── Render ─────────────────────────────────────────────────────
  const now  = { month: currentMonth(), year: currentYear() }
  const prev = prevMonthYear(month, year)
  const next = nextMonthYear(month, year)
  const isCurrentMonth = month === now.month && year === now.year

  if (!ready) return (
    <div className="flex items-center justify-center py-32 text-muted text-sm">
      Loading...
    </div>
  )

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, letterSpacing: '0.15em', color: '#fff', margin: 0 }}>
            HABIT TRACKER
          </h1>
          <div style={{ fontSize: 13, color: '#22d3ee', marginTop: 6, letterSpacing: '0.12em', fontFamily: 'monospace' }}>
            — {monthName(month).toUpperCase()} {year} —
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Link
            href={`/dashboard?month=${prev.month}&year=${prev.year}`}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1E2D4E', borderRadius: 6, color: '#6B7280', fontSize: 14, transition: 'all 0.15s' }}
            className="hover:border-[#22d3ee] hover:text-white"
          >←</Link>
          {!isCurrentMonth && (
            <Link href="/dashboard" style={{ fontSize: 11, color: '#22d3ee', fontFamily: 'monospace', letterSpacing: '0.1em' }}
              className="hover:opacity-70 transition-opacity"
            >
              TODAY
            </Link>
          )}
          <Link
            href={`/dashboard?month=${next.month}&year=${next.year}`}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1E2D4E', borderRadius: 6, color: '#6B7280', fontSize: 14, transition: 'all 0.15s' }}
            className="hover:border-[#22d3ee] hover:text-white"
          >→</Link>
        </div>
      </div>

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
