import { createClient } from '@/lib/supabase/server'
import { currentMonth, currentYear, monthName, prevMonthYear, nextMonthYear } from '@/lib/utils'
import HabitTracker from '@/components/tracker/HabitTracker'
import type { Habit, Completion } from '@/types'
import Link from 'next/link'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string }
}) {
  const supabase = createClient()

  const now = { month: currentMonth(), year: currentYear() }
  const month = Math.min(12, Math.max(1, Number(searchParams.month) || now.month))
  const year  = Math.max(2000, Math.min(2100, Number(searchParams.year)  || now.year))

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch habits for this month
  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)
    .order('sort_order')

  // Fetch all completions for this month
  const { data: completions } = await supabase
    .from('completions')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', `${year}-${String(month).padStart(2,'0')}-01`)
    .lte('date', `${year}-${String(month).padStart(2,'0')}-31`)

  const dailyHabits  = (habits ?? []).filter((h: Habit) => h.type === 'daily')
  const weeklyHabits = (habits ?? []).filter((h: Habit) => h.type === 'weekly')

  const prev = prevMonthYear(month, year)
  const next = nextMonthYear(month, year)
  const isCurrentMonth = month === now.month && year === now.year

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

        {/* Month navigation */}
        <div className="flex items-center gap-2 mt-3 flex-shrink-0">
          <Link
            href={`/dashboard?month=${prev.month}&year=${prev.year}`}
            className="border border-border hover:border-subtle text-subtle hover:text-white w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 text-sm"
          >
            ←
          </Link>
          {!isCurrentMonth && (
            <Link
              href="/dashboard"
              className="text-accent text-sm hover:text-accent/80 transition-colors px-1"
            >
              Today
            </Link>
          )}
          <Link
            href={`/dashboard?month=${next.month}&year=${next.year}`}
            className="border border-border hover:border-subtle text-subtle hover:text-white w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 text-sm"
          >
            →
          </Link>
        </div>
      </div>

      {/* Tracker */}
      <HabitTracker
        dailyHabits={dailyHabits}
        weeklyHabits={weeklyHabits}
        completions={completions as Completion[] ?? []}
        month={month}
        year={year}
      />
    </div>
  )
}
