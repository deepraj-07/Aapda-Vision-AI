import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:5000";

function formatDate(value) {
  if (!value) {
    return "N/A";
  }
  const date = new Date(value);
  return date.toLocaleString();
}

function severityClass(risk) {
  if (risk === "high") {
    return "border-red-300/40 bg-red-500/15 text-red-100";
  }
  if (risk === "medium") {
    return "border-amber-300/40 bg-amber-500/15 text-amber-100";
  }
  return "border-emerald-300/40 bg-emerald-500/15 text-emerald-100";
}

export default function RiskGrid() {
  const [logs, setLogs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const [logsRes, campaignsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/logs?limit=8`),
          fetch(`${API_BASE_URL}/api/campaigns`),
        ]);

        const logsData = await logsRes.json().catch(() => ({}));
        const campaignsData = await campaignsRes.json().catch(() => ({}));

        if (!alive) {
          return;
        }

        setLogs(Array.isArray(logsData?.logs) ? logsData.logs : []);
        setCampaigns(Array.isArray(campaignsData?.campaigns) ? campaignsData.campaigns : []);
      } catch (error) {
        if (!alive) {
          return;
        }
        setLogs([]);
        setCampaigns([]);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const summary = useMemo(() => {
    const totalEvents = logs.length;
    const highRisk = logs.filter((item) => item.risk_level === "high").length;
    const totalBuildings = logs.reduce((sum, item) => sum + Number(item.total_buildings || 0), 0);
    const damagedBuildings = logs.reduce((sum, item) => sum + Number(item.damaged_buildings || 0), 0);
    const avgDamage = totalEvents
      ? (logs.reduce((sum, item) => sum + Number(item.damage_percentage || 0), 0) / totalEvents).toFixed(1)
      : "0.0";

    return { totalEvents, highRisk, totalBuildings, damagedBuildings, avgDamage };
  }, [logs]);

  return (
    <section id="risk" className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-cyanline/75">Operational View</p>
        <h3 className="font-display text-4xl text-white">Live Disaster Intelligence</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-cyanline/20 bg-panel p-5 shadow-glow">
          <p className="text-xs uppercase tracking-[0.24em] text-cyanline/80">Total Events</p>
          <p className="mt-2 font-display text-5xl text-white">{summary.totalEvents}</p>
          <p className="mt-2 text-sm text-white/70">All saved test and production inferences.</p>
        </article>

        <article className="rounded-3xl border border-cyanline/20 bg-panel p-5 shadow-glow">
          <p className="text-xs uppercase tracking-[0.24em] text-cyanline/80">High Risk Alerts</p>
          <p className="mt-2 font-display text-5xl text-red-200">{summary.highRisk}</p>
          <p className="mt-2 text-sm text-white/70">Events requiring immediate NGO response.</p>
        </article>

        <article className="rounded-3xl border border-cyanline/20 bg-panel p-5 shadow-glow">
          <p className="text-xs uppercase tracking-[0.24em] text-cyanline/80">Average Damage</p>
          <p className="mt-2 font-display text-5xl text-amber-100">{summary.avgDamage}%</p>
          <p className="mt-2 text-sm text-white/70">Rolling average across recent analysis logs.</p>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-cyanline/20 bg-panel p-5 shadow-glow">
          <p className="text-xs uppercase tracking-[0.24em] text-cyanline/80">Detected Buildings</p>
          <p className="mt-2 font-display text-5xl text-white">{summary.totalBuildings}</p>
          <p className="mt-2 text-sm text-white/70">Aggregate buildings found by the detection model.</p>
        </article>

        <article className="rounded-3xl border border-cyanline/20 bg-panel p-5 shadow-glow">
          <p className="text-xs uppercase tracking-[0.24em] text-cyanline/80">Damaged Buildings</p>
          <p className="mt-2 font-display text-5xl text-orange-200">{summary.damagedBuildings}</p>
          <p className="mt-2 text-sm text-white/70">Count of buildings flagged as damaged in saved logs.</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-cyanline/20 bg-panel p-5 shadow-glow">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-2xl text-white">Disaster Timeline</h4>
            {loading ? <span className="text-xs text-cyanline/80">Refreshing...</span> : null}
          </div>

          <div className="mt-4 space-y-3">
            {logs.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                No logs yet. Run one image analysis to populate timeline.
              </p>
            ) : (
              logs.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-[#071b32] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{item.location_name || "Unknown location"}</p>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${severityClass(item.risk_level)}`}>
                      {item.risk_level || "low"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/70">
                    Buildings: <span className="font-semibold text-white">{Number(item.total_buildings || 0)}</span> | Damaged: {" "}
                    <span className="font-semibold text-[#ff9f4d]">{Number(item.damaged_buildings || 0)}</span> | Damage: <span className="font-semibold text-white">{Number(item.damage_percentage || 0).toFixed(2)}%</span> | Confidence: {" "}
                    <span className="font-semibold text-white">{((item.confidence_score || 0) * 100).toFixed(1)}%</span>
                  </p>
                  <p className="mt-1 text-xs text-white/55">{formatDate(item.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-cyanline/20 bg-panel p-5 shadow-glow">
          <h4 className="font-display text-2xl text-white">Active Campaign Signals</h4>
          <div className="mt-4 space-y-3">
            {campaigns.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                Campaigns are generated automatically as disaster logs grow.
              </p>
            ) : (
              campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl border border-white/10 bg-[#071b32] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-white">{campaign.title}</p>
                    <span className="rounded-full border border-cyanline/40 bg-cyanline/10 px-2.5 py-1 text-xs font-semibold uppercase text-cyanline">
                      {campaign.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/70">{campaign.description}</p>
                  <p className="mt-2 text-xs text-white/55">Beneficiaries: {campaign.beneficiaries || 0}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
