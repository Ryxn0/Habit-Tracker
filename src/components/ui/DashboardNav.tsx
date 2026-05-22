'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardNav() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    setOpen(false)
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="relative" ref={ref}>
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
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-4 py-3 text-sm text-subtle hover:text-white hover:bg-surface transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
