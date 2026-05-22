"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { BeamsBackground } from "@/components/ui/beams-background";
import { Circle, Target, Flame, BarChart3, Lock, Zap } from "lucide-react";

const fadeUp = {
  hidden:  { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.9, delay: 0.2 + i * 0.15, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] },
  }),
};

const VALUES = [
  {
    icon: <Target className="w-5 h-5" />,
    title: "Intentional design",
    accent: "#818cf8",
    desc: "No gamification gimmicks or notification spam. Every element earns its place by helping you stay on track.",
  },
  {
    icon: <Flame className="w-5 h-5" />,
    title: "Streak momentum",
    accent: "#E94560",
    desc: "Streaks are powerful because they're honest. Miss a day — the counter resets. That accountability is the point.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Visible progress",
    accent: "#fb7185",
    desc: "Completion rings, monthly heat maps, and weekly rates make your consistency tangible instead of abstract.",
  },
  {
    icon: <Lock className="w-5 h-5" />,
    title: "Yours alone",
    accent: "#34d399",
    desc: "Your data lives in your account, never shared or sold. We built this to use ourselves — privacy matters to us.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Zero friction",
    accent: "#fbbf24",
    desc: "Open the app, tick your habit, close it. The whole interaction takes under five seconds — by design.",
  },
  {
    icon: <Circle className="w-5 h-5" />,
    title: "Small actions",
    accent: "#a78bfa",
    desc: "We believe meaningful change comes from tiny, repeated choices — not giant leaps. That belief shapes everything here.",
  },
];

export default function AboutPage() {
  return (
    <div className="dark bg-[#060910] min-h-screen text-white">

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-[#060910]/80 backdrop-blur-md border-b border-white/[0.05]">
        <Link href="/" className="font-display text-xl text-white/90 hover:text-white transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
          asiryx<span style={{ color: '#E94560' }}>.</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm text-white/50 hover:text-white/80 transition-colors">Home</Link>
          <Link href="/dashboard"
            className="text-sm px-5 py-2 rounded-full font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #E94560, #9b2335)', boxShadow: '0 0 16px rgba(233,69,96,0.3)' }}>
            Open app →
          </Link>
        </div>
      </nav>

      {/* ── Hero / ContainerScroll ──────────────────────────────────── */}
      <BeamsBackground intensity="subtle">
        <div className="pt-20">
          <ContainerScroll
            titleComponent={
              <div className="space-y-6 pb-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]"
                >
                  <Circle className="h-2 w-2 fill-rose-500/80" />
                  <span className="text-sm text-white/50 tracking-wide">About asiryx</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.25 }}
                  className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight"
                >
                  <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                    Built for people who
                  </span>
                  <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">
                    keep their promises.
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.4 }}
                  className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto leading-relaxed font-light"
                >
                  asiryx started as a personal frustration. Every habit app was either
                  too cluttered or too simplistic. We wanted something that just worked —
                  beautifully, privately, and without the noise.
                </motion.p>
              </div>
            }
          >
            <Image
              src="dashboard-preview.png"
              alt="asiryx dashboard preview"
              width={1400}
              height={800}
              className="mx-auto rounded-xl object-cover h-full object-top"
              draggable={false}
            />
          </ContainerScroll>
        </div>
      </BeamsBackground>

      {/* ── Mission ─────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] bg-neutral-950 px-8 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-white/30 mb-6">Our mission</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-8">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                Consistency compounds.
              </span>
              <br />
              <span className="text-white/40 font-light">We just make it easier to stay consistent.</span>
            </h2>
            <p className="text-white/40 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              We believe the difference between who you are and who you want to be is
              almost entirely made up of your daily habits. asiryx exists to close that
              gap — one tick, one day, one month at a time.
            </p>
          </motion.div>

          <motion.div
            custom={1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="mt-16 grid grid-cols-3 gap-12 border-t border-white/[0.06] pt-16"
          >
            {[
              { stat: "30+",  label: "days tracked per user avg." },
              { stat: "100%", label: "private — no data sharing"   },
              { stat: "5s",   label: "average check-in time"       },
            ].map(({ stat, label }) => (
              <div key={label} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-rose-300 mb-2">
                  {stat}
                </div>
                <div className="text-sm text-white/30 leading-snug">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Values grid ─────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] bg-[#060910] px-8 py-24">
        <div className="max-w-5xl mx-auto">
          <motion.div
            custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="mb-14 text-center"
          >
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-white/30 mb-4">What we believe</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                Six principles behind every decision.
              </span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {VALUES.map(({ icon, title, desc, accent }, i) => (
              <motion.div
                key={title}
                custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="rounded-xl p-6 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:-translate-y-1 transition-all duration-200"
              >
                <div className="mb-4" style={{ color: accent }}>{icon}</div>
                <h3 className="font-semibold text-base text-white mb-2 tracking-tight">{title}</h3>
                <p className="text-white/35 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Story ───────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] bg-neutral-950 px-8 py-24">
        <div className="max-w-3xl mx-auto">
          <motion.div
            custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-white/30 mb-6">The story</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 tracking-tight">
              Started out of frustration. Kept alive by momentum.
            </h2>
            <div className="space-y-5 text-white/40 text-base leading-relaxed">
              <p>
                Habit apps tend to fall into one of two traps: they try to do everything
                and become overwhelming, or they do so little they're barely worth opening.
                Neither felt right.
              </p>
              <p>
                asiryx was built to thread that needle — enough structure to keep you
                accountable (daily grids, streaks, monthly rates), but never so much
                complexity that the app itself becomes a task you have to manage.
              </p>
              <p>
                The name comes from a simple idea: quiet progress. No leaderboards,
                no social feeds, no comparisons. Just you, your habits, and a clean record
                of whether you showed up today.
              </p>
              <p className="text-white/60 font-medium italic border-l-2 border-rose-500/40 pl-4">
                &ldquo;Small actions, repeated daily, produce results that look like magic over months.&rdquo;
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] bg-[#060910] px-8 py-24 text-center">
        <motion.div
          custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="max-w-xl mx-auto space-y-6"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-rose-300">
              Ready to start?
            </span>
          </h2>
          <p className="text-white/40 leading-relaxed">
            No sign-up required. Open the dashboard and your private tracker
            is created automatically.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-sm tracking-wide text-white transition-all duration-200 hover:-translate-y-1.5 hover:brightness-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #E94560, #9b2335)', boxShadow: '0 0 24px rgba(233,69,96,0.35)' }}
            >
              Start tracking for free →
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm text-white/50 border border-white/[0.08] hover:text-white/80 hover:border-white/20 hover:-translate-y-1.5 transition-all duration-200"
            >
              Back to home
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-8 py-6 text-center text-white/25 text-sm bg-neutral-950">
        asiryx · small actions, big results.
      </footer>
    </div>
  );
}
