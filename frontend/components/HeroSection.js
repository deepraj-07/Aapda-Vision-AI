export default function HeroSection() {
  return (
    <section id="overview" className="relative overflow-hidden px-4 pt-14 md:px-8 md:pt-20">
      <div className="pointer-events-none absolute left-1/2 top-8 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-mintline/20 blur-[140px]" />

      <div className="relative mx-auto max-w-5xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyanline/35 bg-cyanline/10 px-5 py-2 text-sm font-medium text-cyanline">
          AI-Powered Disaster Relief Intelligence
        </span>
        <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-white md:text-7xl">
          Transparent <span className="bg-gradient-to-r from-mintline to-cyanline bg-clip-text text-transparent">Damage Analytics</span>
          <br />
          for India
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg text-white/70 md:text-2xl">
          AapdaVision AI turns satellite and drone imagery into actionable disaster intelligence with building detection, damage
          segmentation, and on-map risk insights.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a href="#analyze" className="rounded-2xl bg-gradient-to-r from-[#2adcae] to-[#18d2e6] px-8 py-3 text-lg font-semibold text-[#032132] shadow-glow">
            Analyze Now
          </a>
          <a href="#risk" className="rounded-2xl border border-white/20 bg-white/5 px-8 py-3 text-lg font-semibold text-white/85 backdrop-blur">
            View Risk AI
          </a>
        </div>
      </div>
    </section>
  );
}
