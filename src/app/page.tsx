import { BeamsBackground } from "@/components/ui/beams-background";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";

export default function HomePage() {
  return (
    <main>
      {/* ── Hero: beams canvas + geometric shapes overlay ── */}
      <BeamsBackground intensity="strong" className="bg-neutral-950">
        <HeroGeometric
          badge="Habit Tracker"
          title1="Small actions."
          title2="Big results."
        />
      </BeamsBackground>

      {/* ── Features ── */}
      <section className="border-t border-white/[0.06] px-8 py-20 bg-neutral-950">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "◎",
              title: "Daily & Weekly Habits",
              desc: "Separate trackers for habits you do every day vs. weekly. Goals, streaks, and completion rates all built in.",
              accent: "#818cf8",
            },
            {
              icon: "◉",
              title: "Monthly Overview",
              desc: "See the full month at a glance. Every day in a grid, every habit ticked off. Progress rings update in real time.",
              accent: "#E94560",
            },
            {
              icon: "◈",
              title: "Yours Alone",
              desc: "Every user gets their own private tracker. Your data is never shared, never sold. Just you and your habits.",
              accent: "#fb7185",
            },
          ].map(({ icon, title, desc, accent }) => (
            <div
              key={title}
              className="rounded-xl p-6 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 hover:-translate-y-1"
            >
              <div className="text-2xl mb-4 font-mono" style={{ color: accent }}>
                {icon}
              </div>
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
  );
}
