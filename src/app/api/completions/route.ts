import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { habit_id, date } = await request.json()

  // Check if already completed
  const { data: existing } = await supabase
    .from('completions')
    .select('id')
    .eq('habit_id', habit_id)
    .eq('date', date)
    .single()

  if (existing) {
    // Un-tick
    await supabase.from('completions').delete().eq('id', existing.id)
    return NextResponse.json({ action: 'removed' })
  } else {
    // Tick
    await supabase.from('completions').insert({ habit_id, user_id: user.id, date })
    return NextResponse.json({ action: 'added' })
  }
}
