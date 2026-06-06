export default function Navbar({ onOpenPayment }) {
  return (
    <header className="sticky top-0 z-40 border-b border-cyanline/15 bg-[#040f1fcc] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-mintline to-cyanline text-lg font-bold text-[#022126]">
            AV
          </div>
          <div>
            <p className="font-display text-2xl font-semibold leading-none text-white">AapdaVision</p>
            <p className="text-xs uppercase tracking-[0.28em] text-cyanline/80">Disaster Intelligence AI</p>
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-[0.95rem] text-white/85 md:flex">
          <a href="#overview" className="transition hover:text-cyanline">Overview</a>
          <a href="#analyze" className="transition hover:text-cyanline">Analyze</a>
          <a href="#campaigns" className="transition hover:text-cyanline">Campaigns</a>
          <a href="#team" className="transition hover:text-cyanline">Team</a>
          <a href="#risk" className="transition hover:text-cyanline">Risk AI</a>
        </nav>

        <button
          onClick={() => onOpenPayment?.("Top Navigation")}
          className="rounded-2xl border border-cyanline/50 bg-gradient-to-r from-[#2fd6af] to-[#1bcde0] px-5 py-2 font-semibold text-[#032038] shadow-glow transition hover:scale-[1.02]"
        >
          Contribute Relief
        </button>
      </div>
    </header>
  );
}
