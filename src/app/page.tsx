'use client'

import { motion } from "motion/react"
import { Circle } from "lucide-react"
import { BeamsBackground } from "@/components/ui/beams-background"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import Image from "next/image"
import Link from "next/link"

const fadeUp = {
  hidden:  { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 1, delay: 0.4 + i * 0.2, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] },
  }),
}

export default function HomePage() {
  return (
    <main className="dark bg-[#060910]">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-transparent">
        <span className="font-display text-xl text-white/90" style={{ fontFamily: 'var(--font-display)' }}>
          asiryx<span style={{ color: '#E94560' }}>.</span>
        </span>
        <div className="flex items-center gap-6">
          <Link href="/about" className="text-sm text-white/50 hover:text-white/80 transition-colors">About</Link>
          <Link href="/auth/login" className="text-sm text-white/50 hover:text-white/80 transition-colors">Sign in</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <BeamsBackground intensity="strong">
        <div className="flex min-h-screen flex-col items-center justify-center text-center px-6">

          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8">
            <Circle className="h-2 w-2 fill-rose-500/80" />
            <span className="text-sm text-white/60 tracking-wide">Habit Tracker</span>
          </motion.div>

          <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="visible"
            className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
              Small actions.
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">
              Big results.
            </span>
          </motion.h1>

          <motion.p custom={2} variants={fadeUp} initial="hidden" animate="visible"
            className="text-base sm:text-lg md:text-xl text-white/40 max-w-xl mb-10 leading-relaxed font-light tracking-wide">
            A clean, focused habit tracker built for people who want to make
            consistent progress — without the noise.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"
            className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-sm tracking-wide text-white transition-all duration-200 hover:-translate-y-1.5 hover:brightness-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #E94560, #9b2335)', boxShadow: '0 0 24px rgba(233,69,96,0.35)' }}
            >
              Start tracking for free →
            </a>
            <a
              href="/auth/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm text-white/50 border border-white/[0.08] hover:text-white/80 hover:border-white/20 hover:-translate-y-1.5 transition-all duration-200"
            >
              Sign in
            </a>
          </motion.div>
        </div>
      </BeamsBackground>

      {/* ── Scroll animation preview ── */}
      <section className="bg-[#060910]">
        <ContainerScroll
          titleComponent={
            <div className="space-y-4">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-white/30">
                See it in action
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                  Everything you need.
                </span>
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/80 to-rose-300">
                  Nothing you don&apos;t.
                </span>
              </h2>
              <p className="text-white/40 text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-light">
                Habits, calories, workouts — tracked in one place. Clean, fast, and private.
              </p>
            </div>
          }
        >
          <Image
            src="/dashboard-preview.png"
            alt="asiryx dashboard"
            width={1400}
            height={800}
            className="mx-auto rounded-xl object-cover h-full object-top"
            draggable={false}
          />
        </ContainerScroll>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-white/[0.06] px-8 py-20 bg-neutral-950">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: "◎", title: "Daily & Weekly Habits", accent: "#818cf8",
              desc: "Separate trackers for habits you do every day vs. weekly. Goals, streaks, and completion rates all built in." },
            { icon: "◉", title: "Monthly Overview", accent: "#E94560",
              desc: "See the full month at a glance. Every day in a grid, every habit ticked off. Progress rings update in real time." },
            { icon: "◈", title: "Yours Alone", accent: "#fb7185",
              desc: "Every user gets their own private tracker. Your data is never shared, never sold. Just you and your habits." },
          ].map(({ icon, title, desc, accent }) => (
            <div key={title}
              className="rounded-xl p-6 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 hover:-translate-y-1">
              <div className="text-2xl mb-4 font-mono" style={{ color: accent }}>{icon}</div>
              <h3 className="font-bold text-lg text-white mb-2 tracking-tight">{title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] px-8 py-6 text-center text-white/25 text-sm bg-neutral-950">
        Asiryx · Make every day count.
      </footer>
    </main>
  )
}
