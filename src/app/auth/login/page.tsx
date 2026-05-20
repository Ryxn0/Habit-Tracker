'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-10">
          <Link href="/" className="font-display text-3xl text-white hover:text-accent transition-colors">
            Quiet Progress
          </Link>
          <p className="text-muted mt-2 text-sm">Welcome back. Keep the streak alive.</p>
        </div>

        <div className="card">
          <form onSubmit={handleLogin} className="space-y-5">
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
                placeholder="••••••••"
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
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <p className="text-center text-muted text-sm mt-6">
            No account?{' '}
            <Link href="/auth/signup" className="text-accent hover:underline">
              Create one for free
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
