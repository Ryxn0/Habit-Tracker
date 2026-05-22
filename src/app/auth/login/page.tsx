'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { AuroraBackground } from '@/components/ui/aurora-background'

export default function LoginPage() {
  const supabase = createClient()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
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
            <p className="text-zinc-400 text-sm mt-2">Keep the streak alive.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
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
                placeholder="••••••••"
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
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-6">
            No account?{' '}
            <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300 transition-colors">
              Create one for free
            </Link>
          </p>

          {/* Quote */}
          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-zinc-500 text-xs italic leading-relaxed">
              &ldquo;Success is the product of daily habits — not once-in-a-lifetime transformations.&rdquo;
            </p>
            <p className="text-zinc-600 text-xs mt-1">— James Clear</p>
          </div>
        </div>
      </motion.div>
    </AuroraBackground>
  )
}
