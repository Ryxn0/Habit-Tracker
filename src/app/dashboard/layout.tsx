import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-display text-xl text-white hover:text-accent transition-colors">
            Quiet Progress
          </Link>
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
