'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { currentMonth, currentYear } from '@/lib/utils'

export default function SignupPage() {
  const supabase = createClient()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

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

    if (data.user) {
      await fetch('/api/habits/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: currentMonth(), year: currentYear() }),
      })
    }

    window.location.href = '/dashboard'
  }

  return (
    <main className="min-h-screen flex">
      <BrandPanel />

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-10">
            <Link href="/" className="font-display text-3xl text-white hover:text-accent transition-colors">
              Asiryx
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-3xl text-white mb-1.5">Create your account</h2>
            <p className="text-muted text-sm">Start your journey. It only takes a minute.</p>
          </div>

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

          <p className="text-center text-muted text-sm mt-8">
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

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between w-96 flex-shrink-0 px-12 py-14 border-r border-border relative overflow-hidden">
      {/* Subtle ambient glows */}
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: '#E94560', opacity: 0.07, filter: 'blur(90px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, left: -60, width: 260, height: 260, borderRadius: '50%', background: '#22d3ee', opacity: 0.05, filter: 'blur(80px)', pointerEvents: 'none' }} />

      <Link href="/" className="font-display text-2xl text-white hover:text-accent transition-colors inline-block">
        Asiryx
      </Link>

      <div>
        <blockquote className="font-display text-xl text-subtle leading-relaxed italic mb-4">
          &ldquo;We are what we repeatedly do. Excellence, then, is not an act, but a habit.&rdquo;
        </blockquote>
        <p className="text-muted text-sm">— Aristotle</p>
      </div>

      <ul className="space-y-3">
        {[
          'Daily & weekly habit tracking',
          'Monthly progress at a glance',
          'Streaks & completion rates',
        ].map(f => (
          <li key={f} className="flex items-center gap-3 text-muted text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}
