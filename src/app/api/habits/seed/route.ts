import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { month, year } = await request.json()

  // Check if habits already exist for this month
  const { data: existing } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ message: 'Already seeded' })
  }

  // Call the seed function defined in supabase-schema.sql
  const { error } = await supabase.rpc('seed_default_habits', {
    p_user_id: user.id,
    p_month: month,
    p_year: year,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Habits seeded' })
}
