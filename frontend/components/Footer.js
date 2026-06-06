import TeamSection from "./TeamSection";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-cyanline/20 bg-[radial-gradient(1000px_320px_at_50%_-60%,rgba(44,209,190,0.22),transparent_70%),#031225] pb-10 pt-10 backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <div id="team" className="rounded-3xl border border-cyanline/20 bg-panel p-6 shadow-glow">
          <TeamSection />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-cyanline/15 bg-white/5 p-4 transition hover:border-cyanline/35 hover:bg-cyanline/5">
            <p className="text-xs uppercase tracking-[0.2em] text-cyanline/80">Platform</p>
            <h4 className="mt-2 font-display text-2xl text-white">AapdaVision AI</h4>
            <p className="mt-2 text-sm text-white/70">Real-time damage intelligence for rapid disaster response and transparent relief planning.</p>
          </article>

          <article className="rounded-2xl border border-cyanline/15 bg-white/5 p-4 transition hover:border-cyanline/35 hover:bg-cyanline/5">
            <p className="text-xs uppercase tracking-[0.2em] text-cyanline/80">Quick Links</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a href="#overview" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/80 transition hover:border-cyanline/45 hover:text-cyanline">Overview</a>
              <a href="#analyze" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/80 transition hover:border-cyanline/45 hover:text-cyanline">Analyze</a>
              <a href="#campaigns" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/80 transition hover:border-cyanline/45 hover:text-cyanline">Campaigns</a>
              <a href="#risk" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/80 transition hover:border-cyanline/45 hover:text-cyanline">Risk AI</a>
            </div>
          </article>

          <article className="rounded-2xl border border-cyanline/15 bg-white/5 p-4 transition hover:border-cyanline/35 hover:bg-cyanline/5">
            <p className="text-xs uppercase tracking-[0.2em] text-cyanline/80">Emergency Contact</p>
            <p className="mt-2 text-sm text-white/75">In critical situations, contact nearest district disaster authority and verified relief command center immediately.</p>
            <a href="https://ndrf.gov.in" target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-xl border border-cyanline/35 bg-cyanline/10 px-3 py-2 text-xs font-semibold text-cyanline transition hover:bg-cyanline/20">Open NDRF</a>
          </article>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-5 text-sm text-white/65 md:flex-row">
          <p>AapdaVision AI - Disaster Intelligence Platform</p>
          <p>Built for rapid analysis, transparent aid, and emergency coordination.</p>
        </div>
      </div>
    </footer>
  );
}
