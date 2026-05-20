import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import LogoutButton from '@/components/ui/LogoutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-display text-xl text-white hover:text-accent transition-colors">
            Quiet Progress
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-subtle text-sm truncate max-w-[160px]">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        {children}
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-muted text-xs">
        Quiet Progress · Make every day count.
      </footer>
    </div>
  )
}
