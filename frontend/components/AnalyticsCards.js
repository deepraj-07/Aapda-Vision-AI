export default function AnalyticsCards({ analysis }) {
  const totalBuildings = Number(analysis?.total_buildings ?? 0);
  const damagedBuildings = Number(analysis?.damaged_buildings ?? 0);
  const minorDamage = Number(analysis?.minor_damage ?? 0);
  const safeBuildings = Math.max(totalBuildings - damagedBuildings - minorDamage, 0);
  const damagePercent = Number(analysis?.damage_percentage ?? 0);
  const confidencePercent = Math.round(Number(analysis?.confidence_score ?? 0) * 100);
  const affectedPercent = totalBuildings > 0 ? Math.round(((damagedBuildings + minorDamage) / totalBuildings) * 100) : 0;

  const compactDistribution = [
    { label: "Safe", value: safeBuildings, pct: totalBuildings > 0 ? Math.round((safeBuildings / totalBuildings) * 100) : 0, tone: "bg-emerald-400/70" },
    { label: "Minor", value: minorDamage, pct: totalBuildings > 0 ? Math.round((minorDamage / totalBuildings) * 100) : 0, tone: "bg-amber-400/70" },
    { label: "Damaged", value: damagedBuildings, pct: totalBuildings > 0 ? Math.round((damagedBuildings / totalBuildings) * 100) : 0, tone: "bg-rose-400/70" },
  ];

  return (
    <section className="grid gap-6 md:grid-cols-3">
      <div className="rounded-3xl border border-cyanline/20 bg-panel p-6 shadow-glow md:col-span-2">
        <h3 className="font-display text-2xl text-white">Response Meters</h3>
        <p className="mt-1 text-white/65">Compact live meters from current ML inference</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-cyanline/20 bg-[#08233f] p-4">
            <p className="text-xs uppercase tracking-wide text-white/60">Damage Meter</p>
            <p className="mt-1 text-xl font-semibold text-rose-200">{damagePercent.toFixed(1)}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" style={{ width: `${Math.min(100, Math.max(0, damagePercent))}%` }} />
            </div>
          </article>

          <article className="rounded-2xl border border-cyanline/20 bg-[#08233f] p-4">
            <p className="text-xs uppercase tracking-wide text-white/60">Affected Buildings</p>
            <p className="mt-1 text-xl font-semibold text-amber-100">{affectedPercent}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-400" style={{ width: `${Math.min(100, Math.max(0, affectedPercent))}%` }} />
            </div>
          </article>

          <article className="rounded-2xl border border-cyanline/20 bg-[#08233f] p-4">
            <p className="text-xs uppercase tracking-wide text-white/60">Model Confidence</p>
            <p className="mt-1 text-xl font-semibold text-cyanline">{confidencePercent}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${Math.min(100, Math.max(0, confidencePercent))}%` }} />
            </div>
          </article>
        </div>

        <div className="mt-5 space-y-3">
          {compactDistribution.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-xs text-white/70">
                <span>{item.label} ({item.value})</span>
                <span>{item.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-cyanline/20 bg-panel p-6 shadow-glow">
        <h3 className="font-display text-2xl text-white">Latest Snapshot</h3>
        <dl className="mt-4 space-y-4 text-sm text-white/80">
          <div className="flex items-center justify-between">
            <dt>Total Buildings</dt>
            <dd className="text-lg font-semibold text-white">{analysis?.total_buildings ?? 0}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Damaged Buildings</dt>
            <dd className="text-lg font-semibold text-[#ff9f4d]">{analysis?.damaged_buildings ?? 0}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Minor Damage</dt>
            <dd className="text-lg font-semibold text-yellow-300">{analysis?.minor_damage ?? 0}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Damage %</dt>
            <dd className="text-lg font-semibold text-cyanline">{analysis ? `${analysis.damage_percentage.toFixed(2)}%` : "0.00%"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Risk Level</dt>
            <dd className="rounded-full border border-cyanline/40 bg-cyanline/10 px-3 py-1 text-sm uppercase tracking-wide text-cyanline">
              {analysis?.risk_level ?? "moderate"}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
