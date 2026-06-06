import { useEffect, useState } from "react";

import { fetchReports } from "./api";

export default function ReportPage() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReports()
      .then((data) => setReports(Array.isArray(data) ? data : [data]))
      .catch((err) => setError(err.message || "Could not load reports"));
  }, []);

  return (
    <main className="min-h-screen bg-aurora px-4 py-14 text-white md:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-cyanline/20 bg-panel p-8 shadow-glow">
        <h1 className="font-display text-5xl">Analysis Reports</h1>
        {error && <p className="mt-3 text-orange-300">{error}</p>}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-white/70">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Damaged</th>
                <th className="px-4 py-3">Damage %</th>
                <th className="px-4 py-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="px-4 py-3">{r.image_name}</td>
                  <td className="px-4 py-3">{r.total_buildings}</td>
                  <td className="px-4 py-3">{r.damaged_buildings}</td>
                  <td className="px-4 py-3">{r.damage_percentage}</td>
                  <td className="px-4 py-3 uppercase">{r.risk_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
