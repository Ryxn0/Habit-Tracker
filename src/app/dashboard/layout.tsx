import Link from 'next/link'
import LogoutButton from '@/components/ui/LogoutButton'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 backdrop-blur border-b" style={{ background: 'rgba(9,16,30,0.9)', borderColor: '#1E2D4E' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <Link href="/dashboard" style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, letterSpacing: '0.15em', color: '#fff' }}
            className="hover:text-[#22d3ee] transition-colors"
          >
            STACKD
          </Link>
          <LogoutButton />
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        {children}
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-muted text-xs">
        Stackd · Make every day count.
      </footer>
    </div>
  )
}
