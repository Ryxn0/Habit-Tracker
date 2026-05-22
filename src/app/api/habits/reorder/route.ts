import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await request.json() as { ids: string[] }

  await Promise.all(
    ids.map((id, i) =>
      supabase.from('habits').update({ sort_order: i }).eq('id', id).eq('user_id', user.id)
    )
  )

  return NextResponse.json({ ok: true })
}
