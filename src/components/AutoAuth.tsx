'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Silently signs the visitor in anonymously if they have no session,
 * then seeds their default habits and refreshes the server components.
 */
export default function AutoAuth() {
  const router = useRouter()

  useEffect(() => {
    async function run() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) return  // already authenticated

      const { error } = await supabase.auth.signInAnonymously()
      if (error) {
        // Anonymous auth not enabled — fall back to the login page
        router.push('/auth/login')
        return
      }

      // Seed default habits for the current month
      const now = new Date()
      await fetch('/api/habits/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: now.getMonth() + 1, year: now.getFullYear() }),
      })

      router.refresh()
    }
    run()
  }, [router])

  return null
}
