'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { currentMonth, currentYear } from '@/lib/utils'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Seed default habits for the current month
    if (data.user) {
      await fetch('/api/habits/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth(),
          year: currentYear(),
        }),
      })
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-10">
          <Link href="/" className="font-display text-3xl text-white hover:text-accent transition-colors">
            Quiet Progress
          </Link>
          <p className="text-muted mt-2 text-sm">Start your journey. It only takes a minute.</p>
        </div>

        <div className="card">
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-subtle text-sm mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-subtle text-sm mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
                className="input"
              />
            </div>

            {error && (
              <p className="text-accent text-sm bg-accent/10 border border-accent/20 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full text-center">
              {loading ? 'Creating account...' : 'Create account →'}
            </button>
          </form>

          <p className="text-center text-muted text-sm mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
