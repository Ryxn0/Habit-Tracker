import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, type, goal, month, year } = await request.json()
  if (!name || !type || !goal || !month || !year) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Determine next sort_order for this section
  const { data: last } = await supabase
    .from('habits')
    .select('sort_order')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)
    .eq('type', type)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sort_order = (last?.[0]?.sort_order ?? -1) + 1

  const { data: habit, error } = await supabase
    .from('habits')
    .insert({ name, type, goal, month, year, user_id: user.id, sort_order })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(habit)
}
