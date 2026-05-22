'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { currentMonth, currentYear } from '@/lib/utils'
import { AuroraBackground } from '@/components/ui/aurora-background'

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
    <AuroraBackground showRadialGradient>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8, ease: 'easeInOut' }}
        className="w-full max-w-md px-4"
      >
        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 backdrop-blur-xl px-8 py-10 shadow-2xl">

          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="font-display text-3xl text-white hover:text-accent transition-colors">
              Asiryx
            </Link>
            <p className="text-zinc-400 text-sm mt-2">Start your journey. It only takes a minute.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-zinc-400 text-sm mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-400/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-sm mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
                className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-400/60 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #E94560, #9b2335)', boxShadow: '0 0 20px rgba(233,69,96,0.3)' }}
            >
              {loading ? 'Creating account...' : 'Create account →'}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 transition-colors">
              Sign in
            </Link>
          </p>

          {/* Quote */}
          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-zinc-500 text-xs italic leading-relaxed">
              &ldquo;We are what we repeatedly do. Excellence, then, is not an act, but a habit.&rdquo;
            </p>
            <p className="text-zinc-600 text-xs mt-1">— Aristotle</p>
          </div>
        </div>
      </motion.div>
    </AuroraBackground>
  )
}
