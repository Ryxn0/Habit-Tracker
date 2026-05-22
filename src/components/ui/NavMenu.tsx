'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export default function NavMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="flex items-center gap-4">
      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-4">
        <Link href="/auth/login" className="btn-ghost text-sm py-2 px-4">Sign in</Link>
        <Link href="/dashboard" className="btn-primary text-sm py-2 px-4">Get started</Link>
      </div>

      {/* Hamburger — mobile only */}
      <div className="relative md:hidden" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
          className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] border border-border rounded-lg hover:border-subtle transition-colors"
        >
          <span className={`block w-4 h-[1.5px] bg-white origin-center transition-all duration-200 ${open ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
          <span className={`block w-4 h-[1.5px] bg-white transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-4 h-[1.5px] bg-white origin-center transition-all duration-200 ${open ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
        </button>

        {open && (
          <div className="absolute top-full right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
            <Link
              href="/auth/login"
              onClick={() => setOpen(false)}
              className="flex items-center px-4 py-3 text-sm text-subtle hover:text-white hover:bg-surface transition-colors border-b border-border"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center px-4 py-3 text-sm text-white font-medium hover:bg-accent/10 transition-colors"
              style={{ color: '#E94560' }}
            >
              Get started →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
