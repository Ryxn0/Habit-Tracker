'use client'

import { useRouter } from 'next/navigation'
import NavMenu from '@/components/ui/NavMenu'
import { WebGLShader } from '@/components/ui/web-gl-shader'
import { LiquidButton } from '@/components/ui/liquid-glass-button'

export default function HomePage() {
  const router = useRouter()

  return (
    <main className="min-h-screen flex flex-col">

      {/* ── WebGL shader background (fixed, full-screen) ── */}
      <WebGLShader />

      {/* ── Nav ── */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-5 border-b border-white/10 backdrop-blur-md"
        style={{ background: 'rgba(9,16,30,0.5)' }}>
        <span className="font-display text-2xl text-white tracking-tight">Asiryx</span>
        <NavMenu />
      </nav>

      {/* ── Hero (over shader) ── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 min-h-[calc(100vh-68px)]">
        <div className="border border-white/10 p-[1px] w-full mx-auto max-w-3xl rounded-xl">
          <div className="border border-white/10 rounded-xl py-16 px-8 overflow-hidden text-center"
            style={{ background: 'rgba(9,16,30,0.45)', backdropFilter: 'blur(12px)' }}>

            {/* Live badge */}
            <div className="inline-flex items-center gap-2 mb-8">
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <p className="text-xs text-green-400 font-mono tracking-wide">Available for new habits</p>
            </div>

            <h1 className="font-display text-6xl md:text-[clamp(2.5rem,9vw,6rem)] text-white leading-none tracking-tight mb-6">
              Small actions.<br />
              <span style={{ color: '#E94560' }}>Big results.</span>
            </h1>

            <p className="text-white/55 text-base md:text-lg max-w-lg mx-auto mb-10 leading-relaxed">
              A clean, focused habit tracker built for people who want to make
              consistent progress — without the noise.
            </p>

            <div className="flex justify-center">
              <LiquidButton
                className="text-white border border-white/20 rounded-full font-semibold tracking-wide"
                size="xl"
                onClick={() => router.push('/dashboard')}
              >
                Start tracking for free →
              </LiquidButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features (solid bg covers shader below) ── */}
      <section className="relative z-10 border-t border-white/10 px-8 py-20"
        style={{ background: '#09101E' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '◎',
              title: 'Daily & Weekly Habits',
              desc: 'Separate trackers for habits you do every day vs. weekly. Goals, streaks, and completion rates all built in.',
              accent: '#22d3ee',
            },
            {
              icon: '◉',
              title: 'Monthly Overview',
              desc: 'See the full month at a glance. Every day in a grid, every habit ticked off. Progress rings update in real time.',
              accent: '#E94560',
            },
            {
              icon: '◈',
              title: 'Yours Alone',
              desc: 'Every user gets their own private tracker. Your data is never shared, never sold. Just you and your habits.',
              accent: '#f472b6',
            },
          ].map(({ icon, title, desc, accent }) => (
            <div
              key={title}
              className="rounded-xl p-6 animate-slide-up group transition-all duration-200 hover:-translate-y-1"
              style={{
                background: '#141E33',
                border: '1px solid #1E2D4E',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${accent}12, 0 2px 8px rgba(0,0,0,0.4)`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              <div className="text-2xl mb-4 font-mono" style={{ color: accent }}>{icon}</div>
              <h3 className="font-display text-xl text-white mb-2">{title}</h3>
              <p className="text-muted text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border px-8 py-6 text-center text-muted text-sm"
        style={{ background: '#09101E' }}>
        Asiryx · Make every day count.
      </footer>
    </main>
  )
}
