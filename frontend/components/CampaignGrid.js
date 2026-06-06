const campaigns = [
  {
    title: "Assam Flood Relief 2026",
    location: "AS - India",
    stateName: "Assam",
    raised: "3,750,000",
    goal: "8,300,000",
    funded: 45,
    state: "active",
  },
  {
    title: "Odisha Cyclone Recovery",
    location: "OR - India",
    stateName: "Odisha",
    raised: "1,250,000",
    goal: "5,000,000",
    funded: 25,
    state: "active",
  },
  {
    title: "Bihar Medical Aid",
    location: "BR - India",
    stateName: "Bihar",
    raised: "8,900,000",
    goal: "9,000,000",
    funded: 99,
    state: "completed",
  },
];

const reliefLinksByState = {
  "Uttar Pradesh": {
    ndrf: "https://ndrf.gov.in",
    sdrf: "https://up.gov.in",
  },
  Assam: {
    ndrf: "https://ndrf.gov.in",
    sdrf: "https://sdmassam.nic.in",
  },
  Odisha: {
    ndrf: "https://ndrf.gov.in",
    sdrf: "https://www.osdma.org",
  },
  Bihar: {
    ndrf: "https://ndrf.gov.in",
    sdrf: "https://bsdma.org",
  },
};

function getReliefLink(stateName) {
  const selected = reliefLinksByState[stateName];
  if (!selected) {
    return "https://ndrf.gov.in";
  }
  return selected.sdrf || selected.ndrf;
}

export default function CampaignGrid({ onOpenPayment }) {
  return (
    <section id="campaigns" className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-mintline/80">Live and Urgently Needed</p>
          <h3 className="font-display text-4xl text-white">Urgent Campaigns</h3>
        </div>
        <button className="rounded-2xl border border-cyanline/30 px-5 py-2 text-sm font-semibold text-cyanline">View All</button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {campaigns.map((campaign) => (
          <article key={campaign.title} className="rounded-3xl border border-cyanline/20 bg-panel p-5 shadow-glow">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-cyanline/70">{campaign.location}</p>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                    campaign.state === "completed"
                      ? "bg-amber-300/15 text-amber-300"
                      : "bg-mintline/15 text-mintline"
                  }`}
                >
                  {campaign.state}
                </span>
                <span className="rounded-full border border-emerald-300/35 bg-emerald-300/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-200">
                  Gov Verified
                </span>
              </div>
            </div>

            <h4 className="mt-4 font-display text-3xl text-white">{campaign.title}</h4>
            <p className="mt-3 text-sm text-white/60">Targeted support with transparent, trackable disaster-response distribution.</p>

            <div className="mt-4 flex items-center justify-between text-sm text-white/75">
              <span>{campaign.raised} raised</span>
              <span className="text-mintline">{campaign.goal}</span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-mintline to-cyanline" style={{ width: `${campaign.funded}%` }} />
            </div>
            <p className="mt-1 text-xs text-white/60">{campaign.funded}% funded</p>

            <button
              onClick={() => onOpenPayment?.(campaign.title)}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#2adcae] to-[#18d2e6] py-3 font-semibold text-[#05243a]"
            >
              Support Campaign
            </button>

            <a
              href={getReliefLink(campaign.stateName)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block w-full rounded-2xl border border-cyanline/35 bg-cyanline/10 py-3 text-center text-sm font-semibold text-cyanline transition hover:bg-cyanline/20"
            >
              Support Relief
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
