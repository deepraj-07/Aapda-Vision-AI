import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

export default function MapPanel() {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = token;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [85.14, 23.78],
      zoom: 4,
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [token]);

  return (
    <section className="rounded-3xl border border-cyanline/20 bg-panel p-5 shadow-glow">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl text-white">Geo Risk Map</h3>
        <span className="rounded-full border border-cyanline/30 bg-cyanline/10 px-3 py-1 text-xs uppercase tracking-wide text-cyanline">
          live layer
        </span>
      </div>

      {!token ? (
        <div className="mt-4 rounded-2xl border border-dashed border-cyanline/30 bg-[#051b31] p-6 text-sm text-white/75">
          Set NEXT_PUBLIC_MAPBOX_TOKEN in frontend/.env.local to enable the interactive map.
        </div>
      ) : (
        <div ref={containerRef} className="mt-4 h-[360px] overflow-hidden rounded-2xl border border-white/10" />
      )}
    </section>
  );
}
