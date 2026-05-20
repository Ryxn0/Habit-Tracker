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
    <div className="space-y-12 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl text-white">
            {monthName(month)} <span className="text-muted">{year}</span>
          </h1>
          <p className="text-muted mt-2">
            {dailyHabits.length} daily · {weeklyHabits.length} weekly habits tracked
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-shrink-0">
          <Link
            href={`/dashboard?month=${prev.month}&year=${prev.year}`}
            className="border border-border hover:border-subtle text-subtle hover:text-white w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 text-sm"
          >←</Link>
          {!isCurrentMonth && (
            <Link href="/dashboard" className="text-accent text-sm hover:text-accent/80 transition-colors px-1">
              Today
            </Link>
          )}
          <Link
            href={`/dashboard?month=${next.month}&year=${next.year}`}
            className="border border-border hover:border-subtle text-subtle hover:text-white w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 text-sm"
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
