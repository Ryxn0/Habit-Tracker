import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-border">
        <span className="font-display text-2xl text-white tracking-tight">
          Quiet Progress
        </span>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="btn-ghost text-sm py-2 px-4">
            Sign in
          </Link>
          <Link href="/auth/signup" className="btn-primary text-sm py-2 px-4">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
          <span className="text-accent text-sm font-medium">Track your habits. Build your life.</span>
        </div>

        <h1 className="font-display text-6xl md:text-8xl text-white leading-none mb-6 max-w-4xl">
          Small actions.<br />
          <span className="text-accent">Big results.</span>
        </h1>

        <p className="text-subtle text-lg md:text-xl max-w-xl mb-12 leading-relaxed">
          A clean, focused habit tracker built for people who want to make
          consistent progress — without the noise.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/auth/signup" className="btn-primary text-base px-8 py-4">
            Start tracking for free →
          </Link>
          <Link href="/auth/login" className="btn-ghost text-base px-8 py-4">
            I already have an account
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border px-8 py-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: '✅',
              title: 'Daily & Weekly Habits',
              desc: 'Separate trackers for habits you do every day vs. ones you do weekly. Goals, streaks, and completion rates all built in.',
            },
            {
              icon: '📊',
              title: 'Monthly Overview',
              desc: 'See the full month at a glance. Every day in a grid, every habit ticked off. Progress bars update in real time.',
            },
            {
              icon: '🔒',
              title: 'Yours Alone',
              desc: 'Every user gets their own private tracker. Your data is never shared, never sold. Just you and your habits.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="card animate-slide-up">
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="font-display text-xl text-white mb-2">{title}</h3>
              <p className="text-muted text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-6 text-center text-muted text-sm">
        Quiet Progress · Make every day count.
      </footer>
    </main>
  )
}
