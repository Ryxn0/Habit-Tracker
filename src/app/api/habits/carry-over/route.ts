import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDaysInMonth } from 'date-fns'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { month, year } = await request.json() as { month: number; year: number }
  const uid = user.id

  // If target month already has habits, do nothing
  const { count } = await supabase
    .from('habits').select('*', { count: 'exact', head: true })
    .eq('user_id', uid).eq('month', month).eq('year', year)
  if ((count ?? 0) > 0) return NextResponse.json({ ok: true, skipped: true })

  // Find previous month
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year

  const { data: prevHabits } = await supabase
    .from('habits').select('*')
    .eq('user_id', uid).eq('month', prevMonth).eq('year', prevYear)
    .order('sort_order')

  if (!prevHabits || prevHabits.length === 0) {
    // No previous habits — seed defaults
    const { error } = await supabase.rpc('seed_default_habits', {
      p_user_id: uid, p_month: month, p_year: year,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, seeded: true })
  }

  const newDays = getDaysInMonth(new Date(year, month - 1))
  const inserts = prevHabits.map((h: {
    name: string; type: string; goal: number; sort_order: number
  }) => ({
    user_id:    uid,
    name:       h.name,
    type:       h.type,
    goal:       h.type === 'daily' ? newDays : h.goal,
    month,
    year,
    sort_order: h.sort_order,
  }))

  const { error } = await supabase.from('habits').insert(inserts)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, carried: prevHabits.length })
}
